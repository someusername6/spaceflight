/**
 * Lobby E2E Test Runner
 *
 * Runs all lobby E2E tests using Playwright.
 * Tests verify the lobby UI works correctly with actual signaling server.
 * Both Vite and signaling server are automatically started/stopped.
 *
 * Running:
 *   node scripts/tests/multiplayer/test-lobby-e2e.mjs
 *
 * Tests are split into:
 * - e2e-tests-navigation.mjs: Title screen, host game, join game navigation
 * - e2e-tests-connection.mjs: Full host flow, host-guest connection
 * - e2e-tests-ui-chat-cleanup.mjs: Chat messaging, back button cleanup
 * - e2e-tests-ui-copy.mjs: Copy room code, ping display
 * - e2e-tests-ui-ready.mjs: Ready toggle
 * - e2e-tests-ui-indicators.mjs: Host indicator, self highlight
 * - e2e-tests-ui-system.mjs: System messages, lobby rendering
 */

import {
  printResults,
  startServers,
  stopServers,
  stopSignalingServer,
  stopViteServer,
} from './e2e-test-utils.mjs';
import {
  testFullHostFlow,
  testHostAndGuestConnection,
} from './e2e-tests-connection.mjs';
import {
  testHostGameNavigation,
  testJoinGameNavigation,
  testTitleScreenButtons,
} from './e2e-tests-navigation.mjs';
import {
  testBackButtonCleanup,
  testChatMessaging,
} from './e2e-tests-ui-chat-cleanup.mjs';
import { testCopyRoomCode, testPingDisplay } from './e2e-tests-ui-copy.mjs';
import {
  testHostIndicator,
  testSelfHighlight,
} from './e2e-tests-ui-indicators.mjs';
import { testReadyToggle } from './e2e-tests-ui-ready.mjs';
import {
  testLobbyRendering,
  testSystemMessages,
} from './e2e-tests-ui-system.mjs';

/**
 * Run all E2E tests.
 */
async function runAllTests() {
  console.log('============================================');
  console.log('   Lobby E2E Tests');
  console.log('============================================\n');

  await startServers();

  const results = [];

  try {
    // Navigation tests
    results.push({
      name: 'Title Screen Buttons',
      passed: await testTitleScreenButtons(),
    });
    results.push({
      name: 'Host Game Navigation',
      passed: await testHostGameNavigation(),
    });
    results.push({
      name: 'Join Game Navigation',
      passed: await testJoinGameNavigation(),
    });

    // Connection tests
    results.push({
      name: 'Full Host Flow',
      passed: await testFullHostFlow(),
    });
    results.push({
      name: 'Host and Guest Connection',
      passed: await testHostAndGuestConnection(),
    });

    // UI tests - Part 1
    results.push({
      name: 'Chat Messaging',
      passed: await testChatMessaging(),
    });
    results.push({
      name: 'Back Button Cleanup',
      passed: await testBackButtonCleanup(),
    });
    results.push({
      name: 'Copy Room Code',
      passed: await testCopyRoomCode(),
    });
    results.push({
      name: 'Ping Display',
      passed: await testPingDisplay(),
    });

    // UI tests - Part 2
    results.push({
      name: 'Ready Button Toggle',
      passed: await testReadyToggle(),
    });
    results.push({
      name: 'Host Indicator',
      passed: await testHostIndicator(),
    });
    results.push({
      name: 'Self Highlight',
      passed: await testSelfHighlight(),
    });
    results.push({
      name: 'System Messages',
      passed: await testSystemMessages(),
    });
    results.push({
      name: 'Lobby Component Rendering',
      passed: await testLobbyRendering(),
    });
  } finally {
    await stopServers();
  }

  const { failed } = printResults(results);
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test runner error:', error);
  stopViteServer().catch(() => {});
  stopSignalingServer().catch(() => {});
  process.exit(1);
});
