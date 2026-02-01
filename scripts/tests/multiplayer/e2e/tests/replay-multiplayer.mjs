/**
 * E2E Tests - Multiplayer Replay
 *
 * Tests for multiplayer replay recording and playback.
 * Verifies that:
 * - Replays are saved after multiplayer missions
 * - Replays contain data from all players
 * - Replays can be viewed in the replay viewer
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
  clickContinue,
  forceVictory,
  waitForLobbyScreen,
  waitForResultsScreen,
} from '../helpers/debrief.mjs';
import { launchMissionAndWait, setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Replay Test Helpers
// =============================================================================

/**
 * Get the count of saved replays.
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
async function getReplayCount(page) {
  return page.evaluate(async () => {
    if (typeof window.__TEST__?.getReplayCount === 'function') {
      return window.__TEST__.getReplayCount();
    }
    return -1;
  });
}

/**
 * Get the most recent replay and check if it's multiplayer.
 * @param {import('playwright').Page} page
 * @returns {Promise<{isMultiplayer: boolean, playerCount: number, hasInputs: boolean} | null>}
 */
async function getMostRecentReplayInfo(page) {
  return page.evaluate(async () => {
    if (typeof window.__TEST__?.getMostRecentReplay !== 'function') {
      return null;
    }
    const replay = await window.__TEST__.getMostRecentReplay();
    if (!replay) return null;

    const isMultiplayer = replay.isMultiplayer === true;
    const playerCount = isMultiplayer ? (replay.players?.length ?? 0) : 0;
    const hasInputs = isMultiplayer
      ? (replay.playerInputs?.length ?? 0) > 0
      : (replay.inputs?.length ?? 0) > 0;

    return { isMultiplayer, playerCount, hasInputs };
  });
}

// =============================================================================
// Multiplayer Replay Tests
// =============================================================================

function testMultiplayerReplaySaved() {
  return runTest(
    'Multiplayer Replay Is Saved After Mission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      // Get initial replay count
      const initialCount = await getReplayCount(hostPage);
      console.log(`  Initial replay count: ${initialCount}`);

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Give the mission a moment to establish inputs
      await new Promise((r) => setTimeout(r, 1000));

      // Force victory on both pages
      const [hostForced, guestForced] = await Promise.all([
        forceVictory(hostPage),
        forceVictory(guestPage),
      ]);
      console.log(`  Victory forced: host=${hostForced}, guest=${guestForced}`);

      // Wait for results screen
      await Promise.all([
        waitForResultsScreen(hostPage, 60000),
        waitForResultsScreen(guestPage, 60000),
      ]);
      console.log('  Both players see results screen');

      // Wait a moment for replay to be saved
      await new Promise((r) => setTimeout(r, 1000));

      // Check replay was saved
      const finalCount = await getReplayCount(hostPage);
      console.log(`  Final replay count: ${finalCount}`);

      if (finalCount <= initialCount) {
        throw new Error(
          `No new replay saved. Initial: ${initialCount}, Final: ${finalCount}`,
        );
      }

      // Click Continue to return to lobby
      await clickContinue(hostPage);
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Returned to lobby');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testMultiplayerReplayHasAllPlayers() {
  return runTest('Multiplayer Replay Contains All Players', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Play for a moment to generate input data
    await new Promise((r) => setTimeout(r, 1500));

    // Send some inputs from both players
    await hostPage.keyboard.down('w');
    await guestPage.keyboard.down('w');
    await new Promise((r) => setTimeout(r, 200));
    await hostPage.keyboard.up('w');
    await guestPage.keyboard.up('w');

    // Force victory
    await Promise.all([forceVictory(hostPage), forceVictory(guestPage)]);
    console.log('  Victory forced');

    // Wait for results screen
    await Promise.all([
      waitForResultsScreen(hostPage, 60000),
      waitForResultsScreen(guestPage, 60000),
    ]);
    console.log('  Both players see results screen');

    // Wait for replay to be saved
    await new Promise((r) => setTimeout(r, 1000));

    // Check replay info
    const replayInfo = await getMostRecentReplayInfo(hostPage);
    console.log(`  Replay info: ${JSON.stringify(replayInfo)}`);

    if (!replayInfo) {
      throw new Error('Could not get most recent replay');
    }

    if (!replayInfo.isMultiplayer) {
      throw new Error('Replay is not marked as multiplayer');
    }

    if (replayInfo.playerCount !== 2) {
      throw new Error(
        `Expected 2 players in replay, got ${replayInfo.playerCount}`,
      );
    }

    if (!replayInfo.hasInputs) {
      throw new Error('Replay has no input data');
    }

    console.log('  ✓ Replay is multiplayer with 2 players and input data');

    // Return to lobby
    await clickContinue(hostPage);
    await Promise.all([
      waitForLobbyScreen(hostPage),
      waitForLobbyScreen(guestPage),
    ]);

    await hostContext.close();
    await guestContext.close();
  });
}

