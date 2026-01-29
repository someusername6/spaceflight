/**
 * E2E Tests - Loadout Sync - Resupply
 *
 * Tests for resupply synchronization between host and guest.
 *
 * Test 1: Guest resupply -> host sees credit change (ActionRequest)
 * Test 2: Guest resupply all -> host sees updated state (ActionRequest)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { navigateTo, togglePermission } from './helpers.mjs';
import { selectWingman, waitForSlotEmpty } from './loadout-helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test 1: Guest resupply -> host sees credit change.
 *
 * Host creates a depleted ammo state by unequipping a secondary weapon and
 * re-equipping it with reduced count. Guest then resupplies the ship,
 * and host observes the resupply via ActionRequest -> CampaignSync
 * (resupply button disappears on host, confirming state synced).
 */
function testGuestResupplySyncsToHost() {
  return runTest(
    'Guest Resupply -> Host Sees Credit Change',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ResupplyGuest');
      console.log('  Both players connected');

      // Grant shipEdit: 'any' (toggle cycle: own->none->any)
      await togglePermission(hostPage, 'shipEdit', false);
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host granted shipEdit: any');

      // Host navigates to squadron, selects wingman
      await navigateTo(hostPage, 'squadron');
      const shipId = await selectWingman(hostPage);
      console.log(`  Host selected wingman: ${shipId}`);

      // --- Create depleted ammo state ---
      // Step 1: Unequip secondary slot 0 (seeker, moves to storage)
      const secFilledSel = `.schematic-slot.secondary.filled[data-ship="${shipId}"][data-index="0"]`;
      await hostPage.hover(secFilledSel);
      await sleep(300);
      await hostPage.click(secFilledSel);
      await sleep(300);

      await hostPage.waitForSelector('.btn-unequip', {
        state: 'visible',
        timeout: 3000,
      });
      await hostPage.click('.btn-unequip');
      await sleep(500);

      // Wait for slot to become empty
      await waitForSlotEmpty(hostPage, shipId, 'secondary', 0, 5000);
      console.log('  Host: Unequipped secondary slot 0');

      // Step 2: Hover empty secondary slot -> pin picker
      const secEmptySel = `.schematic-slot.secondary.empty[data-ship="${shipId}"][data-index="0"]`;
      await hostPage.hover(secEmptySel);
      await sleep(300);
      await hostPage.click(secEmptySel);
      await sleep(300);

      // Step 3: Reduce quantity by 1 (click "-" button)
      await hostPage.waitForSelector('.picker-qty-btn[data-action="dec"]', {
        state: 'visible',
        timeout: 3000,
      });
      await hostPage.click('.picker-qty-btn[data-action="dec"]');
      await sleep(200);

      // Step 4: Click Equip button
      await hostPage.waitForSelector('.picker-equip-btn', {
        state: 'visible',
        timeout: 3000,
      });
      await hostPage.click('.picker-equip-btn');
      await sleep(500);

      // Verify slot is now filled again (with reduced count)
      await hostPage.waitForFunction(
        ({ sid }) => {
          const slot = document.querySelector(
            `.schematic-slot.secondary.filled[data-ship="${sid}"][data-index="0"]`,
          );
          return !!slot;
        },
        { sid: shipId },
        { timeout: 5000 },
      );
      console.log('  Host: Re-equipped secondary with reduced count');

      // Verify Resupply button is visible (ship needs ammo)
      await hostPage.waitForSelector(
        `.btn-resupply-ship[data-ship="${shipId}"]`,
        {
          state: 'visible',
          timeout: 5000,
        },
      );
      console.log('  Host: Resupply button visible');

      // --- Guest resupply ---
      // Wait for CampaignSync so guest has the depleted state
      await sleep(1000);

      // Guest navigates to squadron, selects same wingman
      await navigateTo(guestPage, 'squadron');
      await guestPage.evaluate((sid) => {
        const item = document.querySelector(
          `.ship-item[data-deployed-id="${sid}"]`,
        );
        if (item) item.click();
      }, shipId);
      await sleep(500);

      // Guest should see the Resupply button
      const resupplyBtnSel = `.btn-resupply-ship[data-ship="${shipId}"]`;
      await guestPage.waitForSelector(resupplyBtnSel, {
        state: 'visible',
        timeout: 10000,
      });
      console.log('  Guest: Resupply button visible');

      // Guest clicks Resupply
      await guestPage.click(resupplyBtnSel);
      console.log('  Guest: Clicked Resupply');
      await sleep(500);

      // Verify: Resupply button disappears on guest (optimistic, ammo now full)
      await guestPage.waitForFunction(
        (sel) => !document.querySelector(sel),
        resupplyBtnSel,
        { timeout: 5000 },
      );
      console.log('  Guest: Resupply button gone (ammo full, optimistic)');

      // Verify: Resupply button disappears on HOST (via ActionRequest -> sync)
      // This proves the guest's resupply action was received and processed
      await hostPage.waitForFunction(
        (sel) => !document.querySelector(sel),
        resupplyBtnSel,
        { timeout: 10000 },
      );
      console.log('  Host: Resupply button gone (synced via ActionRequest)');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test 2: Guest resupply all -> host sees updated state.
 *
 * Host creates depleted ammo by re-equipping secondary with reduced count.
 * Guest clicks "Resupply All", host sees the resupply-all button disappear
 * (via ActionRequest -> CampaignSync round-trip).
 */
function testGuestResupplyAllSyncsToHost() {
  return runTest(
    'Guest Resupply All -> Host Sees Updated State',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ResupplyAllGuest');
      console.log('  Both players connected');

      // Grant shipEdit: 'any' (toggle cycle: own->none->any)
      await togglePermission(hostPage, 'shipEdit', false);
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host granted shipEdit: any');

      // Host navigates to squadron, selects wingman
      await navigateTo(hostPage, 'squadron');
      const shipId = await selectWingman(hostPage);
      console.log(`  Host selected wingman: ${shipId}`);

      // --- Create depleted ammo state ---
      // Unequip secondary slot 0 (seeker, moves to storage)
      const secFilledSel = `.schematic-slot.secondary.filled[data-ship="${shipId}"][data-index="0"]`;
      await hostPage.hover(secFilledSel);
      await sleep(300);
      await hostPage.click(secFilledSel);
      await sleep(300);

      await hostPage.waitForSelector('.btn-unequip', {
        state: 'visible',
        timeout: 3000,
      });
      await hostPage.click('.btn-unequip');
      await sleep(500);

      await waitForSlotEmpty(hostPage, shipId, 'secondary', 0, 5000);
      console.log('  Host: Unequipped secondary slot 0');

      // Re-equip with reduced count (click "-" then Equip)
      const secEmptySel = `.schematic-slot.secondary.empty[data-ship="${shipId}"][data-index="0"]`;
      await hostPage.hover(secEmptySel);
      await sleep(300);
      await hostPage.click(secEmptySel);
      await sleep(300);

      await hostPage.waitForSelector('.picker-qty-btn[data-action="dec"]', {
        state: 'visible',
        timeout: 3000,
      });
      await hostPage.click('.picker-qty-btn[data-action="dec"]');
      await sleep(200);

      await hostPage.waitForSelector('.picker-equip-btn', {
        state: 'visible',
        timeout: 3000,
      });
      await hostPage.click('.picker-equip-btn');
      await sleep(500);

      // Verify Resupply All button is visible (ship needs ammo)
      await hostPage.waitForSelector('.btn-resupply-all', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Host: Resupply All button visible');

      // Wait for CampaignSync to guest
      await sleep(1000);

      // Guest navigates to squadron
      await navigateTo(guestPage, 'squadron');

      // Guest should see Resupply All button
      await guestPage.waitForSelector('.btn-resupply-all', {
        state: 'visible',
        timeout: 10000,
      });
      console.log('  Guest: Resupply All button visible');

      // Guest clicks Resupply All
      await guestPage.click('.btn-resupply-all');
      console.log('  Guest: Clicked Resupply All');
      await sleep(500);

      // Guest: Resupply All button disappears (optimistic, ammo now full)
      await guestPage.waitForFunction(
        () => !document.querySelector('.btn-resupply-all'),
        { timeout: 5000 },
      );
      console.log('  Guest: Resupply All button gone (optimistic)');

      // Host: Resupply All button disappears (via ActionRequest -> sync)
      await hostPage.waitForFunction(
        () => !document.querySelector('.btn-resupply-all'),
        { timeout: 10000 },
      );
      console.log(
        '  Host: Resupply All button gone (synced via ActionRequest)',
      );

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Main
// =============================================================================

/** All test definitions */
export const ALL_TESTS = [
  {
    name: 'Guest resupply -> host sees credit change',
    fn: testGuestResupplySyncsToHost,
  },
  {
    name: 'Guest resupply all -> host sees updated state',
    fn: testGuestResupplyAllSyncsToHost,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Loadout Sync - Resupply', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
