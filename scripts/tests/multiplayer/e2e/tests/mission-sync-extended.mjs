/**
 * E2E Tests - Mission Sync (Extended Gameplay)
 *
 * Tests for extended gameplay synchronization.
 *
 * Total: 1 test
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  holdKey,
  launchMissionAndWait,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Extended Gameplay Test
// =============================================================================

function testExtendedGameplayRemainsSynced() {
  return runTest('Extended Gameplay Remains Synced', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await Promise.all([
      hostPage.waitForSelector('.allied-display', {
        state: 'visible',
        timeout: TIMEOUTS.ui,
      }),
      guestPage.waitForSelector('.allied-display', {
        state: 'visible',
        timeout: TIMEOUTS.ui,
      }),
    ]);

    console.log('  Running extended gameplay test (5 seconds)...');

    // Simulate varied gameplay over 5 seconds
    const intervals = [];

    // Host does periodic actions
    intervals.push(
      setInterval(async () => {
        try {
          await hostPage.keyboard.press('Tab'); // Cycle target
        } catch {
          // Page may be closed
        }
      }, 800),
    );

    intervals.push(
      setInterval(async () => {
        try {
          await holdKey(hostPage, 'w', 100);
        } catch {
          // Page may be closed
        }
      }, 500),
    );

    // Guest does periodic actions
    intervals.push(
      setInterval(async () => {
        try {
          await guestPage.keyboard.press('Tab');
        } catch {
          // Page may be closed
        }
      }, 900),
    );

    intervals.push(
      setInterval(async () => {
        try {
          await holdKey(guestPage, 'd', 80);
        } catch {
          // Page may be closed
        }
      }, 600),
    );

    // Run for 5 seconds
    await new Promise((r) => setTimeout(r, 5000));

    // Clean up intervals
    for (const interval of intervals) {
      clearInterval(interval);
    }

    // Small delay to let any pending actions complete
    await new Promise((r) => setTimeout(r, 500));

    // Verify game state
    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    console.log(
      `  After 5s - Host HUD: ${hostHUDVisible}, Guest HUD: ${guestHUDVisible}`,
    );

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game stopped during extended gameplay');
    }

    // Check for desync warnings
    const hostHasDesync = await hostPage
      .locator('.desync-warning, .sync-error')
      .isVisible()
      .catch(() => false);
    const guestHasDesync = await guestPage
      .locator('.desync-warning, .sync-error')
      .isVisible()
      .catch(() => false);

    console.log(
      `  Desync warnings - Host: ${hostHasDesync}, Guest: ${guestHasDesync}`,
    );

    if (hostHasDesync || guestHasDesync) {
      throw new Error('Desync detected during extended gameplay');
    }

    console.log('  Extended gameplay remained synchronized');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Extended gameplay remains synced',
    fn: testExtendedGameplayRemainsSynced,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Sync Tests (Extended)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
