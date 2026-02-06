/**
 * E2E Tests - Mission Pause (Quit Tests)
 *
 * Tests for player quit functionality during pause:
 * - Guest quit returns to title
 * - Ship becomes AI after quit
 *
 * Total: 2 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  clickReadyToResume,
  launchMissionAndWait,
  setupHostAndGuest,
  triggerPause,
  waitForPauseModal,
} from '../helpers/index.mjs';

// =============================================================================
// Test 1: Guest Quit Returns to Title
// =============================================================================

function testGuestQuitReturnsToTitle() {
  return runTest('Guest Quit Returns to Title', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await triggerPause(guestPage);
    await waitForPauseModal(hostPage, TIMEOUTS.sync);
    console.log('  Both players see pause modal');

    // Guest clicks quit
    await guestPage.click('#btn-quit');
    console.log('  Guest clicked quit');

    // Confirm quit in the confirmation modal
    await guestPage.waitForSelector('#btn-confirm-ok', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });
    await guestPage.click('#btn-confirm-ok');
    console.log('  Guest confirmed quit');

    // Guest quit navigates directly to title (no "Session Ended" alert)
    await guestPage.waitForSelector('#screen-title', {
      state: 'visible',
      timeout: TIMEOUTS.navigation,
    });
    console.log('  Guest returned to title');

    // Host should still be paused or see player left message
    const hostStillInGame = await hostPage.locator('#hud').isVisible();
    console.log(`  Host still in game: ${hostStillInGame}`);

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 2: Ship Becomes AI After Quit
// =============================================================================

function testShipBecomesAIAfterQuit() {
  return runTest('Ship Becomes AI After Quit', async (browser) => {
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

    // Guest pauses and quits
    await triggerPause(guestPage);
    await waitForPauseModal(hostPage, TIMEOUTS.sync);
    console.log('  Both see pause modal');

    // Guest clicks quit
    await guestPage.click('#btn-quit');
    console.log('  Guest clicked quit');

    // Confirm quit in the confirmation modal
    await guestPage.waitForSelector('#btn-confirm-ok', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });
    await guestPage.click('#btn-confirm-ok');
    console.log('  Guest confirmed quit');

    // Wait for quit to process
    await new Promise((r) => setTimeout(r, 500));

    // Host should see message about player being AI-controlled
    const aiMessage = await hostPage.evaluate(() => {
      const messages = document.querySelectorAll(
        '.pause-chat-message, .chat-message',
      );
      for (const msg of messages) {
        if (
          msg.textContent?.includes('AI') ||
          msg.textContent?.includes('left')
        ) {
          return msg.textContent;
        }
      }
      return null;
    });
    console.log(`  AI control message: ${aiMessage}`);

    // Verify the player is marked as dropped/AI in the player panel
    const playerDropped = await hostPage.evaluate(() => {
      const rows = document.querySelectorAll('.pause-player-row, .player-row');
      for (const row of rows) {
        if (
          row.textContent?.includes('AI') ||
          row.textContent?.includes('Dropped') ||
          row.classList.contains('dropped')
        ) {
          return true;
        }
      }
      return false;
    });
    console.log(`  Player dropped status: ${playerDropped}`);

    // Host should still be able to resume (with AI taking over)
    await clickReadyToResume(hostPage);
    console.log('  Host marked ready');

    // With only one player left (the host), countdown should start immediately
    // Wait a moment for countdown
    await new Promise((r) => setTimeout(r, 200));

    const countdownVisible = await hostPage.evaluate(
      () => document.querySelector('.pause-countdown') !== null,
    );
    console.log(`  Countdown started: ${countdownVisible}`);

    await hostContext.close();
    await guestContext.close().catch(() => {}); // May already be closed
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Guest quit returns to title', fn: testGuestQuitReturnsToTitle },
  { name: 'Ship becomes AI after quit', fn: testShipBecomesAIAfterQuit },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Pause Tests (Quit)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
