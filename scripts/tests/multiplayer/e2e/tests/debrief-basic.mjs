/**
 * E2E Tests - Debrief Basic
 *
 * Basic tests for multiplayer debrief screen:
 * - Both players see results screen
 * - Multiplayer footer elements
 * - Chat works during debrief
 *
 * Total: 3 tests
 */

import { isMainModule, runTest, runTestSuite } from '../core/index.mjs';
import {
  forceVictory,
  hasChatFooter,
  hasContinueButton,
  hasMultiplayerFooter,
  hasWaitingMessage,
  sendDebriefChat,
  waitForMissionEnd,
} from '../helpers/debrief.mjs';
import { launchMissionAndWait, setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Basic Debrief Tests
// =============================================================================

function testBothPlayersSeeResultsScreen() {
  return runTest(
    'Both Players See Results Screen After Mission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      // Set up console listeners to capture debug messages
      hostPage.on('console', (msg) => {
        const text = msg.text();
        if (
          text.includes('[forceVictory]') ||
          text.includes('[TICK]') ||
          text.includes('[EXECUTOR]') ||
          text.includes('[showMultiplayerResults]') ||
          text.includes('[MissionEnded]')
        ) {
          console.log('  [host]', text);
        }
      });
      guestPage.on('console', (msg) => {
        const text = msg.text();
        if (
          text.includes('[TICK]') ||
          text.includes('[MissionEnded]') ||
          text.includes('[showMultiplayerResults]')
        ) {
          console.log('  [guest]', text);
        }
      });

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force victory on both players
      const [hostForced, guestForced] = await Promise.all([
        forceVictory(hostPage),
        forceVictory(guestPage),
      ]);
      if (hostForced && guestForced) {
        console.log('  Victory forced on both players');
      } else {
        console.log('  Waiting for natural mission end (up to 60s)...');
      }

      // Wait for results screen on both players
      await Promise.all([
        waitForMissionEnd(hostPage),
        waitForMissionEnd(guestPage),
      ]);
      console.log('  Mission ended');

      // Verify both see results screen
      const hostHasResults = await hostPage
        .locator('.results-screen')
        .isVisible()
        .catch(() => false);
      const guestHasResults = await guestPage
        .locator('.results-screen')
        .isVisible()
        .catch(() => false);

      console.log(`  Host has results screen: ${hostHasResults}`);
      console.log(`  Guest has results screen: ${guestHasResults}`);

      if (!hostHasResults || !guestHasResults) {
        throw new Error('Results screen not visible on both players');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testMultiplayerFooterElements() {
  return runTest(
    'Multiplayer Footer Shows Correct Elements',
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

      // Check host has multiplayer footer with Continue button
      const hostHasMultiplayerFooter = await hasMultiplayerFooter(hostPage);
      const hostHasChatFooter = await hasChatFooter(hostPage);
      const hostHasContinue = await hasContinueButton(hostPage);
      const hostHasWaiting = await hasWaitingMessage(hostPage);

      console.log(`  Host: multiplayer footer=${hostHasMultiplayerFooter}`);
      console.log(`  Host: chat footer=${hostHasChatFooter}`);
      console.log(`  Host: continue button=${hostHasContinue}`);
      console.log(`  Host: waiting message=${hostHasWaiting}`);

      // Check guest has multiplayer footer with waiting message
      const guestHasMultiplayerFooter = await hasMultiplayerFooter(guestPage);
      const guestHasChatFooter = await hasChatFooter(guestPage);
      const guestHasContinue = await hasContinueButton(guestPage);
      const guestHasWaiting = await hasWaitingMessage(guestPage);

      console.log(`  Guest: multiplayer footer=${guestHasMultiplayerFooter}`);
      console.log(`  Guest: chat footer=${guestHasChatFooter}`);
      console.log(`  Guest: continue button=${guestHasContinue}`);
      console.log(`  Guest: waiting message=${guestHasWaiting}`);

      // Verify expectations
      if (!hostHasMultiplayerFooter) {
        throw new Error('Host missing multiplayer footer');
      }
      if (!hostHasContinue) {
        throw new Error('Host missing Continue button');
      }
      if (hostHasWaiting) {
        throw new Error('Host should not have waiting message');
      }

      if (!guestHasMultiplayerFooter) {
        throw new Error('Guest missing multiplayer footer');
      }
      if (!guestHasWaiting) {
        throw new Error('Guest missing waiting message');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testDebriefChatWorks() {
  return runTest('Chat Works During Debrief', async (browser) => {
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

    // Verify chat footer exists
    const hostHasChat = await hasChatFooter(hostPage);
    const guestHasChat = await hasChatFooter(guestPage);

    if (!hostHasChat || !guestHasChat) {
      throw new Error('Chat footer not present on both players');
    }

    // Host sends a message
    await sendDebriefChat(hostPage, 'GG!');
    console.log('  Host sent chat message');

    // Wait for message to appear on guest
    await guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll(
          '.chat-footer-messages .chat-message',
        );
        return Array.from(messages).some((m) => m.textContent?.includes('GG'));
      },
      null,
      { timeout: 5000 },
    );
    console.log('  Message received by guest');

    // Guest sends a reply
    await sendDebriefChat(guestPage, 'Thanks!');
    console.log('  Guest sent chat message');

    // Wait for message to appear on host
    await hostPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll(
          '.chat-footer-messages .chat-message',
        );
        return Array.from(messages).some((m) =>
          m.textContent?.includes('Thanks'),
        );
      },
      null,
      { timeout: 5000 },
    );
    console.log('  Message received by host');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Both players see results screen',
    fn: testBothPlayersSeeResultsScreen,
  },
  {
    name: 'Multiplayer footer shows correct elements',
    fn: testMultiplayerFooterElements,
  },
  { name: 'Chat works during debrief', fn: testDebriefChatWorks },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Debrief Basic Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
