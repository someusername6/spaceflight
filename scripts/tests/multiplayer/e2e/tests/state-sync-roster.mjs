/**
 * E2E Tests - State Sync (Roster + Ship Data)
 *
 * Tests for roster assignment sync and ship data preservation.
 * Total: 2 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  setupHostAndGuest,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Roster Sync Tests
// =============================================================================

function testGuestAssignPilotSyncsToHost() {
  return runTest(
    'Guest Assigns Pilot → Host Sees Updated Roster',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'AssignGuest');
      console.log('  Both players connected');

      await navigateTo(hostPage, 'squadron');

      const initialDeployed = await hostPage
        .locator('.ship-item.deployed')
        .count();
      console.log(`  Initial deployed ships: ${initialDeployed}`);
      if (initialDeployed !== 4) {
        throw new Error(`Expected 4 deployed ships, got ${initialDeployed}`);
      }

      const wingmanShip = hostPage.locator('.ship-item.deployed').nth(1);
      await wingmanShip.click();
      await sleep(300);

      const pilotTab = hostPage.locator('.viewer-tab[data-tab="pilot"]');
      const hasPilotTab = await pilotTab.isVisible().catch(() => false);
      if (!hasPilotTab) {
        throw new Error('Pilot tab not found after selecting deployed ship');
      }
      await pilotTab.click();
      await sleep(300);

      const unassignBtn = hostPage.locator('.btn-unassign-pilot');
      const hasUnassign = await unassignBtn.isVisible().catch(() => false);
      if (!hasUnassign) {
        throw new Error('Unassign button not found for wingman ship');
      }
      await unassignBtn.click();
      await sleep(500);

      const afterUnassignDeployed = await hostPage
        .locator('.ship-item.deployed')
        .count();
      console.log(`  Host deployed after unassign: ${afterUnassignDeployed}`);
      if (afterUnassignDeployed !== 3) {
        throw new Error(
          `Expected 3 deployed after unassign, got ${afterUnassignDeployed}`,
        );
      }
      console.log('  ✓ Host unassigned wingman pilot');

      await navigateTo(guestPage, 'squadron');
      await guestPage.waitForFunction(
        () => {
          const deployed = document.querySelectorAll('.ship-item.deployed');
          return deployed.length === 3;
        },
        { timeout: 10000 },
      );

      const guestAvailable = await guestPage
        .locator('.ship-item[data-pilot-id]')
        .count();
      console.log(`  Guest sees 3 deployed + ${guestAvailable} available`);
      if (guestAvailable < 1) {
        throw new Error('Expected guest to see at least 1 available pilot');
      }
      console.log('  ✓ Guest sees unassigned pilot after sync');

      const availablePilot = guestPage
        .locator('.ship-item[data-pilot-id]')
        .first();
      await availablePilot.click();
      await sleep(500);

      const deployBtn = guestPage.locator('.stored-ship-card-btn').first();
      const hasDeploy = await deployBtn.isVisible().catch(() => false);
      if (!hasDeploy) {
        throw new Error('Deploy stored ship button not found in pilot viewer');
      }
      await deployBtn.click();
      await sleep(500);

      const guestDeployedAfter = await guestPage
        .locator('.ship-item.deployed')
        .count();
      console.log(`  Guest deployed after deploy: ${guestDeployedAfter}`);
      if (guestDeployedAfter !== 4) {
        throw new Error(
          `Expected 4 deployed after deploy, got ${guestDeployedAfter}`,
        );
      }
      console.log('  ✓ Guest deployed stored ship (optimistic update)');

      await hostPage.waitForFunction(
        () => {
          const deployed = document.querySelectorAll('.ship-item.deployed');
          return deployed.length === 4;
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Host sees pilot deployed by guest');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Ship Data Tests
// =============================================================================

function testHostPurchaseSyncsShipDataToGuest() {
  return runTest(
    'Host Purchase → Guest Sees Synced Ship Data',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ShipDataGuest');
      console.log('  Both players connected');

      await navigateTo(hostPage, 'squadron');
      await navigateTo(guestPage, 'squadron');

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

      const guestWeaponBadges = await guestPage.evaluate(() => {
        const badges = document.querySelectorAll(
          '.ship-item.deployed .weapon-badge.primary',
        );
        return Array.from(badges).map((b) => b.textContent?.trim() || '');
      });
      console.log(
        `  Guest weapon badges: ${JSON.stringify(guestWeaponBadges)}`,
      );

      if (
        JSON.stringify(hostWeaponBadges) !== JSON.stringify(guestWeaponBadges)
      ) {
        throw new Error(
          `Weapon badge mismatch: host=${JSON.stringify(hostWeaponBadges)} guest=${JSON.stringify(guestWeaponBadges)}`,
        );
      }
      console.log('  ✓ Initial weapon badges match between host and guest');

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

      await waitForCreditsToEqual(guestPage, hostCredits);
      console.log('  ✓ Guest credits synced after purchase');

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

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Guest assign pilot → host sees synced roster',
    fn: testGuestAssignPilotSyncsToHost,
  },
  {
    name: 'Host purchase → guest sees synced ship data',
    fn: testHostPurchaseSyncsShipDataToGuest,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Roster Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
