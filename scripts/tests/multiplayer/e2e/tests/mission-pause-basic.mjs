/**
 * E2E Tests - Mission Pause (Basic Tests)
 *
 * Basic tests for multiplayer mission pause functionality:
 * - Host can pause
 * - Guest can pause
 * - Pause modal shows players panel
 *
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  getPauseReason,
  launchMissionAndWait,
  setupHostAndGuest,
  triggerPause,
  waitForPauseModal,
} from '../helpers/index.mjs';

// =============================================================================
// Test 1: Host Can Pause Mission
// =============================================================================

function testHostCanPauseMission() {
  return runTest('Host Can Pause Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Add console log listener for debugging
    hostPage.on('console', (msg) => {
      if (
        msg.text().includes('[pause') ||
        msg.text().includes('[mission') ||
        msg.text().includes('[mp-pause') ||
        msg.text().includes('[screens')
      ) {
        console.log(`  [HOST CONSOLE] ${msg.text()}`);
      }
    });
    guestPage.on('console', (msg) => {
      if (
        msg.text().includes('[pause') ||
        msg.text().includes('[mission') ||
        msg.text().includes('[mp-pause') ||
        msg.text().includes('[screens')
      ) {
        console.log(`  [GUEST CONSOLE] ${msg.text()}`);
      }
    });

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Small delay to let any pending operations complete
    await new Promise((r) => setTimeout(r, 500));

    // Host presses Escape
    console.log('  About to press Escape on host');
    await triggerPause(hostPage);
    console.log('  Host triggered pause');

    // Verify both see pause modal
    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Guest sees pause modal');

    // Check pause reason shows host callsign
    const hostReason = await getPauseReason(hostPage);
    const guestReason = await getPauseReason(guestPage);
    console.log(`  Host pause reason: ${hostReason}`);
    console.log(`  Guest pause reason: ${guestReason}`);

    if (!hostReason.toLowerCase().includes('paused')) {
      throw new Error(`Expected pause reason, got: ${hostReason}`);
    }

    // Verify HUD is still visible (game paused, not closed)
    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('HUD should still be visible during pause');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 2: Guest Can Pause Mission
// =============================================================================

function testGuestCanPauseMission() {
  return runTest('Guest Can Pause Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Guest presses Escape
    await triggerPause(guestPage);
    console.log('  Guest triggered pause');

    // Verify both see pause modal
    await waitForPauseModal(hostPage, TIMEOUTS.sync);
    console.log('  Host sees pause modal');

    // Both should see the pause reason
    const hostReason = await getPauseReason(hostPage);
    const guestReason = await getPauseReason(guestPage);
    console.log(`  Pause reason on host: ${hostReason}`);
    console.log(`  Pause reason on guest: ${guestReason}`);

    if (!guestReason.toLowerCase().includes('paused')) {
      throw new Error(`Expected pause reason, got: ${guestReason}`);
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 3: Pause Modal Shows Players Panel
// =============================================================================

function testPauseModalShowsPlayersPanel() {
  return runTest('Pause Modal Shows Players Panel', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await triggerPause(hostPage);
    console.log('  Pause triggered');

    // Check players panel visible
    const hasPlayersPanel = await hostPage
      .locator('.pause-players-panel, .players-panel')
      .isVisible()
      .catch(() => false);
    console.log(`  Players panel visible: ${hasPlayersPanel}`);

    // Check for player rows
    const playerRowCount = await hostPage
      .locator('.pause-player-row, .player-row')
      .count();
    console.log(`  Player row count: ${playerRowCount}`);

    if (playerRowCount < 2) {
      throw new Error(`Expected at least 2 player rows, got ${playerRowCount}`);
    }

    // Check for host indicator
    const hasHostIndicator = await hostPage
      .locator('.host-indicator')
      .first()
      .isVisible()
      .catch(() => false);
    console.log(`  Host indicator visible: ${hasHostIndicator}`);

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Host can pause mission', fn: testHostCanPauseMission },
  { name: 'Guest can pause mission', fn: testGuestCanPauseMission },
  {
    name: 'Pause modal shows players panel',
    fn: testPauseModalShowsPlayersPanel,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Pause Tests (Basic)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
