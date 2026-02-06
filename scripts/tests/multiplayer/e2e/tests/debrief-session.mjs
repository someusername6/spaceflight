/**
 * E2E Tests - Debrief Session Lifecycle
 *
 * Tests for session management after mission:
 * - Host continue returns to lobby
 * - Ready states reset after returning
 * - Host quit ends session
 * - Room allows new joins after return
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
  forceVictory,
  waitForLobbyScreen,
  waitForMissionEnd,
} from '../helpers/debrief.mjs';
import { launchMissionAndWait, setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Session Lifecycle Tests
// =============================================================================

function testHostContinueReturnsToLobby() {
  return runTest(
    'Host Continue Returns Both Players to Lobby',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force victory on both players
      await Promise.all([forceVictory(hostPage), forceVictory(guestPage)]);

      await Promise.all([
        waitForMissionEnd(hostPage),
        waitForMissionEnd(guestPage),
      ]);
      console.log('  Mission ended');

      // Host clicks Continue
      await clickContinue(hostPage);
      console.log('  Host clicked Continue');

      // Both should return to lobby
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Both players returned to lobby');

      // Wait a moment for any animations/transitions
      await new Promise((r) => setTimeout(r, 500));

      // Verify lobby is showing
      const hostInLobby = await hostPage
        .locator('.lobby-screen')
        .first()
        .isVisible()
        .catch(() => false);
      const guestInLobby = await guestPage
        .locator('.lobby-screen')
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`  Host in lobby: ${hostInLobby}`);
      console.log(`  Guest in lobby: ${guestInLobby}`);

      if (!hostInLobby || !guestInLobby) {
        throw new Error('Players did not return to lobby');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testReadyStatesResetAfterMission() {
  return runTest(
    'Ready States Reset After Returning to Lobby',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force victory on both players
      await Promise.all([forceVictory(hostPage), forceVictory(guestPage)]);

      await Promise.all([
        waitForMissionEnd(hostPage),
        waitForMissionEnd(guestPage),
      ]);
      console.log('  Mission ended');

      // Host clicks Continue
      await clickContinue(hostPage);

      // Wait for lobby
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Both players returned to lobby');

      // Check ready states are reset
      const hostReadyBtn = hostPage.locator('#btn-ready');
      const guestReadyBtn = guestPage.locator('#btn-ready');

      // Ready buttons should not have 'ready' class (indicating not ready)
      const hostIsReady = await hostReadyBtn
        .evaluate((el) => el.classList.contains('ready'))
        .catch(() => false);
      const guestIsReady = await guestReadyBtn
        .evaluate((el) => el.classList.contains('ready'))
        .catch(() => false);

      console.log(`  Host ready state: ${hostIsReady}`);
      console.log(`  Guest ready state: ${guestIsReady}`);

      if (hostIsReady || guestIsReady) {
        throw new Error('Ready states were not reset after mission');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testHostQuitFromLobbyEndsSession() {
  return runTest(
    'Host Quit From Lobby Ends Session for Guest',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      // Listen for SessionEnded on guest
      guestPage.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('[lobby-routing] Guest received SessionEnded')) {
          console.log('  [guest]', text);
        }
        if (text.includes('[lobby-handlers] Session ended')) {
          console.log('  [guest]', text);
        }
      });

      // Verify both are in lobby
      const hostInLobby = await hostPage
        .locator('.lobby-screen')
        .first()
        .isVisible()
        .catch(() => false);
      const guestInLobby = await guestPage
        .locator('.lobby-screen')
        .first()
        .isVisible()
        .catch(() => false);
      console.log(
        `  Host in lobby: ${hostInLobby}, Guest in lobby: ${guestInLobby}`,
      );

      // Host clicks Leave button (inside lobby-actions)
      await hostPage.click('.lobby-actions #btn-back');
      console.log('  Host clicked Leave button');

      // Dismiss "Session Ended" alert overlay (appears on top of title screen)
      await guestPage.waitForSelector('.alert-overlay', {
        state: 'visible',
        timeout: TIMEOUTS.navigation,
      });
      await guestPage.click('#btn-alert-ok');
      await guestPage.waitForSelector('.alert-overlay', {
        state: 'hidden',
        timeout: TIMEOUTS.ui,
      });
      console.log('  Guest dismissed session ended alert');

      // Verify guest is on title screen
      await guestPage.waitForSelector('.title-screen', {
        state: 'visible',
        timeout: TIMEOUTS.navigation,
      });
      console.log('  Guest returned to title screen');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testRoomAllowsNewJoinsAfterReturn() {
  return runTest(
    'Room Allows New Joins After Returning to Lobby',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force victory on both players
      await Promise.all([forceVictory(hostPage), forceVictory(guestPage)]);

      await Promise.all([
        waitForMissionEnd(hostPage),
        waitForMissionEnd(guestPage),
      ]);
      console.log('  Mission ended');

      // Host clicks Continue to return to lobby
      await clickContinue(hostPage);
      console.log('  Host clicked Continue');

      // Wait for both to return to lobby
      await Promise.all([
        waitForLobbyScreen(hostPage),
        waitForLobbyScreen(guestPage),
      ]);
      console.log('  Both players returned to lobby');

      // Wait a moment for room state to update and lobby to render
      await new Promise((r) => setTimeout(r, 1000));

      // Wait for room code header to be fully visible (host only sees this)
      await hostPage.waitForSelector('.room-code-header .room-code-value', {
        state: 'visible',
        timeout: TIMEOUTS.navigation,
      });

      // Get room code from host before guest leaves
      const roomCodeText = await hostPage
        .locator('.room-code-header .room-code-value')
        .textContent();
      const roomCode = roomCodeText?.replace(/\s/g, '') ?? null;

      if (!roomCode) {
        throw new Error('Could not find room code on host');
      }
      console.log(`  Room code: ${roomCode}`);

      // Now guest leaves
      await guestPage.click('.lobby-actions #btn-back');
      console.log('  Guest clicked Leave button');

      // Wait for guest to reach title screen
      await guestPage.waitForSelector('#btn-join-game', {
        state: 'visible',
        timeout: TIMEOUTS.missionStart,
      });
      console.log('  Guest on title screen');

      // Guest clicks Join Game
      await guestPage.click('#btn-join-game');
      await guestPage.waitForSelector('.join-game-screen', {
        state: 'visible',
        timeout: TIMEOUTS.navigation,
      });
      console.log('  Guest on join game screen');

      // Guest enters room code and joins
      await guestPage.fill('#room-code', roomCode);
      await guestPage.click('#btn-join');

      // Wait for guest to reach lobby
      await guestPage.waitForSelector('.lobby-screen, .player-list', {
        state: 'visible',
        timeout: TIMEOUTS.missionStart,
      });
      console.log('  Guest rejoined lobby successfully');

      // Verify guest is in lobby
      const guestInLobby = await guestPage
        .locator('.lobby-screen')
        .first()
        .isVisible()
        .catch(() => false);

      if (!guestInLobby) {
        throw new Error('Guest could not rejoin after returning to lobby');
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
    name: 'Host continue returns to lobby',
    fn: testHostContinueReturnsToLobby,
  },
  {
    name: 'Ready states reset after mission',
    fn: testReadyStatesResetAfterMission,
  },
  {
    name: 'Host quit from lobby ends session',
    fn: testHostQuitFromLobbyEndsSession,
  },
  {
    name: 'Room allows new joins after return',
    fn: testRoomAllowsNewJoinsAfterReturn,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Debrief Session Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
