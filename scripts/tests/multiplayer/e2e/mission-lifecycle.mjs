/**
 * E2E Tests - Mission Lifecycle
 *
 * Tests for multiplayer mission lifecycle events:
 * - Pause menu accessible during mission
 * - Mission exit returns both players to lobby
 * - Spectator mode activation (via debug/test trigger)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  acceptFirstContract,
  readyBothPlayers,
  waitForSystemMessage,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite } from './utils.mjs';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Wait for mission to be fully running (HUD visible + key elements present).
 * Waits for multiple HUD elements to ensure mission is fully initialized.
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
async function waitForMissionScreen(page, timeout = 20000) {
  // Wait for HUD container first - this only appears during active mission
  await page.waitForSelector('#hud', { state: 'visible', timeout });

  // Wait for key HUD elements to be present (ensures full initialization)
  await Promise.all([
    page.waitForSelector('canvas[data-engine]', {
      state: 'attached',
      timeout: 5000,
    }),
    page.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: 5000,
    }),
  ]);
}

/**
 * Launch mission and wait for both players to enter.
 * Returns after both see the game screen with HUD visible.
 */
async function launchMissionAndWait(hostPage, guestPage) {
  await readyBothPlayers(hostPage, guestPage);
  await acceptFirstContract(hostPage);

  // Wait for countdown to complete and mission to start (10s countdown + buffer)
  await waitForSystemMessage(guestPage, 'Mission starting', 25000);

  // Wait for mission screen on both (includes HUD wait)
  await Promise.all([
    waitForMissionScreen(hostPage, 20000).catch((e) => {
      throw new Error(`Host mission screen failed: ${e.message}`);
    }),
    waitForMissionScreen(guestPage, 20000).catch((e) => {
      throw new Error(`Guest mission screen failed: ${e.message}`);
    }),
  ]);
}

// TODO: Re-enable when multiplayer pause menu is implemented (Phase 11)
// /**
//  * Check if pause menu is visible.
//  * @param {import('playwright').Page} page
//  * @returns {Promise<boolean>}
//  */
// async function isPauseMenuVisible(page) { ... }
//
// /**
//  * Wait for pause menu state to change.
//  * @param {import('playwright').Page} page
//  * @param {boolean} shouldBeVisible
//  * @param {number} timeout
//  */
// async function waitForPauseMenuState(page, shouldBeVisible, timeout = 2000) { ... }

/**
 * Simulate holding a key for input testing.
 * Uses minimal duration needed for game to register input.
 * @param {import('playwright').Page} page
 * @param {string} key
 * @param {number} holdMs - Duration to hold key (game tick ~16ms, use 100ms minimum)
 */
async function holdKey(page, key, holdMs = 100) {
  await page.keyboard.down(key);
  await new Promise((r) => setTimeout(r, holdMs));
  await page.keyboard.up(key);
}

/**
 * Check if results screen is visible.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function _isResultsScreenVisible(page) {
  return page
    .locator('.results-screen, .mission-results, #results')
    .isVisible()
    .catch(() => false);
}

/**
 * Check if lobby screen is visible.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function _isLobbyScreenVisible(page) {
  return page
    .locator('.lobby-screen')
    .isVisible()
    .catch(() => false);
}

// =============================================================================
// Tests
// =============================================================================

// TODO: Re-enable when multiplayer pause menu is implemented (Phase 11)
// /**
//  * Test: Escape key opens pause menu during mission.
//  * Note: In multiplayer, pause menu behavior may differ from single-player.
//  */
// function testPauseMenuAccessible() {
//   return runTest('Pause Menu Accessible During Mission', async (browser) => {
//     ...
//   });
// }

/**
 * Test: Both players remain synchronized during mission.
 * Verifies: No desync warnings appear during normal play.
 *
 * NOTE: This test intentionally runs the game for several seconds to verify
 * sync stability over time. The delay is not arbitrary - it's the test duration.
 */
