/**
 * E2E Tests - State Sync - Permission Cycles
 *
 * Tests for:
 * - Permission removed → guest store button disabled
 * - canSell permission cycle (sell button toggle)
 * - Full permission cycle (revoke → disabled → re-grant → enabled)
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
 * Test 5: Permission removed → guest store button disabled.
 */
function testPermissionRemovedDisablesButton() {
  return runTest('Permission Removed → Guest Buy Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermRemoveGuest');
    console.log('  Both players connected');

    // Grant buy permission first
    await togglePermission(hostPage, 'canBuy', true);
    console.log('  Host granted canBuy');
    await sleep(500);

    // Guest navigates to store
    await navigateTo(guestPage, 'store');

    // Select an item
    const storeItem = guestPage.locator('.store-item').first();
    await storeItem.click();
    await sleep(200);

    // Verify Buy is enabled
    const buyBtnEnabled = guestPage.locator('.btn-buy:not([disabled])').first();
    const isEnabled = await buyBtnEnabled.isVisible().catch(() => false);
    console.log(`  Guest Buy enabled (with permission): ${isEnabled}`);

    if (!isEnabled) {
      throw new Error('Buy button should be enabled with permission');
    }

    // Host revokes buy permission
    await togglePermission(hostPage, 'canBuy', false);
    console.log('  Host revoked canBuy');

    // Wait for permission change to propagate and UI to refresh.
    // The screen re-renders via refreshStoreUI, preserving selectedItem.
    // Do NOT re-click the store item — that toggles selection off.
    await guestPage.waitForFunction(
      () => {
        const btn = document.querySelector('#btn-buy');
        return btn?.hasAttribute('disabled');
      },
      { timeout: 10000 },
    );

    const buttonDisabled = true; // waitForFunction succeeded
    console.log(`  Guest Buy disabled (after revoke): ${buttonDisabled}`);

    if (!buttonDisabled) {
      throw new Error('Buy button should be disabled after permission revoked');
    }
    console.log('  ✓ Buy button correctly disabled');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test 6: canSell full cycle — Sell button toggled by permission.
 *
 * 1. Host buys an item (so storage has something to sell)
 * 2. Guest navigates to store, selects item with storageCount > 0
 * 3. Verify Sell button is enabled (canSell default is true)
 * 4. Host revokes canSell → wait for Sell button to become disabled
 * 5. Host grants canSell → wait for Sell button to become enabled
 */
function testCanSellPermissionCycle() {
  return runTest(
    'canSell Permission Cycle (Sell Button Toggle)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'SellPermGuest');
      console.log('  Both players connected');

      // Host navigates to store and buys an item to populate storage
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

      // Wait for guest to sync
      await waitForCreditsToEqual(guestPage, hostCreditsAfterBuy);

      // Guest navigates to store
      await navigateTo(guestPage, 'store');

      // Select an item that has storage (one we just bought)
      // Click first store item — it should now have a Sell button
      const guestStoreItem = guestPage.locator('.store-item').first();
      await guestStoreItem.click();
      await sleep(300);

      // Verify Sell button is enabled (canSell default is true)
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

      // Host navigates back to lobby (togglePermission needs player rows)
      await navigateTo(hostPage, 'lobby');

      // Host revokes canSell
      await togglePermission(hostPage, 'canSell', false);
      console.log('  Host revoked canSell');

      // Wait for Sell button to become disabled
      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-sell');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Sell button disabled after revoke');

      // Host re-grants canSell
      await togglePermission(hostPage, 'canSell', true);
      console.log('  Host re-granted canSell');

      // Wait for Sell button to become enabled
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

/**
 * Test 11: Full canBuy permission cycle (revoke → disabled → re-grant → enabled).
 * Tests bidirectional permission propagation in a single test.
 * Default guest permissions have canBuy: true, so we first revoke then re-grant.
 */
function testFullPermissionCycle() {
  return runTest(
    'Full Permission Cycle (Revoke → Disabled → Re-Grant → Enabled)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'CycleGuest');
      console.log('  Both players connected');

      // Guest navigates to store
      await navigateTo(guestPage, 'store');

      // Select first item
      const storeItem = guestPage.locator('.store-item').first();
      await storeItem.click();
      await sleep(300);

      // Verify Buy button is enabled (default: canBuy is true)
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

      // Step 1: Host REVOKES canBuy
      await togglePermission(hostPage, 'canBuy', false);
      console.log('  Host revoked canBuy');

      // Wait for Buy button to become disabled
      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-buy');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Buy button disabled after revoke');

      // Step 2: Host RE-GRANTS canBuy
      await togglePermission(hostPage, 'canBuy', true);
      console.log('  Host re-granted canBuy');

      // Wait for Buy button to become enabled again
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
// Main
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
  runTestSuite('E2E Tests - State Sync - Permission Cycles', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
