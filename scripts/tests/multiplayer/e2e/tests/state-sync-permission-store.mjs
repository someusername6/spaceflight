/**
 * E2E Tests - State Sync (Permission Cycles - Store)
 *
 * Tests for permission cycle behavior on store screen buttons.
 * Total: 3 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  setupHostAndGuest,
  togglePermission,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Permission Cycle Tests - Store
// =============================================================================

function testPermissionRemovedDisablesButton() {
  return runTest('Permission Removed → Guest Buy Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermRemoveGuest');
    console.log('  Both players connected');

    await togglePermission(hostPage, 'canBuy', true);
    console.log('  Host granted canBuy');
    await sleep(500);

    await navigateTo(guestPage, 'store');

    const storeItem = guestPage.locator('.store-item').first();
    await storeItem.click();
    await sleep(200);

    const buyBtnEnabled = guestPage.locator('.btn-buy:not([disabled])').first();
    const isEnabled = await buyBtnEnabled.isVisible().catch(() => false);
    console.log(`  Guest Buy enabled (with permission): ${isEnabled}`);

    if (!isEnabled) {
      throw new Error('Buy button should be enabled with permission');
    }

    await togglePermission(hostPage, 'canBuy', false);
    console.log('  Host revoked canBuy');

    await guestPage.waitForFunction(
      () => {
        const btn = document.querySelector('#btn-buy');
        return btn?.hasAttribute('disabled');
      },
      { timeout: 10000 },
    );

    console.log('  ✓ Buy button correctly disabled');

    await hostContext.close();
    await guestContext.close();
  });
}

function testCanSellPermissionCycle() {
  return runTest(
    'canSell Permission Cycle (Sell Button Toggle)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'SellPermGuest');
      console.log('  Both players connected');

      await navigateTo(hostPage, 'store');
      const storeItem = hostPage.locator('.store-item').first();
      if (!(await storeItem.isVisible().catch(() => false))) {
        throw new Error('No store items visible on host');
      }
      await storeItem.click();
      await sleep(200);

      const buyBtn = hostPage.locator('#btn-buy:not([disabled])');
      if (!(await buyBtn.isVisible().catch(() => false))) {
        throw new Error('No enabled Buy button found on host');
      }
      await buyBtn.click();
      await sleep(500);

      const hostCreditsAfterBuy = await getDisplayedCredits(hostPage);
      console.log(`  Host bought item, credits: ${hostCreditsAfterBuy}`);

      await waitForCreditsToEqual(guestPage, hostCreditsAfterBuy);

      await navigateTo(guestPage, 'store');

      const guestStoreItem = guestPage.locator('.store-item').first();
      await guestStoreItem.click();
      await sleep(300);

      const sellEnabled = await guestPage.evaluate(() => {
        const btn = document.querySelector('#btn-sell');
        return btn ? !btn.hasAttribute('disabled') : false;
      });
      console.log(
        `  Guest Sell enabled (default canSell: true): ${sellEnabled}`,
      );

      if (!sellEnabled) {
        throw new Error('Sell button should be enabled with default canSell');
      }
      console.log('  ✓ Sell button enabled with default permissions');

      await navigateTo(hostPage, 'lobby');

      await togglePermission(hostPage, 'canSell', false);
      console.log('  Host revoked canSell');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-sell');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Sell button disabled after revoke');

      await togglePermission(hostPage, 'canSell', true);
      console.log('  Host re-granted canSell');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-sell');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Sell button re-enabled after re-grant');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testFullPermissionCycle() {
  return runTest(
    'Full Permission Cycle (Revoke → Disabled → Re-Grant → Enabled)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'CycleGuest');
      console.log('  Both players connected');

      await navigateTo(guestPage, 'store');

      const storeItem = guestPage.locator('.store-item').first();
      await storeItem.click();
      await sleep(300);

      const initialEnabled = await guestPage.evaluate(() => {
        const btn = document.querySelector('#btn-buy');
        return btn ? !btn.hasAttribute('disabled') : false;
      });
      console.log(`  Buy button initially enabled: ${initialEnabled}`);

      if (!initialEnabled) {
        throw new Error(
          'Buy button should be enabled by default (canBuy: true)',
        );
      }
      console.log('  ✓ Baseline: Buy button enabled with default permissions');

      await togglePermission(hostPage, 'canBuy', false);
      console.log('  Host revoked canBuy');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-buy');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Buy button disabled after revoke');

      await togglePermission(hostPage, 'canBuy', true);
      console.log('  Host re-granted canBuy');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-buy');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Buy button re-enabled after re-grant');

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
    name: 'Permission removed → guest buy disabled',
    fn: testPermissionRemovedDisablesButton,
  },
  {
    name: 'canSell permission cycle (sell button toggle)',
    fn: testCanSellPermissionCycle,
  },
  {
    name: 'Full permission cycle (revoke → disabled → re-grant → enabled)',
    fn: testFullPermissionCycle,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Permission Store Tests', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
