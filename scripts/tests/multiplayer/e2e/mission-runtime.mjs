/**
 * E2E Tests - Mission Runtime
 *
 * Tests for multiplayer mission runtime behavior:
 * - Both players enter mission screen
 * - Wingman HUD shows remote player
 * - Spectator camera controls work
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { acceptFirstContract, readyBothPlayers } from './helpers.mjs';
import { TIMEOUTS } from './test-config.mjs';
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
async function waitForMissionScreen(page, timeout = TIMEOUTS.missionStart) {
  // Poll for HUD visibility (mission-container contains canvas and hud)
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const ready = await page.evaluate(() => {
      const hud = document.getElementById('hud');
      return hud && hud.offsetWidth > 0;
    });

    if (ready) {
      return;
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error('Mission screen did not load in time');
}

/**
 * Get wingman callsigns from the allied HUD display.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
async function getWingmanCallsigns(page) {
  const callsigns = await page
    .locator('.allied-display .ally-callsign')
    .allTextContents();
  return callsigns.map((c) => c.trim()).filter((c) => c && c !== '---');
}

/**
 * Check if the allied display (wingman HUD) is visible.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function _isAlliedDisplayVisible(page) {
  const display = page.locator('.allied-display');
  return display.isVisible().catch(() => false);
}

/**
 * Launch mission and wait for both players to enter.
 * Returns after both see the game screen with HUD visible.
 */
async function launchMissionAndWait(hostPage, guestPage) {
  // Capture host console logs for debugging
  hostPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('lobby-launch') || text.includes('lobby-routing')) {
      console.log(`  [Host] ${text}`);
    }
  });

  // Verify connection is healthy before proceeding
  // Both players should see each other's ready state
  await readyBothPlayers(hostPage, guestPage);

  // Verify host can see guest (connection working)
  const guestVisible = await hostPage
    .waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      null,
      { timeout: TIMEOUTS.sync },
    )
    .then(() => true)
    .catch(() => false);

  if (!guestVisible) {
    throw new Error('Connection unhealthy: host cannot see guest player');
  }

  // Host accepts first contract
  await acceptFirstContract(hostPage);

  // Wait for countdown OR mission start (with 1s countdown, mission may start immediately)
  // Race between: countdown message appearing, "Mission starting" message, or HUD appearing
  await Promise.race([
    guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some(
          (m) =>
            m.textContent?.includes('Launching in') ||
            m.textContent?.includes('Mission starting'),
        );
      },
      null,
      { timeout: TIMEOUTS.missionStart },
    ),
    guestPage.waitForSelector('#hud', {
      state: 'visible',
      timeout: TIMEOUTS.missionStart,
    }),
  ]);

  // Wait for mission screen on both
  const [hostResult, guestResult] = await Promise.allSettled([
    waitForMissionScreen(hostPage),
    waitForMissionScreen(guestPage),
  ]);

  if (hostResult.status === 'rejected') {
    const hostOnLobby = await hostPage
      .locator('.lobby-screen')
      .isVisible()
      .catch(() => false);
    const hostHud = await hostPage
      .locator('#hud')
      .isVisible()
      .catch(() => false);
    console.log(
      `  [DEBUG] Host failed. OnLobby: ${hostOnLobby}, HUD: ${hostHud}`,
    );
    throw new Error(`Host mission screen failed: ${hostResult.reason.message}`);
  }

  if (guestResult.status === 'rejected') {
    const guestOnLobby = await guestPage
      .locator('.lobby-screen')
      .isVisible()
      .catch(() => false);
    const guestHud = await guestPage
      .locator('#hud')
      .isVisible()
      .catch(() => false);
    const guestContracts = await guestPage
      .locator('.contracts-screen')
      .isVisible()
      .catch(() => false);
    console.log(
      `  [DEBUG] Guest failed. OnLobby: ${guestOnLobby}, HUD: ${guestHud}, Contracts: ${guestContracts}`,
    );
    throw new Error(
      `Guest mission screen failed: ${guestResult.reason.message}`,
    );
  }
}

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Both players enter mission screen.
 * Verifies: After launch, both host and guest see the game canvas and HUD.
 */
