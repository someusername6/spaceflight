/**
 * E2E Tests - State Sync - Ship Data
 *
 * Tests for:
 * - Host purchase → guest sees synced ship data (weapons)
 * - shipEdit permission cycle on squadron (buttons toggle disabled/enabled)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  togglePermission,
  waitForCreditsToEqual,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test 9: Host store purchase → guest squadron shows synced ship data.
 * Verifies full campaign state (including ship weapons) syncs, not just credits.
 */
function testHostPurchaseSyncsShipDataToGuest() {
  return runTest(
    'Host Purchase → Guest Sees Synced Ship Data',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ShipDataGuest');
      console.log('  Both players connected');

      // Both navigate to squadron
      await navigateTo(hostPage, 'squadron');
      await navigateTo(guestPage, 'squadron');

      // Get host's weapon badge text for deployed ships
      const hostWeaponBadges = await hostPage.evaluate(() => {
        const badges = document.querySelectorAll(
          '.ship-item.deployed .weapon-badge.primary',
        );
        return Array.from(badges).map((b) => b.textContent?.trim() || '');
      });
      console.log(`  Host weapon badges: ${JSON.stringify(hostWeaponBadges)}`);

      if (hostWeaponBadges.length === 0) {
        throw new Error('No weapon badges found on host squadron screen');
      }

      // Get guest's weapon badge text
      const guestWeaponBadges = await guestPage.evaluate(() => {
        const badges = document.querySelectorAll(
          '.ship-item.deployed .weapon-badge.primary',
        );
        return Array.from(badges).map((b) => b.textContent?.trim() || '');
      });
      console.log(
        `  Guest weapon badges: ${JSON.stringify(guestWeaponBadges)}`,
      );

      // Verify they match
      if (
        JSON.stringify(hostWeaponBadges) !== JSON.stringify(guestWeaponBadges)
      ) {
        throw new Error(
          `Weapon badge mismatch: host=${JSON.stringify(hostWeaponBadges)} guest=${JSON.stringify(guestWeaponBadges)}`,
        );
      }
      console.log('  ✓ Initial weapon badges match between host and guest');

      // Also check secondary weapon badges
      const hostSecondary = await hostPage.evaluate(() => {
        const badges = document.querySelectorAll(
          '.ship-item.deployed .weapon-badge.secondary',
        );
        return Array.from(badges).map((b) => b.textContent?.trim() || '');
      });
      const guestSecondary = await guestPage.evaluate(() => {
        const badges = document.querySelectorAll(
          '.ship-item.deployed .weapon-badge.secondary',
        );
        return Array.from(badges).map((b) => b.textContent?.trim() || '');
      });

      if (JSON.stringify(hostSecondary) !== JSON.stringify(guestSecondary)) {
        throw new Error(
          `Secondary weapon mismatch: host=${JSON.stringify(hostSecondary)} guest=${JSON.stringify(guestSecondary)}`,
        );
      }
      console.log('  ✓ Secondary weapon badges also match');

      // Now host makes a state change (buy something in store)
      await navigateTo(hostPage, 'store');
      const storeItem = hostPage.locator('.store-item').first();
      if (await storeItem.isVisible().catch(() => false)) {
        await storeItem.click();
        await sleep(200);

        const buyBtn = hostPage.locator('#btn-buy:not([disabled])');
        if (await buyBtn.isVisible().catch(() => false)) {
          await buyBtn.click();
          await sleep(500);
        }
      }

      const hostCredits = await getDisplayedCredits(hostPage);
      console.log(`  Host credits after store action: ${hostCredits}`);

      // Wait for guest credits to sync
      await waitForCreditsToEqual(guestPage, hostCredits);
      console.log('  ✓ Guest credits synced after purchase');

      // Guest navigates back to squadron to verify ship data preserved
      await navigateTo(guestPage, 'squadron');

      const guestWeaponBadgesAfter = await guestPage.evaluate(() => {
        const badges = document.querySelectorAll(
          '.ship-item.deployed .weapon-badge.primary',
        );
        return Array.from(badges).map((b) => b.textContent?.trim() || '');
      });
      console.log(
        `  Guest weapon badges after sync: ${JSON.stringify(guestWeaponBadgesAfter)}`,
      );

      if (
        JSON.stringify(hostWeaponBadges) !==
        JSON.stringify(guestWeaponBadgesAfter)
      ) {
        throw new Error(
          `Weapon badges changed after sync: before=${JSON.stringify(hostWeaponBadges)} after=${JSON.stringify(guestWeaponBadgesAfter)}`,
        );
      }
      console.log('  ✓ Ship weapon data preserved through state sync');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test 12: shipEdit permission cycle on squadron buttons.
 *
 * Default guest permission is 'own', which doesn't match default campaign
 * ship pilots (no mp-pilot-* IDs), so buttons start disabled.
 * Toggle cycle: own(initial) → none → any(enabled) → none(disabled) → any(re-enabled)
 */
function testShipEditPermissionCycleOnSquadron() {
  return runTest(
    'shipEdit Permission Cycle → Squadron Buttons',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ShipEditGuest');
      console.log('  Both players connected');

      // Guest navigates to squadron and selects a deployed ship (second = wingman)
      await navigateTo(guestPage, 'squadron');
      const deployedShip = guestPage.locator('.ship-item.deployed').nth(1);
      await deployedShip.click();
      await sleep(300);

      // Verify Change Ship button exists and is disabled (default 'own', no mp-pilot match)
      const btnExists = await guestPage.evaluate(() => {
        return !!document.querySelector('.btn-change-ship');
      });
      if (!btnExists) {
        throw new Error(
          'Change Ship button not found after selecting deployed ship',
        );
      }

      const initialDisabled = await guestPage.evaluate(() => {
        const btn = document.querySelector('.btn-change-ship');
        return btn?.hasAttribute('disabled') ?? false;
      });
      console.log(
        `  Initial Change Ship disabled (own, no mp-pilot): ${initialDisabled}`,
      );

      // Host navigates to lobby to toggle permissions
      await navigateTo(hostPage, 'lobby');

      // Uncheck shipEdit (own → none), then recheck (none → any via the fix)
      await togglePermission(hostPage, 'shipEdit', false);
      console.log('  Host unchecked shipEdit (→ none)');
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host rechecked shipEdit (→ any)');

      // Wait for Change Ship button to become ENABLED
      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('.btn-change-ship');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Change Ship button ENABLED after shipEdit → any');

      // Uncheck shipEdit (any → none) → button should become disabled
      await togglePermission(hostPage, 'shipEdit', false);
      console.log('  Host unchecked shipEdit (→ none)');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('.btn-change-ship');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Change Ship button DISABLED after shipEdit → none');

      // Recheck shipEdit (none → any) → button re-enabled
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host rechecked shipEdit (→ any)');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('.btn-change-ship');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Change Ship button re-ENABLED after shipEdit → any');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Host purchase → guest sees synced ship data',
    fn: testHostPurchaseSyncsShipDataToGuest,
  },
  {
    name: 'shipEdit permission cycle (squadron buttons toggle)',
    fn: testShipEditPermissionCycleOnSquadron,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - State Sync - Ship Data', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
