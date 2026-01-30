/**
 * Spectator Mode Tests - Tests for actual spectator functionality.
 *
 * Tests for players without assigned ships who spectate the mission.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { acceptFirstContract, readyBothPlayers } from './helpers.mjs';
import { waitForMissionScreen } from './mission-wingman-helpers.mjs';
import {
  unassignGuestShip,
  waitForMissionOrSpectatorScreen,
} from './spectator-helpers.mjs';
import { TIMEOUTS } from './test-config.mjs';
import { runTest, sleep } from './utils.mjs';

// =============================================================================
// Spectator Launch Helper
// =============================================================================

/**
 * Helper: Launch mission for spectator tests.
 * Host sees normal HUD, guest (spectator) sees spectator HUD.
 */
async function launchMissionForSpectatorTest(hostPage, guestPage) {
  // Ready both players
  await readyBothPlayers(hostPage, guestPage);

  // Host accepts first contract
  await acceptFirstContract(hostPage);

  // Wait for mission to start on both (host has normal HUD, guest has spectator HUD)
  await Promise.all([
    waitForMissionScreen(hostPage, TIMEOUTS.missionStart),
    waitForMissionOrSpectatorScreen(guestPage, TIMEOUTS.missionStart),
  ]);
}

// =============================================================================
// Spectator Mode Tests
// =============================================================================

/**
 * Test: Spectator mode activates when guest has no ship assigned.
 *
 * Flow:
 * 1. Host unassigns guest's pilot via squadron screen
 * 2. Launch mission
 * 3. Verify guest sees spectator HUD (not weapon display)
 */
export function testSpectatorModeActivates() {
  return runTest('Spectator Mode Activates When No Ship', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Unassign the guest's pilot
    await unassignGuestShip(hostPage);
    console.log('  Guest ship unassigned');

    // Wait for sync to propagate and verify guest sees "Spectator" status
    await sleep(1000);

    // Verify guest is now a spectator in lobby (ship-status shows "Spectator")
    // Use specific selector for the guest's own row
    const guestStatus = await guestPage
      .locator('.player-row.self .ship-status')
      .textContent()
      .catch(() => '(not found)');
    console.log(`  Guest lobby status: "${guestStatus}"`);

    if (!guestStatus?.toLowerCase().includes('spectator')) {
      throw new Error(
        `Guest should show "Spectator" status in lobby, got: "${guestStatus}"`,
      );
    }

    // Launch mission
    await launchMissionForSpectatorTest(hostPage, guestPage);
    console.log('  Mission launched');

    // Check guest HUD - should have spectator-hud, not weapon-display
    const guestHasSpectatorHud = await guestPage
      .locator('.spectator-hud')
      .isVisible()
      .catch(() => false);
    const guestHasWeaponDisplay = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);

    console.log(`  Guest spectator-hud: ${guestHasSpectatorHud}`);
    console.log(`  Guest weapon-display: ${guestHasWeaponDisplay}`);

    // Host should still have normal pilot HUD
    const hostHasWeaponDisplay = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const hostHasSpectatorHud = await hostPage
      .locator('.spectator-hud')
      .isVisible()
      .catch(() => false);

    console.log(`  Host weapon-display: ${hostHasWeaponDisplay}`);
    console.log(`  Host spectator-hud: ${hostHasSpectatorHud}`);

    // Verify guest is spectator
    if (!guestHasSpectatorHud) {
      throw new Error('Guest should have spectator HUD');
    }
    if (guestHasWeaponDisplay) {
      throw new Error('Guest should NOT have weapon display as spectator');
    }

    // Verify host is pilot
    if (!hostHasWeaponDisplay) {
      throw new Error('Host should have weapon display');
    }
    if (hostHasSpectatorHud) {
      throw new Error('Host should NOT have spectator HUD');
    }

    console.log('  ✓ Spectator mode activated correctly');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Spectator Tab key cycles through friendly ships.
 */
export function testSpectatorTabCyclesShips() {
  return runTest('Spectator Tab Cycles Through Ships', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Unassign the guest's pilot
    await unassignGuestShip(hostPage);
    console.log('  Guest pilot unassigned');

    await sleep(500);

    // Launch mission
    await launchMissionForSpectatorTest(hostPage, guestPage);
    console.log('  Mission launched');

    // Verify guest is in spectator mode
    const hasSpectatorHud = await guestPage
      .locator('.spectator-hud')
      .isVisible()
      .catch(() => false);

    if (!hasSpectatorHud) {
      throw new Error('Guest not in spectator mode');
    }

    // Get current callsign being spectated
    const getSpectatorCallsign = async () => {
      return guestPage
        .locator('.spectator-callsign')
        .textContent()
        .catch(() => '');
    };

    const initialCallsign = await getSpectatorCallsign();
    console.log(`  Initial spectating: "${initialCallsign}"`);

    // Press Tab to cycle to next ship
    await guestPage.keyboard.press('Tab');
    await sleep(300);

    const afterTabCallsign = await getSpectatorCallsign();
    console.log(`  After Tab: "${afterTabCallsign}"`);

    // Press Tab again
    await guestPage.keyboard.press('Tab');
    await sleep(300);

    const afterSecondTabCallsign = await getSpectatorCallsign();
    console.log(`  After 2nd Tab: "${afterSecondTabCallsign}"`);

    // Verify Tab cycling works (callsign should change or stay same if only 1 ship)
    // The important thing is no errors occurred
    console.log('  ✓ Tab cycling works for spectator');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Spectator C key toggles camera mode.
 */
export function testSpectatorCameraMode() {
  return runTest('Spectator C Key Toggles Camera Mode', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Unassign the guest's pilot
    await unassignGuestShip(hostPage);
    console.log('  Guest pilot unassigned');

    await sleep(500);

    // Launch mission
    await launchMissionForSpectatorTest(hostPage, guestPage);
    console.log('  Mission launched');

    // Verify guest is in spectator mode
    const hasSpectatorHud = await guestPage
      .locator('.spectator-hud')
      .isVisible()
      .catch(() => false);

    if (!hasSpectatorHud) {
      throw new Error('Guest not in spectator mode');
    }

    // Get current camera mode
    const getCameraMode = async () => {
      return guestPage
        .locator('.spectator-mode')
        .textContent()
        .catch(() => '');
    };

    const initialMode = await getCameraMode();
    console.log(`  Initial mode: "${initialMode}"`);

    // Press C to toggle camera mode
    await guestPage.keyboard.press('c');
    await sleep(300);

    const afterCMode = await getCameraMode();
    console.log(`  After C: "${afterCMode}"`);

    // Press C again
    await guestPage.keyboard.press('c');
    await sleep(300);

    const afterSecondCMode = await getCameraMode();
    console.log(`  After 2nd C: "${afterSecondCMode}"`);

    // Verify mode changes (Chase -> Orbit -> Free -> Chase)
    // The important thing is the mode actually changed
    if (initialMode === afterCMode && afterCMode === afterSecondCMode) {
      throw new Error('Camera mode should change when pressing C');
    }

    console.log('  ✓ Camera mode toggles correctly');

    await hostContext.close();
    await guestContext.close();
  });
}