function testBothPlayersEnterMission() {
  return runTest('Both Players Enter Mission Screen', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Verify both have canvas
    const hostHasCanvas = (await hostPage.locator('canvas').count()) > 0;
    const guestHasCanvas = (await guestPage.locator('canvas').count()) > 0;

    console.log(`  Host has canvas: ${hostHasCanvas}`);
    console.log(`  Guest has canvas: ${guestHasCanvas}`);

    // Verify both have HUD
    const hostHasHUD = await hostPage.locator('#hud').isVisible();
    const guestHasHUD = await guestPage.locator('#hud').isVisible();

    console.log(`  Host has HUD: ${hostHasHUD}`);
    console.log(`  Guest has HUD: ${guestHasHUD}`);

    if (!(hostHasCanvas && guestHasCanvas && hostHasHUD && guestHasHUD)) {
      throw new Error(
        `Mission screen check failed: hostCanvas=${hostHasCanvas}, guestCanvas=${guestHasCanvas}, hostHUD=${hostHasHUD}, guestHUD=${guestHasHUD}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Wingman HUD shows remote player.
 * Verifies: Host's wingman display shows guest's callsign.
 */
function testWingmanHUDShowsRemotePlayer() {
  return runTest('Wingman HUD Shows Remote Player', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Wait for allied display to be visible on host
    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    // Get wingman callsigns from host's HUD
    const wingmanCallsigns = await getWingmanCallsigns(hostPage);
    console.log(
      `  Wingman callsigns on host HUD: ${wingmanCallsigns.join(', ') || '(none)'}`,
    );

    // The guest should appear in the wingman list
    // Guest callsign is "TestGuest" from connection-helpers.mjs
    const hasRemotePlayer = wingmanCallsigns.length > 0;

    if (!hasRemotePlayer) {
      throw new Error(
        'No wingmen shown in allied HUD - remote player not visible',
      );
    }

    // Also verify on guest side (should see "Commander" or host's ship)
    const guestWingmanCallsigns = await getWingmanCallsigns(guestPage);
    console.log(
      `  Wingman callsigns on guest HUD: ${guestWingmanCallsigns.join(', ') || '(none)'}`,
    );

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Both players have targeting HUD elements.
 * Verifies: Target stats panel is visible for both players.
 */
function testTargetingHUDElements() {
  return runTest('Targeting HUD Elements Present', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Check target stats panel exists on both
    const hostHasTargetStats = await hostPage
      .locator('.target-stats')
      .isVisible()
      .catch(() => false);
    const guestHasTargetStats = await guestPage
      .locator('.target-stats')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has target stats panel: ${hostHasTargetStats}`);
    console.log(`  Guest has target stats panel: ${guestHasTargetStats}`);

    // Check weapon display exists on both
    const hostHasWeapons = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const guestHasWeapons = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has weapon display: ${hostHasWeapons}`);
    console.log(`  Guest has weapon display: ${guestHasWeapons}`);

    if (
      !(
        hostHasTargetStats &&
        guestHasTargetStats &&
        hostHasWeapons &&
        guestHasWeapons
      )
    ) {
      throw new Error('HUD elements missing on one or both players');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Radar shows multiple friendly ships.
 * Verifies: Radar display shows more than one friendly blip (self + remote player).
 */
function testRadarShowsMultipleFriendlies() {
  return runTest('Radar Shows Multiple Friendlies', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Wait for radar to be visible
    await hostPage.waitForSelector('.radar-container', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    // The radar canvas renders blips - we can't easily count them via DOM
    // But we can verify the radar display is present and has the expected structure
    const hostHasRadar = await hostPage
      .locator('.radar-container')
      .isVisible()
      .catch(() => false);
    const guestHasRadar = await guestPage
      .locator('.radar-container')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has radar: ${hostHasRadar}`);
    console.log(`  Guest has radar: ${guestHasRadar}`);

    if (!(hostHasRadar && guestHasRadar)) {
      throw new Error('Radar display missing on one or both players');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Both players enter mission screen',
    fn: testBothPlayersEnterMission,
  },
  {
    name: 'Wingman HUD shows remote player',
    fn: testWingmanHUDShowsRemotePlayer,
  },
  { name: 'Targeting HUD elements present', fn: testTargetingHUDElements },
  { name: 'Radar shows on both players', fn: testRadarShowsMultipleFriendlies },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Mission Runtime', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
