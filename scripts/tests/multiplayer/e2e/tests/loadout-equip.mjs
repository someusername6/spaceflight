/**
 * E2E Tests - Loadout Equip/Unequip
 *
 * Tests for equip and unequip synchronization.
 * Total: 4 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  equipPrimarySlot,
  navigateTo,
  selectWingman,
  setupHostAndGuest,
  togglePermission,
  unequipPrimarySlot,
  waitForSlotEmpty,
  waitForSlotFilled,
} from '../helpers/index.mjs';

// =============================================================================
// Equip/Unequip Tests
// =============================================================================

function testHostEquipSyncsToGuest() {
  return runTest('Host Equip -> Guest Sees Filled Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HostEquipGuest');
    console.log('  Both players connected');

    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    await unequipPrimarySlot(hostPage, shipId);
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Unequipped primary slot 0');

    await equipPrimarySlot(hostPage, shipId);
    await waitForSlotFilled(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Equipped primary slot 0');

    await navigateTo(guestPage, 'squadron');
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    await waitForSlotFilled(guestPage, shipId, 'primary', 0, 10000);
    console.log('  Guest: Slot is filled (synced via CampaignSync)');

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostUnequipSyncsToGuest() {
  return runTest('Host Unequip -> Guest Sees Empty Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'LoadoutGuest1');
    console.log('  Both players connected');

    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    const initialFilled = await hostPage.evaluate(
      (sid) =>
        !!document.querySelector(
          `.schematic-slot.primary.filled[data-ship="${sid}"][data-index="0"]`,
        ),
      shipId,
    );
    if (!initialFilled) throw new Error('Primary slot 0 should be filled');
    console.log('  Host: Primary slot 0 is filled');

    await unequipPrimarySlot(hostPage, shipId);
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Slot became empty');

    await navigateTo(guestPage, 'squadron');
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    await waitForSlotEmpty(guestPage, shipId, 'primary', 0, 10000);
    console.log('  Guest: Slot is empty (synced via CampaignSync)');

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestUnequipSyncsToHost() {
  return runTest('Guest Unequip -> Host Sees Empty Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'LoadoutGuest2');
    console.log('  Both players connected');

    await togglePermission(hostPage, 'shipEdit', false);
    await togglePermission(hostPage, 'shipEdit', true);
    console.log('  Host granted shipEdit: any');

    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    const hostFilled = await hostPage.evaluate(
      (sid) =>
        !!document.querySelector(
          `.schematic-slot.primary.filled[data-ship="${sid}"][data-index="0"]`,
        ),
      shipId,
    );
    if (!hostFilled) throw new Error('Host: Primary slot 0 should be filled');
    console.log('  Host: Primary slot 0 is filled');

    await navigateTo(guestPage, 'squadron');
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    const guestFilled = await guestPage.evaluate(
      (sid) =>
        !!document.querySelector(
          `.schematic-slot.primary.filled[data-ship="${sid}"][data-index="0"]`,
        ),
      shipId,
    );
    if (!guestFilled) throw new Error('Guest: Primary slot 0 should be filled');
    console.log('  Guest: Primary slot 0 is filled');

    await unequipPrimarySlot(guestPage, shipId);

    await waitForSlotEmpty(guestPage, shipId, 'primary', 0, 5000);
    console.log('  Guest: Slot became empty (optimistic)');

    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 10000);
    console.log('  Host: Slot became empty (via ActionRequest sync)');

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestEquipSyncsToHost() {
  return runTest('Guest Equip -> Host Sees Filled Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'EquipGuest');
    console.log('  Both players connected');

    await togglePermission(hostPage, 'shipEdit', false);
    await togglePermission(hostPage, 'shipEdit', true);
    console.log('  Host granted shipEdit: any');

    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    await unequipPrimarySlot(hostPage, shipId);
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Unequipped primary slot 0');

    await sleep(1000);

    await navigateTo(guestPage, 'squadron');
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    await waitForSlotEmpty(guestPage, shipId, 'primary', 0, 10000);
    console.log('  Guest: Slot is empty');

    await equipPrimarySlot(guestPage, shipId);
    console.log('  Guest: Equipped primary slot 0');

    await waitForSlotFilled(guestPage, shipId, 'primary', 0, 5000);
    console.log('  Guest: Slot is filled (optimistic)');

    await waitForSlotFilled(hostPage, shipId, 'primary', 0, 10000);
    console.log('  Host: Slot is filled (via ActionRequest sync)');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Host equip -> guest sees filled slot',
    fn: testHostEquipSyncsToGuest,
  },
  {
    name: 'Host unequip -> guest sees empty slot',
    fn: testHostUnequipSyncsToGuest,
  },
  {
    name: 'Guest unequip -> host sees empty slot',
    fn: testGuestUnequipSyncsToHost,
  },
  {
    name: 'Guest equip -> host sees filled slot',
    fn: testGuestEquipSyncsToHost,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Loadout Equip Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
