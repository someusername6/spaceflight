/**
 * E2E Tests - Launch Flow
 *
 * Consolidated tests for launch countdown and room state management.
 * Sources: launch-countdown.mjs, launch-room-state.mjs
 *
 * Total: 6 tests
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isMainModule,
  runTest,
  runTestSuite,
  SIGNALING_URL,
} from '../core/index.mjs';
import {
  acceptFirstContract,
  getChatMessages,
  readyBothPlayers,
  setupHostAndGuest,
  waitForMissionStart,
  waitForSystemMessage,
} from '../helpers/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../../../../../package.json'), 'utf-8'),
);
const GAME_VERSION = pkg.version;

// =============================================================================
// Helpers
// =============================================================================

async function tryJoinRoom(roomCode) {
  const codeClean = roomCode.replace(/\s+/g, '');
  try {
    const response = await fetch(`${SIGNALING_URL}/rooms/${codeClean}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peerId: `test-joiner-${Date.now()}`,
        gameVersion: GAME_VERSION,
      }),
    });

    if (!response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return { error: 'fetch_failed', message: 'Failed to reach server' };
  }
}

// =============================================================================
// Countdown Tests (from launch-countdown.mjs)
// =============================================================================

function testCountdownDisplaysInChat() {
  return runTest('Countdown Displays In Chat', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'CountdownGuest');
    console.log('  Both players connected');

    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract');

    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Guest sees countdown in chat');

    const guestMessages = await getChatMessages(guestPage);
    const guestCountdownMessages = guestMessages.filter((m) =>
      m.includes('Launching in'),
    );

    console.log(`  Guest countdown messages: ${guestCountdownMessages.length}`);

    if (guestCountdownMessages.length < 1) {
      throw new Error(
        `No countdown messages received on guest: ${guestCountdownMessages.length}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testUnreadyAbortsCountdown() {
  return runTest('Unready Player Aborts Countdown', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'AbortGuest');
    console.log('  Both players connected');

    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract (countdown starting)');

    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown started (guest sees it)');

    await guestPage.click('#btn-ready');
    console.log('  Guest clicked unready');

    await waitForSystemMessage(guestPage, 'Launch aborted', 5000);
    console.log('  Guest sees abort message');

    await hostPage.click('#nav-lobby');
    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });

    await waitForSystemMessage(hostPage, 'Launch aborted', 3000);
    console.log('  Host sees abort message');

    const hostMessages = await getChatMessages(hostPage);
    const abortMessages = hostMessages.filter((m) =>
      m.includes('Launch aborted'),
    );

    console.log(`  Abort messages: ${abortMessages.length}`);

    if (abortMessages.length === 0) {
      throw new Error('No abort message found');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testEscapeDuringCountdownMakesUnready() {
  return runTest('Escape During Countdown Makes Unready', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'EscapeGuest');
    console.log('  Both players connected');

    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    const guestReadyBefore = await guestPage
      .locator('#btn-ready')
      .evaluate((el) => el.classList.contains('ready-active'));
    console.log(`  Guest ready button active before: ${guestReadyBefore}`);

    if (!guestReadyBefore) {
      throw new Error('Guest should be ready before test');
    }

    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract (countdown starting)');

    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown started (guest sees it)');

    await guestPage.keyboard.press('Escape');
    console.log('  Guest pressed Escape');

    // Wait for ready state to update (Escape triggers unready)
    await guestPage.waitForFunction(
      () =>
        !document
          .querySelector('#btn-ready')
          ?.classList.contains('ready-active'),
      null,
      { timeout: 3000, polling: 50 },
    );

    const guestReadyAfter = await guestPage
      .locator('#btn-ready')
      .evaluate((el) => el.classList.contains('ready-active'));
    console.log(`  Guest ready button active after Escape: ${guestReadyAfter}`);

    if (guestReadyAfter) {
      throw new Error(
        'Guest should be unready after pressing Escape during countdown',
      );
    }

    const pauseMenuVisible = await guestPage
      .locator('.pause-menu, .modal-pause')
      .count();
    console.log(`  Pause menu elements visible: ${pauseMenuVisible}`);

    if (pauseMenuVisible > 0) {
      throw new Error(
        'Pause menu should not open when pressing Escape during countdown',
      );
    }

    await waitForSystemMessage(guestPage, 'Launch aborted', 5000);
    console.log('  Countdown aborted (as expected)');

    await hostContext.close();
    await guestContext.close();
  });
}

function testLaunchBlockedIfNotReady() {
  return runTest('Launch Blocked If Not All Ready', async (browser) => {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'BlockedGuest',
    );
    console.log('  Both players connected');

    await hostPage.click('#btn-ready');
    // Wait for host's ready indicator to appear
    await hostPage.waitForFunction(
      () => document.querySelectorAll('.ready-indicator.ready').length >= 1,
      null,
      { timeout: 5000, polling: 50 },
    );
    console.log('  Only host is ready (guest not ready)');

    await acceptFirstContract(hostPage);
    console.log('  Host clicked Accept Mission');

    await hostPage.click('#nav-lobby');
    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });

    // Wait for the "waiting"/"cannot launch" system message
    await hostPage.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('.chat-message');
        return Array.from(msgs).some(
          (m) =>
            m.textContent?.toLowerCase().includes('waiting') ||
            m.textContent?.toLowerCase().includes('cannot launch'),
        );
      },
      null,
      { timeout: 5000, polling: 50 },
    );

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
// Room State Tests (from launch-room-state.mjs)
// =============================================================================

function testRoomStatePreventsJoin() {
  return runTest('Room State Prevents Mid-Mission Joins', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage, roomCode } =
      await setupHostAndGuest(browser, 'RoomStateGuest');
    console.log('  Both players connected');

    const preJoinResult = await tryJoinRoom(roomCode);
    const roomJoinableBefore =
      preJoinResult === null ||
      (preJoinResult?.error && preJoinResult.error !== 'game_in_progress');
    console.log(`  Room joinable before mission: ${roomJoinableBefore}`);

    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract');

    // Wait for countdown to appear on guest first (confirms messages flowing)
    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown received on guest');

    await waitForMissionStart(guestPage, 15000);
    console.log('  Mission started on guest');

    const postJoinResult = await tryJoinRoom(roomCode);
    const roomBlocked = postJoinResult?.error === 'game_in_progress';
    console.log(`  Room blocked after mission start: ${roomBlocked}`);

    if (postJoinResult) {
      console.log(`  Join error: ${postJoinResult.error}`);
    }

    if (!(roomJoinableBefore && roomBlocked)) {
      throw new Error(
        `Room state check failed: joinable_before=${roomJoinableBefore}, blocked_after=${roomBlocked}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testCampaignStateHashVerification() {
  return runTest('Campaign State Hash Verification', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HashGuest');
    console.log('  Both players connected');

    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    // Capture console errors on guest for diagnostics
    const guestErrors = [];
    guestPage.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        guestErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract');

    // Wait for countdown on GUEST (host lobby DOM is cleared after navigating to contracts)
    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown received on guest');

    await waitForMissionStart(guestPage, 15000);
    console.log('  Mission started on guest');

    // Chat messages remain in DOM (lobby is hidden, not destroyed)
    const guestMessages = await getChatMessages(guestPage);
    const hashWarnings = guestMessages.filter((m) =>
      m.toLowerCase().includes('out of sync'),
    );

    console.log(`  Hash mismatch warnings: ${hashWarnings.length}`);

    if (hashWarnings.length > 0) {
      throw new Error(
        `Hash verification failed: ${hashWarnings.length} out-of-sync warnings found`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  // Countdown (4)
  { name: 'Countdown displays in chat', fn: testCountdownDisplaysInChat },
  { name: 'Unready player aborts countdown', fn: testUnreadyAbortsCountdown },
  {
    name: 'Escape during countdown makes unready',
    fn: testEscapeDuringCountdownMakesUnready,
  },
  { name: 'Launch blocked if not all ready', fn: testLaunchBlockedIfNotReady },
  // Room state (2)
  {
    name: 'Room state prevents mid-mission joins',
    fn: testRoomStatePreventsJoin,
  },
  {
    name: 'Campaign state hash verification',
    fn: testCampaignStateHashVerification,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Launch Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
