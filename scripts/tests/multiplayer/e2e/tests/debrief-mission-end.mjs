/**
 * E2E Tests - Debrief Mission End Scenarios
 *
 * Tests for all 4 mission end scenarios:
 * - Ironman + commander death → game over, session ends
 * - Non-ironman + commander death → results, checkpoint restore, return to lobby
 * - Ironman + defeat (no death) → results, return to lobby
 * - Non-ironman + defeat (no death) → results, return to lobby
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
  clickContinue,
  forceAllHumanPlayersDeath,
  forceDefeat,
  setupHostWithIronmanCampaign,
  waitForLobbyScreen,
} from '../helpers/debrief.mjs';
import {
  joinGuestToLobby,
  launchMissionAndWait,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Mission End Scenario Tests
// =============================================================================

function testIronmanDeathEndsSession() {
  return runTest(
    'Ironman Death Shows Game Over for All Players',
    async (browser) => {
      // Setup host with ironman campaign
      const { hostContext, hostPage, roomCode } =
        await setupHostWithIronmanCampaign(browser);
      console.log('  Host created ironman campaign');

      // Verify ironman mode is enabled
      const isIronman = await hostPage.evaluate(() => {
        return window.__TEST__?.isIronmanCampaign?.() ?? false;
      });
      console.log(`  Ironman mode enabled: ${isIronman}`);

      if (!isIronman) {
        throw new Error('Campaign is not in ironman mode');
      }

      // Join guest
      const { guestContext, guestPage } = await joinGuestToLobby(
        browser,
        roomCode,
      );
      console.log('  Guest joined');

      // Wait for both to see each other
      await Promise.all([
        hostPage.waitForFunction(
          () => document.querySelectorAll('.player-row').length >= 2,
          null,
          { timeout: TIMEOUTS.connection },
        ),
        guestPage.waitForFunction(
          () => document.querySelectorAll('.player-row').length >= 2,
          null,
          { timeout: TIMEOUTS.connection },
        ),
      ]);
      console.log('  Both players in lobby');

      // Launch mission
      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force ALL human player deaths on both players
      // In multiplayer, ALL human players must die for defeat
      const [hostForced, guestForced] = await Promise.all([
        forceAllHumanPlayersDeath(hostPage),
        forceAllHumanPlayersDeath(guestPage),
      ]);
      console.log(
        `  All human deaths forced: host=${hostForced}, guest=${guestForced}`,
      );

      // Wait for BOTH players to see game over screen
      await Promise.all([
        hostPage.waitForSelector('.game-over-screen', {
          state: 'visible',
          timeout: 60000,
        }),
        guestPage.waitForSelector('.game-over-screen', {
          state: 'visible',
          timeout: 60000,
        }),
      ]);
      console.log('  Both players see game over screen');

      // Verify both have debrief section
      const [hostHasDebrief, guestHasDebrief] = await Promise.all([
        hostPage
          .locator('.game-over-debrief')
          .isVisible()
          .catch(() => false),
        guestPage
          .locator('.game-over-debrief')
          .isVisible()
          .catch(() => false),
      ]);
      console.log(
        `  Debrief visible: host=${hostHasDebrief}, guest=${guestHasDebrief}`,
      );

      if (!hostHasDebrief || !guestHasDebrief) {
        throw new Error('Game over screen missing debrief section');
      }

      // Both players click "Start New Campaign" button
      await Promise.all([
        hostPage.click('#btn-restart'),
        guestPage.click('#btn-restart'),
      ]);
      console.log('  Both players clicked Start New Campaign');

      // Wait for both to return to title screen
      await Promise.all([
        hostPage.waitForSelector('.title-screen', {
          state: 'visible',
          timeout: 15000,
        }),
        guestPage.waitForSelector('.title-screen', {
          state: 'visible',
          timeout: 15000,
        }),
      ]);
      console.log('  Both players returned to title screen');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testNonIronmanDeathReturnsToLobby() {
  return runTest(
    'Non-Ironman Commander Death Returns to Lobby After Checkpoint Restore',
    async (browser) => {
      // Use standard (non-ironman) campaign via setupHostAndGuest
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected (non-ironman campaign)');

      // Verify NOT ironman
      const isIronman = await hostPage.evaluate(() => {
        return window.__TEST__?.isIronmanCampaign?.() ?? true;
      });
      if (isIronman) {
        throw new Error('Expected non-ironman campaign');
      }
      console.log('  Confirmed non-ironman mode');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force ALL human player deaths on both players
      // In multiplayer, ALL human players must die for defeat
      const [hostForced, guestForced] = await Promise.all([
        forceAllHumanPlayersDeath(hostPage),
        forceAllHumanPlayersDeath(guestPage),
      ]);
      console.log(
        `  All human deaths forced: host=${hostForced}, guest=${guestForced}`,
      );

      // Wait for results screen (NOT game over - non-ironman restores from checkpoint)
      await Promise.all([
        hostPage.waitForSelector('.results-screen', {
          state: 'visible',
          timeout: 60000,
        }),
        guestPage.waitForSelector('.results-screen', {
          state: 'visible',
          timeout: 60000,
        }),
      ]);
      console.log('  Both players see results screen');

      // Verify it's NOT game over screen
      const hostHasGameOver = await hostPage
        .locator('.game-over-screen')
        .isVisible()
        .catch(() => false);
      if (hostHasGameOver) {
        throw new Error('Non-ironman death should show results, not game over');
      }

      // Host clicks Continue
      await clickContinue(hostPage);
      console.log('  Host clicked Continue');

      // Both should return to lobby (checkpoint restored, can retry)
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Both players returned to lobby');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testIronmanDefeatWithoutDeathReturnsToLobby() {
  return runTest(
    'Ironman Defeat Without Commander Death Returns to Lobby',
    async (browser) => {
      // Setup host with ironman campaign
      const { hostContext, hostPage, roomCode } =
        await setupHostWithIronmanCampaign(browser);
      console.log('  Host created ironman campaign');

      const { guestContext, guestPage } = await joinGuestToLobby(
        browser,
        roomCode,
      );
      console.log('  Guest joined');

      // Wait for both to see each other
      await Promise.all([
        hostPage.waitForFunction(
          () => document.querySelectorAll('.player-row').length >= 2,
          null,
          { timeout: TIMEOUTS.connection },
        ),
        guestPage.waitForFunction(
          () => document.querySelectorAll('.player-row').length >= 2,
          null,
          { timeout: TIMEOUTS.connection },
        ),
      ]);
      console.log('  Both players in lobby');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force defeat (NOT commander death) on both players
      const [hostForced, guestForced] = await Promise.all([
        forceDefeat(hostPage),
        forceDefeat(guestPage),
      ]);
      console.log(`  Defeat forced: host=${hostForced}, guest=${guestForced}`);

      // Wait for results screen (should NOT be game over since commander survived)
      await Promise.all([
        hostPage.waitForSelector('.results-screen', {
          state: 'visible',
          timeout: 60000,
        }),
        guestPage.waitForSelector('.results-screen', {
          state: 'visible',
          timeout: 60000,
        }),
      ]);
      console.log('  Both players see results screen');

      // Verify it's NOT game over screen
      const hostHasGameOver = await hostPage
        .locator('.game-over-screen')
        .isVisible()
        .catch(() => false);
      if (hostHasGameOver) {
        throw new Error(
          'Ironman defeat without death should not show game over',
        );
      }

      // Host clicks Continue
      await clickContinue(hostPage);
      console.log('  Host clicked Continue');

      // Both should return to lobby (campaign continues)
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Both players returned to lobby');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testDefeatWithoutDeathReturnsToLobby() {
  return runTest(
    'Defeat Without Commander Death Returns to Lobby',
    async (browser) => {
      // Use standard (non-ironman) campaign via setupHostAndGuest
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force defeat (not commander death) on both players
      const [hostForced, guestForced] = await Promise.all([
        forceDefeat(hostPage),
        forceDefeat(guestPage),
      ]);
      console.log(`  Defeat forced: host=${hostForced}, guest=${guestForced}`);

      // Wait for results screen on both (not game over)
      await Promise.all([
        hostPage.waitForSelector('.results-screen', {
          state: 'visible',
          timeout: 60000,
        }),
        guestPage.waitForSelector('.results-screen', {
          state: 'visible',
          timeout: 60000,
        }),
      ]);
      console.log('  Both players see results screen');

      // Verify it's NOT game over screen
      const hostHasGameOver = await hostPage
        .locator('.game-over-screen')
        .isVisible()
        .catch(() => false);
      if (hostHasGameOver) {
        throw new Error('Host sees game over instead of results');
      }

      // Host clicks Continue
      await clickContinue(hostPage);
      console.log('  Host clicked Continue');

      // Both should return to lobby
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Both players returned to lobby');

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
    name: 'Ironman death shows game over for all',
    fn: testIronmanDeathEndsSession,
  },
  {
    name: 'Non-ironman death returns to lobby',
    fn: testNonIronmanDeathReturnsToLobby,
  },
  {
    name: 'Ironman defeat without death returns to lobby',
    fn: testIronmanDefeatWithoutDeathReturnsToLobby,
  },
  {
    name: 'Defeat without death returns to lobby',
    fn: testDefeatWithoutDeathReturnsToLobby,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Debrief Mission End Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
