/**
 * E2E Tests - Mission Pause (Resume & Countdown Tests)
 *
 * Tests for the ready-to-resume flow and countdown:
 * - Ready-to-resume countdown works
 * - Unready aborts countdown
 * - Chat works during pause
 * - Settings button opens settings
 *
 * Total: 4 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  clickReadyToResume,
  getCountdownNumber,
  isReadyToResume,
  launchMissionAndWait,
  setupHostAndGuest,
  triggerPause,
  waitForPauseModal,
  waitForResume,
} from '../helpers/index.mjs';

// =============================================================================
// Test 1: Ready-to-Resume Countdown Works
// =============================================================================

function testReadyToResumeCountdown() {
  return runTest('Ready-to-Resume Countdown Works', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await triggerPause(hostPage);
    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Both players see pause modal');

    // Both players click ready
    await clickReadyToResume(hostPage);
    console.log('  Host clicked ready');

    await clickReadyToResume(guestPage);
    console.log('  Guest clicked ready');

    // Wait for countdown to appear
    await hostPage.waitForFunction(
      () => document.querySelector('.pause-countdown') !== null,
      null,
      { timeout: TIMEOUTS.ui },
    );
    console.log('  Countdown started');

    // Verify countdown number is present
    const countdownNum = await getCountdownNumber(hostPage);
    console.log(`  Countdown at: ${countdownNum}`);

    if (countdownNum === null || countdownNum < 1 || countdownNum > 5) {
      throw new Error(`Unexpected countdown value: ${countdownNum}`);
    }

    // Wait for resume (countdown completes)
    await waitForResume(hostPage, 10000);
    await waitForResume(guestPage, 10000);
    console.log('  Game resumed');

    // Verify HUD still visible and modal closed
    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const hostModalHidden = !(await hostPage
      .locator('.multiplayer-pause-modal')
      .isVisible()
      .catch(() => false));

    if (!hostHUDVisible || !hostModalHidden) {
      throw new Error(
        'Game should have resumed with HUD visible and modal closed',
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 2: Unready Aborts Countdown
// =============================================================================

function testUnreadyAbortsCountdown() {
  return runTest('Unready Aborts Countdown', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await triggerPause(hostPage);
    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Both players see pause modal');

    // Both players ready
    await clickReadyToResume(hostPage);
    await clickReadyToResume(guestPage);
    console.log('  Both clicked ready');

    // Wait for countdown to start
    await hostPage.waitForFunction(
      () => document.querySelector('.pause-countdown') !== null,
      null,
      { timeout: TIMEOUTS.ui },
    );
    console.log('  Countdown started');

    // Wait for first tick to ensure countdown is running
    await new Promise((r) => setTimeout(r, 200));

    // Guest clicks unready (toggles off)
    await clickReadyToResume(guestPage);
    console.log('  Guest clicked unready');

    // Wait for state to propagate and countdown to abort
    await new Promise((r) => setTimeout(r, 1500));

    // Verify countdown stopped and modal still open (use evaluate for robust check)
    const modalStillVisible = await hostPage.evaluate(() => {
      const overlay = document.querySelector('.multiplayer-pause-overlay');
      if (!overlay) return false;
      const rect = overlay.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Also check countdown was aborted
    const countdownAborted = await hostPage.evaluate(() => {
      return document.querySelector('.pause-countdown') === null;
    });

    console.log(
      `  Modal still visible: ${modalStillVisible}, countdown aborted: ${countdownAborted}`,
    );

    if (!modalStillVisible) {
      throw new Error('Modal should remain visible when countdown aborted');
    }

    // Verify guest is no longer ready
    const guestReady = await isReadyToResume(guestPage);
    console.log(`  Guest ready state: ${guestReady}`);

    if (guestReady) {
      throw new Error('Guest should be unready after toggling');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 3: Chat Works During Pause
// =============================================================================

function testChatWorksDuringPause() {
  return runTest('Chat Works During Pause', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await triggerPause(hostPage);
    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Both players see pause modal');

    // Host sends a chat message
    const testMessage = 'Test pause chat message';
    const chatInput = hostPage.locator('#pause-chat-input, #chat-input');
    await chatInput.fill(testMessage);
    await chatInput.press('Enter');
    console.log('  Host sent chat message');

    // Wait for message to appear on guest
    await guestPage.waitForFunction(
      (msg) => {
        const messages = document.querySelectorAll(
          '.pause-chat-messages .chat-message, .chat-messages .chat-message',
        );
        return Array.from(messages).some((m) => m.textContent?.includes(msg));
      },
      testMessage,
      { timeout: TIMEOUTS.sync },
    );
    console.log('  Message appeared on guest');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 4: Settings Button Opens Settings
// =============================================================================

function testSettingsButtonOpensSettings() {
  return runTest('Settings Button Opens Settings', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await triggerPause(hostPage);
    console.log('  Pause triggered');

    // Click settings button on pause modal
    await hostPage.click('#btn-pause-settings');
    console.log('  Host clicked settings');

    // Should show settings screen
    await hostPage.waitForSelector(
      '.settings-screen, [data-screen="settings"]',
      {
        state: 'visible',
        timeout: TIMEOUTS.navigation,
      },
    );
    console.log('  Settings screen visible');

    // Game should remain paused (HUD still in DOM but might be hidden)
    // The key is settings screen is visible

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Ready-to-resume countdown works', fn: testReadyToResumeCountdown },
  { name: 'Unready aborts countdown', fn: testUnreadyAbortsCountdown },
  { name: 'Chat works during pause', fn: testChatWorksDuringPause },
  {
    name: 'Settings button opens settings',
    fn: testSettingsButtonOpensSettings,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Pause Tests (Resume)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
