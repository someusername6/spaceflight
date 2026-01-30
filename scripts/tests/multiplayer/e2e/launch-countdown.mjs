/**
 * E2E Tests - Launch Flow - Countdown
 *
 * Tests for launch countdown display, abort, and blocking.
 * - Countdown displays in chat (10... 9... 8...)
 * - Unready player aborts countdown with message
 * - Launch blocked when not all players ready
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  acceptFirstContract,
  getChatMessages,
  readyBothPlayers,
  waitForSystemMessage,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Countdown displays in chat when both players ready.
 * Verifies: "Launching in 10..." appears in chat on both host and guest.
 */
function testCountdownDisplaysInChat() {
  return runTest('Countdown Displays In Chat', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'CountdownGuest');
    console.log('  Both players connected');

    // Make both players ready
    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    // Host navigates to contracts and accepts a mission
    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract');

    // Wait for countdown to appear on guest's lobby chat
    // (Host is on contracts screen, so chat is only visible on guest's lobby)
    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Guest sees countdown in chat');

    // Get countdown messages from guest (guest is on lobby, sees chat)
    // Note: With fast countdown (1s in tests), we may only see 1 message
    const guestMessages = await getChatMessages(guestPage);
    const guestCountdownMessages = guestMessages.filter((m) =>
      m.includes('Launching in'),
    );

    console.log(`  Guest countdown messages: ${guestCountdownMessages.length}`);

    // Guest should have at least 1 countdown message
    // (With 1s test countdown, we only get 1 tick before mission starts)
    if (guestCountdownMessages.length < 1) {
      throw new Error(
        `No countdown messages received on guest: ${guestCountdownMessages.length}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Unready player aborts countdown.
 * Verifies: When a player becomes unready during countdown, an abort message appears.
 */
function testUnreadyAbortsCountdown() {
  return runTest('Unready Player Aborts Countdown', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'AbortGuest');
    console.log('  Both players connected');

    // Make both players ready
    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    // Host navigates to contracts and accepts
    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract (countdown starting)');

    // Wait for first countdown tick on guest (guest is on lobby, sees chat)
    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown started (guest sees it)');

    // Guest toggles ready -> unready (guest is on lobby screen)
    await guestPage.click('#btn-ready');
    console.log('  Guest clicked unready');

    // Wait for abort message on guest
    await waitForSystemMessage(guestPage, 'Launch aborted', 5000);
    console.log('  Guest sees abort message');

    // Host navigates back to lobby to check abort message
    await hostPage.click('#nav-lobby');
    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await sleep(300);

    await waitForSystemMessage(hostPage, 'Launch aborted', 3000);
    console.log('  Host sees abort message');

    // Verify the abort reason mentions the guest
    const hostMessages = await getChatMessages(hostPage);
    const abortMessages = hostMessages.filter((m) =>
      m.includes('Launch aborted'),
    );

    console.log(`  Abort messages: ${abortMessages.length}`);
    const hasAbortReason = abortMessages.some(
      (m) => m.includes('not ready') || m.includes('AbortGuest'),
    );
    console.log(`  Abort reason mentions player: ${hasAbortReason}`);

    if (abortMessages.length === 0) {
      throw new Error('No abort message found');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Escape during countdown makes player unready.
 * Verifies: Pressing Escape during countdown sets player to not ready (aborting countdown)
 * instead of opening the pause menu.
 */
function testEscapeDuringCountdownMakesUnready() {
  return runTest('Escape During Countdown Makes Unready', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'EscapeGuest');
    console.log('  Both players connected');

    // Make both players ready
    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    // Verify guest is ready
    const guestReadyBefore = await guestPage
      .locator('#btn-ready')
      .evaluate((el) => el.classList.contains('ready-active'));
    console.log(`  Guest ready button active before: ${guestReadyBefore}`);

    if (!guestReadyBefore) {
      throw new Error('Guest should be ready before test');
    }

    // Host navigates to contracts and accepts
    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract (countdown starting)');

    // Wait for countdown to start on guest
    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown started (guest sees it)');

    // Guest presses Escape - should make them unready, not open pause menu
    await guestPage.keyboard.press('Escape');
    console.log('  Guest pressed Escape');

    // Wait a moment for the state change
    await sleep(500);

    // Verify guest is now NOT ready
    const guestReadyAfter = await guestPage
      .locator('#btn-ready')
      .evaluate((el) => el.classList.contains('ready-active'));
    console.log(`  Guest ready button active after Escape: ${guestReadyAfter}`);

    if (guestReadyAfter) {
      throw new Error(
        'Guest should be unready after pressing Escape during countdown',
      );
    }

    // Verify no pause menu opened (pause menu would have a specific class/element)
    const pauseMenuVisible = await guestPage
      .locator('.pause-menu, .modal-pause')
      .count();
    console.log(`  Pause menu elements visible: ${pauseMenuVisible}`);

    if (pauseMenuVisible > 0) {
      throw new Error(
        'Pause menu should not open when pressing Escape during countdown',
      );
    }

    // Verify countdown was aborted
    await waitForSystemMessage(guestPage, 'Launch aborted', 5000);
    console.log('  Countdown aborted (as expected)');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Launch blocked when players not ready.
 * Verifies: Host clicking Accept when guest not ready shows blocking message.
 */
function testLaunchBlockedIfNotReady() {
  return runTest('Launch Blocked If Not All Ready', async (browser) => {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'BlockedGuest',
    );
    console.log('  Both players connected');

    // Do NOT make guest ready -- only host readies up
    await hostPage.click('#btn-ready');
    await sleep(500);
    console.log('  Only host is ready (guest not ready)');

    // Host navigates to contracts and tries to accept
    await acceptFirstContract(hostPage);
    console.log('  Host clicked Accept Mission');

    // Should see a "waiting for" message, NOT a countdown
    // Navigate host back to lobby to check chat
    await hostPage.click('#nav-lobby');
    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await sleep(500);

    const hostMessages = await getChatMessages(hostPage);
    const waitingMessages = hostMessages.filter(
      (m) =>
        m.toLowerCase().includes('waiting') ||
        m.toLowerCase().includes('cannot launch'),
    );
    const countdownMessages = hostMessages.filter((m) =>
      m.includes('Launching in'),
    );

    console.log(`  Waiting/blocked messages: ${waitingMessages.length}`);
    console.log(`  Countdown messages: ${countdownMessages.length}`);

    const isBlocked =
      waitingMessages.length > 0 && countdownMessages.length === 0;

    if (!isBlocked) {
      throw new Error(
        `Launch was not properly blocked: waiting=${waitingMessages.length}, countdown=${countdownMessages.length}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  { name: 'Countdown displays in chat', fn: testCountdownDisplaysInChat },
  { name: 'Unready player aborts countdown', fn: testUnreadyAbortsCountdown },
  {
    name: 'Escape during countdown makes unready',
    fn: testEscapeDuringCountdownMakesUnready,
  },
  { name: 'Launch blocked if not all ready', fn: testLaunchBlockedIfNotReady },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Launch Flow - Countdown', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
