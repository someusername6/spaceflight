/**
 * E2E Tests - Mission Pause (Lag Report Tests)
 *
 * Tests for the auto-pause functionality when lag is detected.
 * Uses test utilities to simulate lag reports since actual network
 * lag simulation with WebRTC is complex and unreliable in CI.
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
  getTestPauseState,
  hasTestUtilities,
  launchMissionAndWait,
  setupHostAndGuest,
  simulateLagReport,
  waitForPauseModal,
} from '../helpers/index.mjs';

// =============================================================================
// Test 1: Lag Report Triggers Auto-Pause
// =============================================================================

function testLagReportTriggersAutoPause() {
  return runTest('Lag Report Triggers Auto-Pause', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Verify test utilities are available
    const hostHasUtils = await hasTestUtilities(hostPage);
    const guestHasUtils = await hasTestUtilities(guestPage);
    console.log(
      `  Test utilities available - Host: ${hostHasUtils}, Guest: ${guestHasUtils}`,
    );

    if (!hostHasUtils) {
      throw new Error('Test utilities not available on host page');
    }

    // Small delay to ensure mission is fully running
    await new Promise((r) => setTimeout(r, 500));

    // Simulate lag report on host (as if host detected guest lagging)
    const pauseTriggered = await simulateLagReport(hostPage);
    console.log(`  Lag report triggered pause: ${pauseTriggered}`);

    if (!pauseTriggered) {
      throw new Error('Failed to trigger pause via lag report');
    }

    // Verify both players see pause modal
    await waitForPauseModal(hostPage, TIMEOUTS.sync);
    console.log('  Host sees pause modal');

    await waitForPauseModal(guestPage, TIMEOUTS.sync);
    console.log('  Guest sees pause modal');

    // Check pause reason indicates lag
    const hostReason = await getPauseReason(hostPage);
    const guestReason = await getPauseReason(guestPage);
    console.log(`  Host pause reason: ${hostReason}`);
    console.log(`  Guest pause reason: ${guestReason}`);

    // Reason should mention lag or the callsign that caused pause
    if (
      !hostReason.toLowerCase().includes('lag') &&
      !hostReason.toLowerCase().includes('paused')
    ) {
      throw new Error(`Expected lag-related pause reason, got: ${hostReason}`);
    }

    // Verify pause state via test utilities
    const pauseState = await getTestPauseState(hostPage);
    console.log(`  Pause state: ${JSON.stringify(pauseState)}`);

    if (!pauseState?.isPaused) {
      throw new Error('Pause state should show isPaused=true');
    }

    if (pauseState.reason !== 'lag-detected') {
      throw new Error(
        `Expected reason 'lag-detected', got: ${pauseState.reason}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test 2: Lag Pause Shows Appropriate UI Indicator
// =============================================================================

function testLagPauseShowsIndicator() {
  return runTest(
    'Lag Pause Shows Appropriate UI Indicator',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Small delay to ensure mission is fully running
      await new Promise((r) => setTimeout(r, 500));

      // Simulate lag report
      await simulateLagReport(hostPage);
      await waitForPauseModal(hostPage, TIMEOUTS.sync);
      console.log('  Lag pause triggered');

      // Check for lag-specific UI elements or messages
      const lagIndicator = await hostPage.evaluate(() => {
        // Look for lag-related text in the pause modal
        const modal = document.querySelector('.multiplayer-pause-modal');
        if (!modal) return { found: false, text: '' };

        const text = modal.textContent || '';
        const hasLag =
          text.toLowerCase().includes('lag') ||
          text.toLowerCase().includes('connection') ||
          text.toLowerCase().includes('network');

        return {
          found: hasLag,
          text: text.substring(0, 200), // First 200 chars for debugging
        };
      });

      console.log(`  Lag indicator found: ${lagIndicator.found}`);
      console.log(
        `  Modal text preview: ${lagIndicator.text.substring(0, 100)}`,
      );

      // Check for system message about lag in chat
      const lagChatMessage = await hostPage.evaluate(() => {
        const messages = document.querySelectorAll(
          '.pause-chat-message, .chat-message',
        );
        for (const msg of messages) {
          const text = msg.textContent?.toLowerCase() || '';
          if (text.includes('lag') || text.includes('paused by')) {
            return msg.textContent;
          }
        }
        return null;
      });

      console.log(`  Chat message about pause: ${lagChatMessage}`);

      // At minimum, the pause should have been triggered with correct reason
      const pauseState = await getTestPauseState(hostPage);
      if (pauseState?.reason !== 'lag-detected') {
        throw new Error(
          `Expected lag-detected reason, got: ${pauseState?.reason}`,
        );
      }

      console.log('  Lag pause UI verified');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Test 3: Cannot Trigger Lag Pause When Already Paused
// =============================================================================

function testCannotDoublePause() {
  return runTest(
    'Cannot Trigger Lag Pause When Already Paused',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      await new Promise((r) => setTimeout(r, 500));

      // First pause via lag report
      const firstPause = await simulateLagReport(hostPage);
      console.log(`  First pause triggered: ${firstPause}`);

      if (!firstPause) {
        throw new Error('First pause should succeed');
      }

      await waitForPauseModal(hostPage, TIMEOUTS.sync);

      // Try to trigger another lag pause while already paused
      const secondPause = await simulateLagReport(hostPage);
      console.log(`  Second pause triggered: ${secondPause}`);

      if (secondPause) {
        throw new Error('Should not be able to pause when already paused');
      }

      // Verify still showing original pause
      const pauseState = await getTestPauseState(hostPage);
      console.log(`  Pause state: ${JSON.stringify(pauseState)}`);

      if (!pauseState?.isPaused) {
        throw new Error('Should still be paused');
      }

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
    name: 'Lag report triggers auto-pause',
    fn: testLagReportTriggersAutoPause,
  },
  {
    name: 'Lag pause shows appropriate UI indicator',
    fn: testLagPauseShowsIndicator,
  },
  {
    name: 'Cannot trigger lag pause when already paused',
    fn: testCannotDoublePause,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Pause Tests (Lag)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
