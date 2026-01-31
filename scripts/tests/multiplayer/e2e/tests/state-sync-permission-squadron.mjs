/**
 * E2E Tests - State Sync (Permission Cycles - Squadron)
 *
 * Tests for permission cycle behavior on squadron screen buttons.
 * Total: 2 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  navigateTo,
  setupHostAndGuest,
  togglePermission,
} from '../helpers/index.mjs';

// =============================================================================
// Permission Cycle Tests - Squadron
// =============================================================================

function testCanConvertScrapPermissionCycle() {
  return runTest(
    'canConvertScrap Permission Cycle (Popover Toggle)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ConvertPermGuest');
      console.log('  Both players connected');

      await navigateTo(guestPage, 'store');
      const storeItem = guestPage.locator('.store-item').first();
      await storeItem.click();
      await sleep(200);

      const guestRow = hostPage
        .locator('.player-row:not(:has(.host-indicator))')
        .first();
      await guestRow.hover();
      await sleep(400);

      const popover1 = hostPage.locator('.host-popover').first();
      await popover1.waitFor({ state: 'visible', timeout: 3000 });

      const checkbox1 = popover1.locator(
        'input[data-permission="canConvertScrap"]',
      );
      const initialChecked = await checkbox1.isChecked();
      console.log(`  canConvertScrap default: ${initialChecked}`);

      if (!initialChecked) {
        throw new Error('canConvertScrap should be checked by default');
      }
      console.log('  ✓ Default canConvertScrap is checked (true)');

      await hostPage.mouse.move(0, 0);
      await sleep(200);

      await togglePermission(hostPage, 'canConvertScrap', false);
      console.log('  Host unchecked canConvertScrap');

      await hostPage.mouse.move(0, 0);
      await sleep(200);
      await hostPage.evaluate(() => {
        for (const el of document.querySelectorAll('.host-popover')) {
          el.remove();
        }
      });
      await sleep(100);

      await guestRow.hover();
      await sleep(400);

      const popover2 = hostPage.locator('.host-popover').first();
      await popover2.waitFor({ state: 'visible', timeout: 3000 });

      const checkbox2 = popover2.locator(
        'input[data-permission="canConvertScrap"]',
      );
      const afterUncheck = await checkbox2.isChecked();
      console.log(`  canConvertScrap after uncheck: ${afterUncheck}`);

      if (afterUncheck) {
        throw new Error('canConvertScrap should be unchecked after toggle off');
      }
      console.log('  ✓ canConvertScrap unchecked (persisted in lobby state)');

      await hostPage.mouse.move(0, 0);
      await sleep(200);

      await togglePermission(hostPage, 'canBuy', false);
      console.log('  Host also unchecked canBuy');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-buy');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log(
        '  ✓ Guest Buy disabled (PermissionUpdate with canConvertScrap=false received)',
      );

      await togglePermission(hostPage, 'canConvertScrap', true);
      console.log('  Host rechecked canConvertScrap');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testShipEditPermissionCycleOnSquadron() {
  return runTest(
    'shipEdit Permission Cycle → Squadron Buttons',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ShipEditGuest');
      console.log('  Both players connected');

      await navigateTo(guestPage, 'squadron');
      const deployedShip = guestPage.locator('.ship-item.deployed').nth(1);
      await deployedShip.click();
      await sleep(300);

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

      await navigateTo(hostPage, 'lobby');

      await togglePermission(hostPage, 'shipEdit', false);
      console.log('  Host unchecked shipEdit (→ none)');
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host rechecked shipEdit (→ any)');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('.btn-change-ship');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Change Ship button ENABLED after shipEdit → any');

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
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'canConvertScrap permission cycle (popover toggle)',
    fn: testCanConvertScrapPermissionCycle,
  },
  {
    name: 'shipEdit permission cycle (squadron buttons toggle)',
    fn: testShipEditPermissionCycleOnSquadron,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Permission Squadron Tests', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
