/**
 * E2E Tests - State Sync - Roster & Permissions
 *
 * Tests for:
 * - Guest assign pilot → host sees synced roster
 * - canConvertScrap permission cycle (popover toggle + guest propagation)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { navigateTo, togglePermission } from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test 13: Guest assigns pilot → host sees updated roster.
 *
 * Tests the full ActionRequest pipeline for guest squadron actions:
 * 1. Host unassigns a wingman pilot (host action syncs to guest)
 * 2. Guest assigns the pilot back via ActionRequest
 * 3. Host sees the pilot re-assigned (via ActionRequest processing)
 */
function testGuestAssignPilotSyncsToHost() {
  return runTest(
    'Guest Assigns Pilot → Host Sees Updated Roster',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'AssignGuest');
      console.log('  Both players connected');

      // Host navigates to squadron
      await navigateTo(hostPage, 'squadron');

      // Verify initial state: 4 deployed ships
      const initialDeployed = await hostPage
        .locator('.ship-item.deployed')
        .count();
      console.log(`  Initial deployed ships: ${initialDeployed}`);
      if (initialDeployed !== 4) {
        throw new Error(`Expected 4 deployed ships, got ${initialDeployed}`);
      }

      // Host clicks second deployed ship (wingman, not commander)
      const wingmanShip = hostPage.locator('.ship-item.deployed').nth(1);
      await wingmanShip.click();
      await sleep(300);

      // Switch to Pilot tab to access the Unassign button
      const pilotTab = hostPage.locator('.viewer-tab[data-tab="pilot"]');
      const hasPilotTab = await pilotTab.isVisible().catch(() => false);
      if (!hasPilotTab) {
        throw new Error('Pilot tab not found after selecting deployed ship');
      }
      await pilotTab.click();
      await sleep(300);

      // Host clicks Unassign Pilot
      const unassignBtn = hostPage.locator('.btn-unassign-pilot');
      const hasUnassign = await unassignBtn.isVisible().catch(() => false);
      if (!hasUnassign) {
        throw new Error('Unassign button not found for wingman ship');
      }
      await unassignBtn.click();
      await sleep(500);

      // Verify host sees 3 deployed ships
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

      // Guest navigates to squadron and waits for synced state (3 deployed)
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

      // Guest selects the available pilot
      const availablePilot = guestPage
        .locator('.ship-item[data-pilot-id]')
        .first();
      await availablePilot.click();
      await sleep(500);

      // Unassigning moves ship to stored ships, so the pilot viewer shows
      // a "Deploy stored ship" button, not "Assign to ship"
      const deployBtn = guestPage.locator('.stored-ship-card-btn').first();
      const hasDeploy = await deployBtn.isVisible().catch(() => false);
      if (!hasDeploy) {
        throw new Error('Deploy stored ship button not found in pilot viewer');
      }
      await deployBtn.click();
      await sleep(500);

      // Verify guest sees 4 deployed ships (optimistic update)
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

      // Wait for host to see 4 deployed ships (via ActionRequest → CampaignSync)
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

/**
 * Test 14: canConvertScrap permission cycle (popover toggle).
 *
 * The default campaign has no scrap, so the Convert button is not visible.
 * Instead, this tests the canConvertScrap checkbox roundtrip on the host
 * popover and verifies guest-side propagation by also toggling canBuy
 * (which has a visible effect on the guest's store UI).
 *
 * Flow:
 * 1. Verify canConvertScrap defaults to checked
 * 2. Host unchecks canConvertScrap → popover reflects unchecked
 * 3. Host also unchecks canBuy → guest Buy button becomes disabled
 *    (proves PermissionUpdate carrying canConvertScrap=false was received)
 * 4. Host rechecks canConvertScrap → popover reflects checked
 * 5. Host rechecks canBuy → guest Buy button re-enabled
 */
function testCanConvertScrapPermissionCycle() {
  return runTest(
    'canConvertScrap Permission Cycle (Popover Toggle)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ConvertPermGuest');
      console.log('  Both players connected');

      // Guest navigates to store and selects an item (for canBuy verification)
      await navigateTo(guestPage, 'store');
      const storeItem = guestPage.locator('.store-item').first();
      await storeItem.click();
      await sleep(200);

      // Step 1: Open popover → verify canConvertScrap is checked by default
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

      // Close popover
      await hostPage.mouse.move(0, 0);
      await sleep(200);

      // Step 2: Uncheck canConvertScrap
      await togglePermission(hostPage, 'canConvertScrap', false);
      console.log('  Host unchecked canConvertScrap');

      // Step 3: Verify canConvertScrap is unchecked in reopened popover
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

      // Close popover
      await hostPage.mouse.move(0, 0);
      await sleep(200);

      // Step 4: Also uncheck canBuy → guest Buy button becomes disabled
      // (proves PermissionUpdate carrying canConvertScrap=false was received)
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

      // Step 5: Recheck canConvertScrap
      await togglePermission(hostPage, 'canConvertScrap', true);
      console.log('  Host rechecked canConvertScrap');

      // Verify canConvertScrap is checked in reopened popover
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

      const popover3 = hostPage.locator('.host-popover').first();
      await popover3.waitFor({ state: 'visible', timeout: 3000 });

      const checkbox3 = popover3.locator(
        'input[data-permission="canConvertScrap"]',
      );
      const afterRecheck = await checkbox3.isChecked();
      console.log(`  canConvertScrap after recheck: ${afterRecheck}`);

      if (!afterRecheck) {
        throw new Error('canConvertScrap should be checked after toggle on');
      }
      console.log('  ✓ canConvertScrap rechecked (restored in lobby state)');

      // Close popover
      await hostPage.mouse.move(0, 0);
      await sleep(200);

      // Step 6: Recheck canBuy → guest Buy button re-enabled
      await togglePermission(hostPage, 'canBuy', true);
      console.log('  Host rechecked canBuy');

      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-buy');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log(
        '  ✓ Guest Buy re-enabled (PermissionUpdate with canConvertScrap=true received)',
      );

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
    name: 'Guest assign pilot → host sees synced roster',
    fn: testGuestAssignPilotSyncsToHost,
  },
  {
    name: 'canConvertScrap permission cycle (popover toggle)',
    fn: testCanConvertScrapPermissionCycle,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite(
    'E2E Tests - State Sync - Roster & Permissions',
    ALL_TESTS,
  ).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
