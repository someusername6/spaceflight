/**
 * E2E Tests - State Sync Permissions
 *
 * Permission-related state synchronization tests.
 * Extracted from e2e-tests-state-sync.mjs to keep files under 400 lines.
 */

import { chromium } from 'playwright';
import {
  printResults,
  sleep,
  startServers,
  stopServers,
} from './e2e-test-utils.mjs';
import { setupHostAndGuest } from './e2e-tests-connection-helpers.mjs';

/**
 * Test: Permission change updates multiplayer context.
 * Verifies the permission sync triggers context update.
 */
export async function testPermissionChangeUpdatesContext() {
  console.log('\n=== Test: Permission Change Updates Context ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermCtxGuest');
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
      console.log('\n  Permission change updates context test PASSED\n');
      await hostContext.close();
      await guestContext.close();
      return true;
    } else {
      throw new Error('Permission change notification not received');
    }
  } catch (error) {
    console.error(
      '\n  Permission change updates context test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Multiple permission changes are all received.
 */
export async function testMultiplePermissionChangesReceived() {
  console.log('\n=== Test: Multiple Permission Changes Received ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'MultiPermGuest');
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
      console.log('\n  Multiple permission changes test PASSED\n');
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
      '\n  Multiple permission changes test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

// =============================================================================
// Main (for standalone execution)
// =============================================================================

async function main() {
  console.log('\n============================================');
  console.log('   E2E Tests - State Sync Permissions');
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
      name: 'Permission change updates context',
      passed: await testPermissionChangeUpdatesContext(),
    });

    results.push({
      name: 'Multiple permission changes received',
      passed: await testMultiplePermissionChangesReceived(),
    });
  } finally {
    await stopServers();
  }

  const { failed } = printResults(results);
  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
const isMain = process.argv[1]?.endsWith(
  'e2e-tests-state-sync-permissions.mjs',
);
if (isMain) {
  main().catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
