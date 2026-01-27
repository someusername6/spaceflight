/**
 * Lobby E2E UI Tests - Permission Sync
 *
 * Tests for permission synchronization between host and guests.
 * Split from e2e-tests-permissions.mjs to stay under 400 line limit.
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
 * Test: Permission change syncs to guest via system message.
 * Verifies the permission sync triggers context update.
 */
export async function testPermissionChangeSync() {
  console.log('\n=== Test: Permission Change Sync ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermSyncGuest');
    console.log('  Both players connected');

    // Get initial guest permissions via chat system message
    const initialMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    console.log(`  Initial system messages: ${initialMessages.length}`);

    // Host changes canBuy permission
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const canBuyCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canBuy"]',
    );
    const wasChecked = await canBuyCheckbox.isChecked();
    console.log(`  Initial canBuy: ${wasChecked}`);

    // Toggle permission
    if (wasChecked) {
      await canBuyCheckbox.uncheck();
    } else {
      await canBuyCheckbox.check();
    }
    console.log('  Host: Toggled canBuy permission');

    // Wait for sync
    await sleep(500);

    // Check that system message appeared
    const newMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    const permissionMessageReceived =
      newMessages.length > initialMessages.length;

    console.log(`  New system messages: ${newMessages.length}`);
    console.log(
      `  Permission notification received: ${permissionMessageReceived}`,
    );

    if (permissionMessageReceived) {
      console.log('\n  Permission change sync test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error('Permission change notification not received');
    }
  } catch (error) {
    console.error(
      '\n  Permission change sync test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Multiple permission changes are all received by guest.
 */
export async function testMultiplePermissionChangesSync() {
  console.log('\n=== Test: Multiple Permission Changes Sync ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'MultiPermSyncGuest');
    console.log('  Both players connected');

    // Count initial system messages
    const initialCount = await guestPage
      .locator('.chat-message.system')
      .count();

    // Host opens popover
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

    // Toggle canBuy
    if (await canBuyCheckbox.isChecked()) {
      await canBuyCheckbox.uncheck();
    } else {
      await canBuyCheckbox.check();
    }
    console.log('  Host: Toggled canBuy');
    await sleep(300);

    // Toggle canSell
    if (await canSellCheckbox.isChecked()) {
      await canSellCheckbox.uncheck();
    } else {
      await canSellCheckbox.check();
    }
    console.log('  Host: Toggled canSell');
    await sleep(300);

    // Count new system messages
    const finalCount = await guestPage.locator('.chat-message.system').count();
    const newMessages = finalCount - initialCount;

    console.log(`  Guest received ${newMessages} permission messages`);

    if (newMessages >= 2) {
      console.log('\n  Multiple permission changes sync test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error(
        `Expected at least 2 permission messages, got ${newMessages}`,
      );
    }
  } catch (error) {
    console.error(
      '\n  Multiple permission changes sync test FAILED:',
      error.message,
      '\n',
    );
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
  console.log('   Lobby E2E Tests - Permission Sync');
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
      name: 'Permission change syncs to guest',
      passed: await testPermissionChangeSync(),
    });

    results.push({
      name: 'Multiple permission changes sync',
      passed: await testMultiplePermissionChangesSync(),
    });
  } finally {
    await stopServers();
  }

  const { failed } = printResults(results);

  process.exit(failed > 0 ? 1 : 0);
}

// Only run when executed directly, not when imported
const isMainModule = process.argv[1]?.endsWith('e2e-tests-permission-sync.mjs');
if (isMainModule) {
  main().catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
