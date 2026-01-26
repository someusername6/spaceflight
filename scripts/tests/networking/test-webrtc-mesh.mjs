/**
 * Automated WebRTC mesh tests using Playwright.
 *
 * Prerequisites:
 *   npm install -D playwright
 *   npx playwright install chromium
 *
 * Running:
 *   1. Start signaling server: cd server/signaling && npm run dev
 *   2. Start vite dev server: npm run dev
 *   3. Run test: npx playwright test scripts/tests/networking/test-webrtc-mesh.mjs
 *
 * Or run directly with Node (after installing playwright):
 *   node scripts/tests/networking/test-webrtc-mesh.mjs
 */

import { chromium } from 'playwright';

const VITE_URL = 'http://localhost:5173/test-networking.html';

/**
 * Wait for a log entry containing the specified text.
 */
async function waitForLog(page, text, timeout = 10000) {
  await page.waitForFunction(
    (searchText) => {
      const log = document.getElementById('log');
      return log?.textContent.includes(searchText);
    },
    text,
    { timeout },
  );
}

/**
 * Get all log entries from a page.
 */
async function getLogs(page) {
  return page.evaluate(() => {
    const log = document.getElementById('log');
    return log ? log.textContent : '';
  });
}

/**
 * Test: Two peers can connect and exchange messages.
 */
