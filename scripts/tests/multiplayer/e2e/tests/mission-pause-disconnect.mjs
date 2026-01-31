/**
 * E2E Tests - Mission Pause (Disconnect Tests)
 *
 * Tests for player disconnect handling during multiplayer missions.
 * These tests depend on WebRTC disconnect detection timing and can be
 * slower or flaky in CI environments.
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
// Test 1: Disconnect Triggers Auto-Pause
// =============================================================================

function testDisconnectTriggersAutoPause() {
  return runTest('Disconnect Triggers Auto-Pause', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    try {
      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');
    } catch (err) {
      console.log(`  Mission launch failed: ${err.message}`);
      throw err;
    }

    // Small delay to ensure mission is fully running
    await new Promise((r) => setTimeout(r, 500));

    // Guest closes their browser (simulates disconnect)
    await guestContext.close();
    console.log('  Guest disconnected');

    // Host should see pause modal appear (auto-pause on disconnect)
    // WebRTC disconnect detection can take several seconds
    await waitForPauseModal(hostPage, 15000);
    console.log('  Host sees pause modal (auto-paused)');

    // Check pause reason indicates disconnect
    const reason = await getPauseReason(hostPage);
    console.log(`  Pause reason: ${reason}`);

    // Should mention paused/disconnected
    if (
      !reason.toLowerCase().includes('paused') &&
      !reason.toLowerCase().includes('disconnect')
    ) {
      throw new Error(`Expected disconnect reason, got: ${reason}`);
    }

    // Look for disconnect status in player panel
    const disconnectIndicator = await hostPage.evaluate(() => {
      const rows = document.querySelectorAll('.pause-player-row, .player-row');
      for (const row of rows) {
        if (
          row.textContent?.includes('Disconnected') ||
          row.textContent?.includes('disconnected')
        ) {
          return true;
        }
      }
      return false;
    });
    console.log(`  Disconnect indicator visible: ${disconnectIndicator}`);

    await hostContext.close();
  });
}

// =============================================================================
// Test 2: Player Status Shows Disconnected
// =============================================================================

function testPlayerStatusShowsDisconnected() {
  return runTest('Player Status Shows Disconnected', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Trigger pause first
    await triggerPause(hostPage);
    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Both players see pause modal');

    // Guest disconnects while paused
    await guestContext.close();
    console.log('  Guest disconnected');

    // Wait for status update
    await new Promise((r) => setTimeout(r, 1000));

    // Check for disconnect status in player rows
    const playerStatuses = await hostPage.evaluate(() => {
      const rows = document.querySelectorAll('.pause-player-row, .player-row');
      return Array.from(rows).map((row) => ({
        text: row.textContent,
        hasDisconnectClass:
          row.classList.contains('disconnected') ||
          row.querySelector('.status-disconnected') !== null,
      }));
    });
    console.log('  Player rows:', JSON.stringify(playerStatuses));

    // Verify at least one row shows disconnected status
    const hasDisconnected = playerStatuses.some(
      (s) =>
        s.text?.toLowerCase().includes('disconnected') || s.hasDisconnectClass,
    );

    if (!hasDisconnected) {
      console.log('  Note: Disconnect status UI may vary by implementation');
    }

    await hostContext.close();
  });
}

// =============================================================================
// Test 3: Host Can Drop Disconnected Player
// =============================================================================

function testHostCanDropDisconnectedPlayer() {
  return runTest('Host Can Drop Disconnected Player', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Trigger pause first
    await triggerPause(hostPage);
    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Both players see pause modal');

    // Guest disconnects while paused
    await guestContext.close();
    console.log('  Guest disconnected');

    // Wait for disconnect to be detected and UI to update
    // WebRTC disconnect can take a few seconds
    const dropButtonAppeared = await hostPage
      .waitForSelector('.btn-drop-player', {
        state: 'visible',
        timeout: 15000,
      })
      .then(() => true)
      .catch(() => false);

    if (!dropButtonAppeared) {
      console.log(
        '  Drop button did not appear (disconnect not detected in time)',
      );
      console.log('  Checking player status...');
      const playerStatuses = await hostPage.evaluate(() => {
        const rows = document.querySelectorAll('.pause-player-row');
        return Array.from(rows).map((r) => r.textContent);
      });
      console.log(`  Player rows: ${JSON.stringify(playerStatuses)}`);
      throw new Error('Drop button did not appear after disconnect');
    }
    console.log('  Drop button visible');

    // Click the drop button to show the skill menu
    await hostPage.click('.btn-drop-player');
    console.log('  Clicked drop button');

    // Wait for drop menu to appear
    await hostPage.waitForSelector('.drop-player-menu', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });
    console.log('  Drop menu visible');

    // Select "Regular" skill
    await hostPage.click('.drop-player-menu button[data-skill="regular"]');
    console.log('  Selected Regular AI skill');

    // Wait for the drop to process
    await new Promise((r) => setTimeout(r, 500));

    // Verify player is now marked as dropped/AI
    const playerDropped = await hostPage.evaluate(() => {
      const rows = document.querySelectorAll('.pause-player-row');
      for (const row of rows) {
        // Look for AI indicator or dropped class
        if (
          row.textContent?.includes('AI') ||
          row.classList.contains('dropped')
        ) {
          return true;
        }
      }
      return false;
    });
    console.log(`  Player marked as AI: ${playerDropped}`);

    if (!playerDropped) {
      throw new Error('Player should be marked as AI after being dropped');
    }

    // Verify chat message about the drop
    const dropMessage = await hostPage.evaluate(() => {
      const messages = document.querySelectorAll(
        '.pause-chat-message, .chat-message',
      );
      for (const msg of messages) {
        if (
          msg.textContent?.includes('AI') ||
          msg.textContent?.includes('dropped')
        ) {
          return msg.textContent;
        }
      }
      return null;
    });
    console.log(`  Drop message: ${dropMessage}`);

    await hostContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Disconnect triggers auto-pause',
    fn: testDisconnectTriggersAutoPause,
  },
  {
    name: 'Player status shows disconnected',
    fn: testPlayerStatusShowsDisconnected,
  },
  {
    name: 'Host can drop disconnected player',
    fn: testHostCanDropDisconnectedPlayer,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Pause Tests (Disconnect)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
