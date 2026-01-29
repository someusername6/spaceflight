/**
 * E2E Tests - Loadout Sync - Equip/Unequip
 *
 * Tests for weapon equip/unequip synchronization between host and guest.
 *
 * Test 1: Host equip primary -> guest sees filled slot (CampaignSync)
 * Test 2: Host unequip primary -> guest sees empty slot (CampaignSync)
 * Test 3: Guest unequip primary -> host sees empty slot (ActionRequest)
 * Test 4: Guest equip primary to empty slot -> host sees filled slot (ActionRequest)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { navigateTo, togglePermission } from './helpers.mjs';
import {
  equipPrimarySlot,
  selectWingman,
  unequipPrimarySlot,
  waitForSlotEmpty,
  waitForSlotFilled,
} from './loadout-helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test 1: Host equip primary -> guest sees filled slot.
 *
 * Host unequips a weapon (creates empty slot), then equips it back.
 * Guest navigates to squadron and verifies the slot is filled (via CampaignSync).
 */
function testHostEquipSyncsToGuest() {
  return runTest('Host Equip -> Guest Sees Filled Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HostEquipGuest');
    console.log('  Both players connected');

    // Host navigates to squadron and selects wingman
    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    // Host unequips primary slot 0 (creates empty slot + stored weapon)
    await unequipPrimarySlot(hostPage, shipId);
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Unequipped primary slot 0');

    // Host equips primary slot 0 back
    await equipPrimarySlot(hostPage, shipId);
    await waitForSlotFilled(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Equipped primary slot 0');

    // Guest navigates to squadron and selects same wingman
    await navigateTo(guestPage, 'squadron');
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    // Guest verifies slot is filled (via CampaignSync)
    await waitForSlotFilled(guestPage, shipId, 'primary', 0, 10000);
    console.log('  Guest: Slot is filled (synced via CampaignSync)');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test 2: Host unequip primary -> guest sees empty slot.
 *
 * Host unequips a primary weapon from a wingman ship. Guest navigates to
 * squadron and verifies the slot is empty (via CampaignSync).
 */
function testHostUnequipSyncsToGuest() {
  return runTest('Host Unequip -> Guest Sees Empty Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'LoadoutGuest1');
    console.log('  Both players connected');

    // Host navigates to squadron and selects wingman
    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    // Verify initial state: primary slot 0 is filled
    const initialFilled = await hostPage.evaluate(
      (sid) =>
        !!document.querySelector(
          `.schematic-slot.primary.filled[data-ship="${sid}"][data-index="0"]`,
        ),
      shipId,
    );
    if (!initialFilled) throw new Error('Primary slot 0 should be filled');
    console.log('  Host: Primary slot 0 is filled');

    // Host unequips primary slot 0
    await unequipPrimarySlot(hostPage, shipId);

    // Verify host sees empty slot
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Slot became empty');

    // Guest navigates to squadron and selects same wingman
    await navigateTo(guestPage, 'squadron');

    // Click the same ship by its data-deployed-id
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    // Guest verifies slot is empty
    await waitForSlotEmpty(guestPage, shipId, 'primary', 0, 10000);
    console.log('  Guest: Slot is empty (synced via CampaignSync)');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test 3: Guest unequip primary -> host sees empty slot.
 *
 * Host grants shipEdit: 'any' permission to guest. Guest unequips a primary
 * weapon from a wingman. Host verifies the slot is empty (via ActionRequest
 * -> CampaignSync round-trip).
 */
function testGuestUnequipSyncsToHost() {
  return runTest('Guest Unequip -> Host Sees Empty Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'LoadoutGuest2');
    console.log('  Both players connected');

    // Grant shipEdit: 'any' (toggle cycle: own->none->any)
    await togglePermission(hostPage, 'shipEdit', false);
    await togglePermission(hostPage, 'shipEdit', true);
    console.log('  Host granted shipEdit: any');

    // Host navigates to squadron, selects wingman (to observe changes)
    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    // Verify host sees filled primary slot 0
    const hostFilled = await hostPage.evaluate(
      (sid) =>
        !!document.querySelector(
          `.schematic-slot.primary.filled[data-ship="${sid}"][data-index="0"]`,
        ),
      shipId,
    );
    if (!hostFilled) throw new Error('Host: Primary slot 0 should be filled');
    console.log('  Host: Primary slot 0 is filled');

    // Guest navigates to squadron and selects same wingman
    await navigateTo(guestPage, 'squadron');
    await guestPage.evaluate((sid) => {
      const item = document.querySelector(
        `.ship-item[data-deployed-id="${sid}"]`,
      );
      if (item) item.click();
    }, shipId);
    await sleep(500);

    // Verify guest sees filled slot too (state is synced)
    const guestFilled = await guestPage.evaluate(
      (sid) =>
        !!document.querySelector(
          `.schematic-slot.primary.filled[data-ship="${sid}"][data-index="0"]`,
        ),
      shipId,
    );
    if (!guestFilled) throw new Error('Guest: Primary slot 0 should be filled');
    console.log('  Guest: Primary slot 0 is filled');

    // Guest unequips primary slot 0
    await unequipPrimarySlot(guestPage, shipId);

    // Guest sees empty slot (optimistic local update)
    await waitForSlotEmpty(guestPage, shipId, 'primary', 0, 5000);
    console.log('  Guest: Slot became empty (optimistic)');

    // Host sees empty slot (via ActionRequest -> process -> CampaignSync)
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 10000);
    console.log('  Host: Slot became empty (via ActionRequest sync)');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test 4: Guest equip primary to empty slot -> host sees filled slot.
 *
 * Host unequips a primary weapon (creating empty slot + stored weapon),
 * guest then equips it back via picker. Host sees the slot refilled
 * (via ActionRequest -> CampaignSync round-trip).
 */
function testGuestEquipSyncsToHost() {
  return runTest('Guest Equip -> Host Sees Filled Slot', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'EquipGuest');
    console.log('  Both players connected');

    // Grant shipEdit: 'any' (toggle cycle: own->none->any)
    await togglePermission(hostPage, 'shipEdit', false);
    await togglePermission(hostPage, 'shipEdit', true);
    console.log('  Host granted shipEdit: any');

    // Host navigates to squadron, selects wingman
    await navigateTo(hostPage, 'squadron');
    const shipId = await selectWingman(hostPage);
    console.log(`  Host selected wingman: ${shipId}`);

    // Host unequips primary slot 0 (creates empty slot + stored weapon)
    await unequipPrimarySlot(hostPage, shipId);
    await waitForSlotEmpty(hostPage, shipId, 'primary', 0, 5000);
    console.log('  Host: Unequipped primary slot 0');

    // Wait for CampaignSync to guest
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

    // Guest verifies slot is empty
    await waitForSlotEmpty(guestPage, shipId, 'primary', 0, 10000);
    console.log('  Guest: Slot is empty');

    // Guest equips primary slot 0 (picks from stored weapons)
    await equipPrimarySlot(guestPage, shipId);
    console.log('  Guest: Equipped primary slot 0');

    // Guest sees filled slot (optimistic local update)
    await waitForSlotFilled(guestPage, shipId, 'primary', 0, 5000);
    console.log('  Guest: Slot is filled (optimistic)');

    // Host sees filled slot (via ActionRequest -> CampaignSync)
    await waitForSlotFilled(hostPage, shipId, 'primary', 0, 10000);
    console.log('  Host: Slot is filled (via ActionRequest sync)');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

/** All test definitions */
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
  runTestSuite('E2E Tests - Loadout Sync - Equip/Unequip', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
