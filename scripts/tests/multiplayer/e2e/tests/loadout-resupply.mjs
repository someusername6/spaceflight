/**
 * E2E Tests - Loadout Resupply
 *
 * Tests for resupply synchronization.
 * Total: 2 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  navigateTo,
  selectWingman,
  setupHostAndGuest,
  togglePermission,
  waitForSlotEmpty,
} from '../helpers/index.mjs';

// =============================================================================
// Resupply Tests
// =============================================================================

function testGuestResupplySyncsToHost() {
  return runTest(
    'Guest Resupply -> Host Sees Credit Change',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ResupplyGuest');
      console.log('  Both players connected');

      await togglePermission(hostPage, 'shipEdit', false);
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host granted shipEdit: any');

      await navigateTo(hostPage, 'squadron');
      const shipId = await selectWingman(hostPage);
      console.log(`  Host selected wingman: ${shipId}`);

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

      await hostPage.waitForSelector(
        `.btn-resupply-ship[data-ship="${shipId}"]`,
        {
          state: 'visible',
          timeout: 5000,
        },
      );
      console.log('  Host: Resupply button visible');

      await sleep(1000);

      await navigateTo(guestPage, 'squadron');
      await guestPage.evaluate((sid) => {
        const item = document.querySelector(
          `.ship-item[data-deployed-id="${sid}"]`,
        );
        if (item) item.click();
      }, shipId);
      await sleep(500);

      const resupplyBtnSel = `.btn-resupply-ship[data-ship="${shipId}"]`;
      await guestPage.waitForSelector(resupplyBtnSel, {
        state: 'visible',
        timeout: 10000,
      });
      console.log('  Guest: Resupply button visible');

      await guestPage.click(resupplyBtnSel);
      console.log('  Guest: Clicked Resupply');
      await sleep(500);

      await guestPage.waitForFunction(
        (sel) => !document.querySelector(sel),
        resupplyBtnSel,
        {
          timeout: 5000,
        },
      );
      console.log('  Guest: Resupply button gone (ammo full, optimistic)');

      await hostPage.waitForFunction(
        (sel) => !document.querySelector(sel),
        resupplyBtnSel,
        {
          timeout: 10000,
        },
      );
      console.log('  Host: Resupply button gone (synced via ActionRequest)');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testGuestResupplyAllSyncsToHost() {
  return runTest(
    'Guest Resupply All -> Host Sees Updated State',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ResupplyAllGuest');
      console.log('  Both players connected');

      await togglePermission(hostPage, 'shipEdit', false);
      await togglePermission(hostPage, 'shipEdit', true);
      console.log('  Host granted shipEdit: any');

      await navigateTo(hostPage, 'squadron');
      const shipId = await selectWingman(hostPage);
      console.log(`  Host selected wingman: ${shipId}`);

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

      await hostPage.waitForSelector('.btn-resupply-all', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Host: Resupply All button visible');

      await sleep(1000);

      await navigateTo(guestPage, 'squadron');

      await guestPage.waitForSelector('.btn-resupply-all', {
        state: 'visible',
        timeout: 10000,
      });
      console.log('  Guest: Resupply All button visible');

      await guestPage.click('.btn-resupply-all');
      console.log('  Guest: Clicked Resupply All');
      await sleep(500);

      await guestPage.waitForFunction(
        () => !document.querySelector('.btn-resupply-all'),
        {
          timeout: 5000,
        },
      );
      console.log('  Guest: Resupply All button gone (optimistic)');

      await hostPage.waitForFunction(
        () => !document.querySelector('.btn-resupply-all'),
        {
          timeout: 10000,
        },
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
// Exports
// =============================================================================

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
  runTestSuite('Loadout Resupply Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