async function testTwoPeerMesh() {
  console.log('\n=== Test: Two Peer Mesh ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // Create two browser contexts (like two separate users)
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    // Navigate both to the test page
    await Promise.all([hostPage.goto(VITE_URL), guestPage.goto(VITE_URL)]);

    // Host creates a room
    console.log('Host: Creating room...');
    await hostPage.click('button:text("Create Room")');
    await waitForLog(hostPage, 'Room created:');

    // Extract room code
    const roomCode = await hostPage.evaluate(() => {
      const logs = document.getElementById('log').textContent;
      const match = logs.match(/Room created: ([A-Z0-9]+)/);
      return match ? match[1] : null;
    });

    if (!roomCode) {
      throw new Error('Failed to extract room code');
    }
    console.log(`Host: Room created with code ${roomCode}`);

    // Guest joins the room
    console.log('Guest: Joining room...');
    await guestPage.fill('input[placeholder="Room Code"]', roomCode);
    await guestPage.click('button:text("Join Room")');

    // Wait for both to be connected
    await Promise.all([
      waitForLog(hostPage, 'Peer connected:'),
      waitForLog(guestPage, 'State: connected'),
    ]);
    console.log('Both peers connected!');

    // Host sends a message
    console.log('Host: Sending message...');
    await hostPage.fill(
      'input[placeholder="Type a message..."]',
      'Hello from host!',
    );
    await hostPage.click('button:text("Send to All")');

    // Guest should receive it
    await waitForLog(guestPage, 'Hello from host!');
    console.log('Guest: Received message from host');

    // Guest sends a message back
    console.log('Guest: Sending message...');
    await guestPage.fill(
      'input[placeholder="Type a message..."]',
      'Hello from guest!',
    );
    await guestPage.click('button:text("Send to All")');

    // Host should receive it
    await waitForLog(hostPage, 'Hello from guest!');
    console.log('Host: Received message from guest');

    // Verify final state
    const hostStatus = await hostPage.textContent('#status');
    const guestStatus = await guestPage.textContent('#status');

    if (
      !hostStatus.includes('Connected') ||
      !guestStatus.includes('Connected')
    ) {
      throw new Error('Peers not in connected state');
    }

    console.log('\n✅ Two peer mesh test PASSED\n');

    // Cleanup
    await hostContext.close();
    await guestContext.close();

    return true;
  } catch (error) {
    console.error('\n❌ Two peer mesh test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Three peers can connect in a mesh.
 */
async function testThreePeerMesh() {
  console.log('\n=== Test: Three Peer Mesh ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();

    await Promise.all([
      hostPage.goto(VITE_URL),
      guest1Page.goto(VITE_URL),
      guest2Page.goto(VITE_URL),
    ]);

    // Host creates room
    console.log('Host: Creating room...');
    await hostPage.click('button:text("Create Room")');
    await waitForLog(hostPage, 'Room created:');

    const roomCode = await hostPage.evaluate(() => {
      const logs = document.getElementById('log').textContent;
      const match = logs.match(/Room created: ([A-Z0-9]+)/);
      return match ? match[1] : null;
    });
    console.log(`Host: Room created with code ${roomCode}`);

    // Guest 1 joins
    console.log('Guest 1: Joining room...');
    await guest1Page.fill('input[placeholder="Room Code"]', roomCode);
    await guest1Page.click('button:text("Join Room")');
    await waitForLog(guest1Page, 'State: connected');
    console.log('Guest 1: Connected');

    // Guest 2 joins
    console.log('Guest 2: Joining room...');
    await guest2Page.fill('input[placeholder="Room Code"]', roomCode);
    await guest2Page.click('button:text("Join Room")');
    await waitForLog(guest2Page, 'State: connected');
    console.log('Guest 2: Connected');

    // Wait for host to see both peers
    await waitForLog(hostPage, 'Peer connected:', 5000);

    // Host broadcasts a message
    console.log('Host: Broadcasting message...');
    await hostPage.fill(
      'input[placeholder="Type a message..."]',
      'Broadcast from host',
    );
    await hostPage.click('button:text("Send to All")');

    // Both guests should receive it
    await Promise.all([
      waitForLog(guest1Page, 'Broadcast from host'),
      waitForLog(guest2Page, 'Broadcast from host'),
    ]);
    console.log('Both guests received broadcast');

    console.log('\n✅ Three peer mesh test PASSED\n');

    await hostContext.close();
    await guest1Context.close();
    await guest2Context.close();

    return true;
  } catch (error) {
    console.error('\n❌ Three peer mesh test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Invalid room code returns error.
 */
async function testInvalidRoomCode() {
  console.log('\n=== Test: Invalid Room Code ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL);

    // Try to join a non-existent room
    console.log('Attempting to join invalid room...');
    await page.fill('input[placeholder="Room Code"]', 'ZZZZZZZZ');
    await page.click('button:text("Join Room")');

    // Should get an error
    await waitForLog(page, 'Error:', 10000);
    const logs = await getLogs(page);

    if (logs.includes('invalid_room') || logs.includes('not found')) {
      console.log('\n✅ Invalid room code test PASSED\n');
      await context.close();
      return true;
    } else {
      throw new Error('Expected invalid_room error');
    }
  } catch (error) {
    console.error('\n❌ Invalid room code test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Disconnect cleans up properly.
 */
async function testDisconnect() {
  console.log('\n=== Test: Disconnect ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await Promise.all([hostPage.goto(VITE_URL), guestPage.goto(VITE_URL)]);

    // Create and join room
    await hostPage.click('button:text("Create Room")');
    await waitForLog(hostPage, 'Room created:');

    const roomCode = await hostPage.evaluate(() => {
      const logs = document.getElementById('log').textContent;
      const match = logs.match(/Room created: ([A-Z0-9]+)/);
      return match ? match[1] : null;
    });

    await guestPage.fill('input[placeholder="Room Code"]', roomCode);
    await guestPage.click('button:text("Join Room")');
    await waitForLog(guestPage, 'State: connected');
    await waitForLog(hostPage, 'Peer connected:');

    console.log('Both connected, testing disconnect...');

    // Guest disconnects
    await guestPage.click('button:text("Disconnect")');
    await waitForLog(guestPage, 'Disconnected');

    // Verify guest is back to idle state
    const guestStatus = await guestPage.textContent('#status');
    if (!guestStatus.includes('Idle')) {
      throw new Error('Guest should be in idle state after disconnect');
    }

    console.log('Guest disconnected successfully');

    // Note: Host may not immediately see the disconnect (depends on WebRTC timeouts)
    // but the guest side cleanup is verified

    console.log('\n✅ Disconnect test PASSED\n');

    await hostContext.close();
    await guestContext.close();

    return true;
  } catch (error) {
    console.error('\n❌ Disconnect test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Run all tests.
 */
async function runAllTests() {
  console.log('============================================');
  console.log('   WebRTC Mesh Automated Tests');
  console.log('============================================');
  console.log('\nMake sure the following are running:');
  console.log('  1. Signaling server: cd server/signaling && npm run dev');
  console.log('  2. Vite dev server: npm run dev\n');

  const results = [];

  results.push({ name: 'Two Peer Mesh', passed: await testTwoPeerMesh() });
  results.push({ name: 'Three Peer Mesh', passed: await testThreePeerMesh() });
  results.push({
    name: 'Invalid Room Code',
    passed: await testInvalidRoomCode(),
  });
  results.push({ name: 'Disconnect', passed: await testDisconnect() });

  console.log('\n============================================');
  console.log('   Test Results');
  console.log('============================================\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${result.name}`);
    if (result.passed) passed++;
    else failed++;
  }

  console.log(`\n  Total: ${passed} passed, ${failed} failed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
