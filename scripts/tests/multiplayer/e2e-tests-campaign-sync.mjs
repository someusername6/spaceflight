/**
 * Lobby E2E UI Tests - Campaign State Sync
 *
 * Tests for state synchronization between host and guests.
 * Note: The lobby screen doesn't navigate to store/squadron, so we test
 * sync using lobby-level interactions (ready state, chat, permissions).
 */

import { chromium } from 'playwright';
import {
  printResults,
  sleep,
  startServers,
  stopServers,
} from './e2e-test-utils.mjs';
import { setupHostAndGuest } from './e2e-tests-connection-helpers.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Chat messages sync between players.
 */
async function testChatMessageSync() {
  console.log('\n=== Test: Chat Messages Sync ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ChatGuest');
    console.log('  Both players connected');

    // Host sends a chat message
    const hostChatInput = hostPage.locator('#chat-input');
    await hostChatInput.fill('Hello from host!');
    await hostPage.locator('#chat-form button[type="submit"]').click();
    console.log('  Host: Sent chat message');

    // Wait for message to sync
    await sleep(300);

    // Check if guest sees the message
    const guestMessages = guestPage.locator('.chat-message:not(.system)');
    const messageTexts = await guestMessages.allTextContents();
    const hostMessageReceived = messageTexts.some((text) =>
      text.includes('Hello from host'),
    );

    console.log(`  Guest received host message: ${hostMessageReceived}`);

    // Guest sends a chat message
    const guestChatInput = guestPage.locator('#chat-input');
    await guestChatInput.fill('Hello from guest!');
    await guestPage.locator('#chat-form button[type="submit"]').click();
    console.log('  Guest: Sent chat message');

    // Wait for message to sync
    await sleep(300);

    // Check if host sees the guest message
    const hostMessages = hostPage.locator('.chat-message:not(.system)');
    const hostMessageTexts = await hostMessages.allTextContents();
    const guestMessageReceived = hostMessageTexts.some((text) =>
      text.includes('Hello from guest'),
    );

    console.log(`  Host received guest message: ${guestMessageReceived}`);

    if (hostMessageReceived && guestMessageReceived) {
      console.log('\n  Chat message sync test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error('Chat messages not syncing properly');
    }
  } catch (error) {
    console.error('\n  Chat message sync test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Permission changes are reflected in guest's context.
 */
async function testPermissionChangeAffectsContext() {
  console.log('\n=== Test: Permission Change Affects Context ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermCtxGuest');
    console.log('  Both players connected');

    // Host toggles canSell permission
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const canSellCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canSell"]',
    );
    const wasChecked = await canSellCheckbox.isChecked();
    console.log(`  Initial canSell state: ${wasChecked}`);

    // Toggle the permission
    if (wasChecked) {
      await canSellCheckbox.uncheck();
    } else {
      await canSellCheckbox.check();
    }
    console.log('  Host: Toggled canSell permission');

    // Wait for sync
    await sleep(500);

    // Verify system message appeared on guest's chat
    const systemMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    const permissionMessageReceived = systemMessages.some(
      (text) =>
        text.toLowerCase().includes('permission') ||
        text.toLowerCase().includes('can'),
    );

    console.log(
      `  Guest received permission change notification: ${permissionMessageReceived}`,
    );

    if (permissionMessageReceived) {
      console.log('\n  Permission change affects context test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error('Permission change notification not received');
    }
  } catch (error) {
    console.error(
      '\n  Permission change affects context test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Multiple permission changes sync correctly.
 */
async function testMultiplePermissionChanges() {
  console.log('\n=== Test: Multiple Permission Changes ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'MultiPermGuest');
    console.log('  Both players connected');

    // Host opens popover on guest
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    // Get all permission checkboxes
    const canBuyCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canBuy"]',
    );
    const canSellCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canSell"]',
    );
    const canConvertCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canConvertScrap"]',
    );

    // Toggle all permissions off
    if (await canBuyCheckbox.isChecked()) {
      await canBuyCheckbox.uncheck();
      console.log('  Host: Unchecked canBuy');
    }
    await sleep(200);

    if (await canSellCheckbox.isChecked()) {
      await canSellCheckbox.uncheck();
      console.log('  Host: Unchecked canSell');
    }
    await sleep(200);

    if (await canConvertCheckbox.isChecked()) {
      await canConvertCheckbox.uncheck();
      console.log('  Host: Unchecked canConvert');
    }

    // Wait for sync
    await sleep(500);

    // Count permission change messages on guest
    const systemMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    const permissionMessages = systemMessages.filter(
      (text) =>
        text.toLowerCase().includes('permission') ||
        text.toLowerCase().includes('can'),
    );

    console.log(
      `  Guest received ${permissionMessages.length} permission messages`,
    );

    // Should have at least received some permission notifications
    if (permissionMessages.length >= 1) {
      console.log('\n  Multiple permission changes test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error(
        'Did not receive expected permission change notifications',
      );
    }
  } catch (error) {
    console.error(
      '\n  Multiple permission changes test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Ready state syncs between players.
 */
async function testReadyStateSync() {
  console.log('\n=== Test: Ready State Syncs ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ReadyGuest');
    console.log('  Both players connected');

    // Check initial ready states
    const hostReadyBtn = hostPage.locator('#btn-ready');
    const guestReadyBtn = guestPage.locator('#btn-ready');

    // Host clicks ready
    await hostReadyBtn.click();
    console.log('  Host: Clicked ready');

    await sleep(300);

    // Check if host's ready state is visible to guest
    const hostRowOnGuest = guestPage.locator('.player-row').filter({
      has: guestPage.locator('.host-indicator'),
    });
    const hostReadyIndicator = hostRowOnGuest.locator('.ready-indicator.ready');
    const hostIsReady = (await hostReadyIndicator.count()) > 0;

    console.log(`  Guest sees host as ready: ${hostIsReady}`);

    // Guest clicks ready
    await guestReadyBtn.click();
    console.log('  Guest: Clicked ready');

    await sleep(300);

    // Check if guest's ready state is visible to host
    const guestRowOnHost = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });
    const guestReadyIndicator = guestRowOnHost.locator(
      '.ready-indicator.ready',
    );
    const guestIsReady = (await guestReadyIndicator.count()) > 0;

    console.log(`  Host sees guest as ready: ${guestIsReady}`);

    if (hostIsReady && guestIsReady) {
      console.log('\n  Ready state sync test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error('Ready state not syncing properly');
    }
  } catch (error) {
    console.error('\n  Ready state sync test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n============================================');
  console.log('   Lobby E2E Tests - State Sync');
  console.log('============================================\n');

  try {
    await startServers();
  } catch (error) {
    console.error('Failed to start servers:', error.message);
    process.exit(1);
  }

  const results = [];

  try {
    results.push({
      name: 'Ready state syncs',
      passed: await testReadyStateSync(),
    });

    results.push({
      name: 'Chat messages sync',
      passed: await testChatMessageSync(),
    });

    results.push({
      name: 'Permission change affects context',
      passed: await testPermissionChangeAffectsContext(),
    });

    results.push({
      name: 'Multiple permission changes',
      passed: await testMultiplePermissionChanges(),
    });
  } finally {
    await stopServers();
  }

  const { failed } = printResults(results);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