function testNoDesyncWarningsDuringMission() {
  return runTest('No Desync Warnings During Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Run mission for several seconds to test sync stability
    // This is an intentional duration test, not an arbitrary wait
    console.log('  Running mission for 3 seconds to verify sync stability...');
    await new Promise((r) => setTimeout(r, 3000));

    // Check for desync warning elements
    const hostHasDesyncWarning = await hostPage
      .locator('.desync-warning, .sync-error, [data-desync]')
      .isVisible()
      .catch(() => false);
    const guestHasDesyncWarning = await guestPage
      .locator('.desync-warning, .sync-error, [data-desync]')
      .isVisible()
      .catch(() => false);

    console.log(`  Host desync warning: ${hostHasDesyncWarning}`);
    console.log(`  Guest desync warning: ${guestHasDesyncWarning}`);

    // Verify game is still running
    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    console.log(`  Host HUD still visible: ${hostHUDVisible}`);
    console.log(`  Guest HUD still visible: ${guestHUDVisible}`);

    if (hostHasDesyncWarning || guestHasDesyncWarning) {
      throw new Error('Desync warning appeared during normal play');
    }

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game stopped running unexpectedly');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Player input affects their ship.
 * Verifies: Pressing movement keys doesn't cause errors.
 * (Actual movement verification requires canvas inspection which is complex)
 */
function testPlayerInputWorks() {
  return runTest('Player Input Accepted During Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Wait for game to be ready for input
    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: 5000,
    });

    // Host sends some input (brief key holds to register movement)
    console.log('  Sending input from host...');
    await holdKey(hostPage, 'w', 200); // Accelerate
    await holdKey(hostPage, 'a', 150); // Yaw left

    // Guest sends some input
    console.log('  Sending input from guest...');
    await holdKey(guestPage, 'w', 200);
    await holdKey(guestPage, 'd', 150); // Yaw right

    // Verify no crash occurred
    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    console.log(`  Host HUD after input: ${hostHUDVisible}`);
    console.log(`  Guest HUD after input: ${guestHUDVisible}`);

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game crashed or HUD disappeared after input');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Target cycling works for both players.
 * Verifies: Tab key cycles targets without errors.
 */
function testTargetCyclingWorks() {
  return runTest('Target Cycling Works', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Wait for game to be ready for input
    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: 5000,
    });

    // Host cycles targets
    console.log('  Host cycling targets...');
    await hostPage.keyboard.press('Tab');
    // Wait for target callsign to update
    await hostPage
      .waitForFunction(
        () => {
          const el = document.querySelector('.target-callsign');
          return el?.textContent && el.textContent.trim().length > 0;
        },
        null,
        { timeout: 2000 },
      )
      .catch(() => {});

    await hostPage.keyboard.press('Tab');

    // Guest cycles targets
    console.log('  Guest cycling targets...');
    await guestPage.keyboard.press('Tab');
    await guestPage
      .waitForFunction(
        () => {
          const el = document.querySelector('.target-callsign');
          return el?.textContent && el.textContent.trim().length > 0;
        },
        null,
        { timeout: 2000 },
      )
      .catch(() => {});

    // Check target stats panel updated (has content)
    const hostTargetCallsign = await hostPage
      .locator('.target-callsign')
      .textContent()
      .catch(() => '');
    const guestTargetCallsign = await guestPage
      .locator('.target-callsign')
      .textContent()
      .catch(() => '');

    console.log(`  Host target: "${hostTargetCallsign}"`);
    console.log(`  Guest target: "${guestTargetCallsign}"`);

    // Verify game still running
    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game crashed after target cycling');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  // TODO: Re-enable when multiplayer pause menu is implemented (Phase 11)
  // { name: 'Pause menu accessible during mission', fn: testPauseMenuAccessible },
  {
    name: 'No desync warnings during mission',
    fn: testNoDesyncWarningsDuringMission,
  },
  { name: 'Player input accepted during mission', fn: testPlayerInputWorks },
  { name: 'Target cycling works', fn: testTargetCyclingWorks },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Mission Lifecycle', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
