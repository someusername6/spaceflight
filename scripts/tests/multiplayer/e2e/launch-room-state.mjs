/**
 * E2E Tests - Launch Flow - Room State
 *
 * Tests for room state management during mission launch.
 * - Room state updated to prevent mid-mission joins
 * - Campaign state hash verification
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  acceptFirstContract,
  getChatMessages,
  readyBothPlayers,
  waitForSystemMessage,
} from './helpers.mjs';
import {
  isMainModule,
  runTest,
  runTestSuite,
  SIGNALING_URL,
  sleep,
} from './utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../../../../package.json'), 'utf-8'),
);
const GAME_VERSION = pkg.version;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Try to join the room from a new browser context.
 * Returns the error response from the signaling server, or null if join succeeded.
 * @param {string} roomCode
 * @returns {Promise<{error: string, message: string} | null>}
 */
async function tryJoinRoom(roomCode) {
  const codeClean = roomCode.replace(/\s+/g, '');
  try {
    const response = await fetch(`${SIGNALING_URL}/rooms/${codeClean}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peerId: `test-joiner-${Date.now()}`,
        gameVersion: GAME_VERSION, // Must match the room's game version
      }),
    });

    if (!response.ok) {
      return await response.json();
    }
    return null; // Join succeeded
  } catch {
    return { error: 'fetch_failed', message: 'Failed to reach server' };
  }
}

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Room state updated to prevent mid-mission joins.
 * Verifies: After mission launches, new players cannot join the room.
 */
function testRoomStatePreventsJoin() {
  return runTest('Room State Prevents Mid-Mission Joins', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage, roomCode } =
      await setupHostAndGuest(browser, 'RoomStateGuest');
    console.log('  Both players connected');

    // Verify room is joinable before mission
    const preJoinResult = await tryJoinRoom(roomCode);
    // A join attempt should either succeed or fail for a reason other than game_in_progress
    const roomJoinableBefore =
      preJoinResult === null ||
      (preJoinResult?.error && preJoinResult.error !== 'game_in_progress');
    console.log(`  Room joinable before mission: ${roomJoinableBefore}`);

    // Make both players ready
    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    // Host navigates to contracts and accepts
    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract');

    // Wait for countdown to start (guest is on lobby, sees chat)
    await waitForSystemMessage(guestPage, 'Launching in', 5000);
    console.log('  Countdown started');

    // Wait for mission to start (countdown completes after 10 seconds)
    // Guest receives MissionStarted and shows "Mission starting..." in chat
    await waitForSystemMessage(guestPage, 'Mission starting', 15000);
    console.log('  Mission starting message received');

    // Give a moment for room state to update on signaling server
    await sleep(500);

    // Try to join the room -- should be rejected with game_in_progress
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

/**
 * Test: Campaign state hash is included in mission start.
 * Verifies: MissionStarted message includes hash, guest validates it.
 * We verify this indirectly -- if hash mismatched, guest would show a warning.
 * Since host and guest have synced state, no warning should appear.
 */
function testCampaignStateHashVerification() {
  return runTest('Campaign State Hash Verification', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HashGuest');
    console.log('  Both players connected');

    // Make both players ready
    await readyBothPlayers(hostPage, guestPage);
    console.log('  Both players ready');

    // Host navigates to contracts and accepts
    await acceptFirstContract(hostPage);
    console.log('  Host accepted contract');

    // Wait for mission start on guest
    await waitForSystemMessage(guestPage, 'Mission starting', 15000);
    console.log('  Guest received MissionStarted');

    // Check that NO hash mismatch warning appeared
    const guestMessages = await getChatMessages(guestPage);
    const hashWarnings = guestMessages.filter((m) =>
      m.toLowerCase().includes('out of sync'),
    );

    console.log(`  Hash mismatch warnings: ${hashWarnings.length}`);

    // Also verify the "Mission starting..." message appeared (proves hash was received)
    const missionMessages = guestMessages.filter((m) =>
      m.includes('Mission starting'),
    );
    console.log(`  Mission starting messages: ${missionMessages.length}`);

    if (!(hashWarnings.length === 0 && missionMessages.length > 0)) {
      throw new Error(
        `Hash verification failed: warnings=${hashWarnings.length}, missionStarted=${missionMessages.length}`,
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
  runTestSuite('E2E Tests - Launch Flow - Room State', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