function testMultiplayerReplayViewable() {
  return runTest('Multiplayer Replay Can Be Viewed', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Play briefly
    await new Promise((r) => setTimeout(r, 1000));

    // Force victory
    await Promise.all([forceVictory(hostPage), forceVictory(guestPage)]);
    console.log('  Victory forced');

    // Wait for results and return to lobby
    await Promise.all([
      waitForResultsScreen(hostPage, 60000),
      waitForResultsScreen(guestPage, 60000),
    ]);
    await clickContinue(hostPage);
    await Promise.all([
      waitForLobbyScreen(hostPage),
      waitForLobbyScreen(guestPage),
    ]);
    console.log('  Returned to lobby');

    // Close guest - we'll view replay from host's session only
    await guestContext.close();

    // Leave lobby to access replays
    await hostPage.waitForSelector('.lobby-screen #btn-back', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });
    await hostPage.click('.lobby-screen #btn-back');

    // Wait for title screen
    await hostPage.waitForSelector('.title-screen', {
      state: 'visible',
      timeout: TIMEOUTS.navigation,
    });
    console.log('  Returned to title screen');

    // Click Replays button
    await hostPage.waitForSelector('#btn-replays', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });
    await hostPage.click('#btn-replays');

    // Wait for replay list
    await hostPage.waitForSelector('.replays-screen', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });
    console.log('  Replay list visible');

    // Wait for replays to load (async operation)
    await hostPage.waitForSelector('.replay-list-item', {
      state: 'visible',
      timeout: 10000,
    });
    console.log('  Replays loaded');

    // Click the first (most recent) replay to select it
    const replayItem = hostPage.locator('.replay-list-item').first();
    await replayItem.click();
    console.log('  Replay selected');

    // Wait for detail panel to load and click Watch button
    await hostPage.waitForSelector('.btn-watch-detail', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('.btn-watch-detail');
    console.log('  Watch button clicked');

    // Wait for replay viewer screen to appear
    await hostPage.waitForSelector('.replay-viewer', {
      state: 'visible',
      timeout: TIMEOUTS.navigation,
    });
    console.log('  Replay viewer screen opened');

    // Wait for replay canvas to appear (the one inside #replay-canvas, not the title background)
    await hostPage.waitForSelector('#replay-canvas canvas', {
      state: 'visible',
      timeout: 15000,
    });
    console.log('  Replay is playing');

    // Verify HUD or replay controls are visible
    const hasReplayUI = await hostPage.evaluate(() => {
      const controls = document.querySelector(
        '.replay-controls, .viewer-controls',
      );
      const timeline = document.querySelector('.timeline, input[type="range"]');
      return !!(controls || timeline);
    });

    if (!hasReplayUI) {
      console.log(
        '  Warning: Replay controls not found, but viewer is running',
      );
    } else {
      console.log('  Replay controls visible');
    }

    await hostContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Multiplayer replay is saved after mission',
    fn: testMultiplayerReplaySaved,
  },
  {
    name: 'Multiplayer replay contains all players',
    fn: testMultiplayerReplayHasAllPlayers,
  },
  {
    name: 'Multiplayer replay can be viewed',
    fn: testMultiplayerReplayViewable,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Multiplayer Replay Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
