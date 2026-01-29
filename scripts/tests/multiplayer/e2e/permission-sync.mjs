/**
 * Lobby E2E UI Tests - Permission Sync
 *
 * Tests for permission synchronization between host and guests.
 * Split from e2e-tests-permissions.mjs to stay under 400 line limit.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Permission change syncs to guest via system message.
 * Verifies the permission sync triggers context update.
 */
export function testPermissionChangeSync() {
  return runTest('Permission Change Sync', async (browser) => {
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
      await hostContext.close();
      await guestContext.close();
    } else {
      throw new Error('Permission change notification not received');
    }
  });
}

/**
 * Test: Guest sees permissions indicator with default permissions.
 */
export function testGuestSeesPermissionsIndicator() {
  return runTest('Guest Sees Permissions Indicator', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermIndGuest');
    console.log('  Both players connected');

    // Guest should see permissions indicator
    const guestIndicator = guestPage.locator('.permissions-indicator');
    const guestHasIndicator = await guestIndicator.isVisible();
    console.log(`  Guest sees permissions indicator: ${guestHasIndicator}`);

    if (!guestHasIndicator) {
      throw new Error('Guest should see permissions indicator');
    }

    // Check indicator shows default permissions (Own ship only)
    const indicatorText = await guestIndicator.textContent();
    console.log(`  Indicator text: "${indicatorText}"`);

    if (!indicatorText?.includes('Own ship only')) {
      throw new Error(
        `Expected "Own ship only" in indicator, got: ${indicatorText}`,
      );
    }

    // Host should NOT see permissions indicator
    const hostIndicator = hostPage.locator('.permissions-indicator');
    const hostHasIndicator = await hostIndicator.isVisible().catch(() => false);
    console.log(`  Host sees permissions indicator: ${hostHasIndicator}`);

    if (hostHasIndicator) {
      throw new Error('Host should not see permissions indicator');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Permissions indicator updates when host changes permissions.
 */
export function testPermissionsIndicatorUpdates() {
  return runTest('Permissions Indicator Updates', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'PermIndUpdGuest');
    console.log('  Both players connected');

    // Check initial indicator shows "Own ship only"
    const indicator = guestPage.locator('.permissions-indicator');
    let indicatorText = await indicator.textContent();
    console.log(`  Initial indicator: "${indicatorText}"`);

    if (!indicatorText?.includes('Own ship only')) {
      throw new Error(
        `Expected initial "Own ship only", got: ${indicatorText}`,
      );
    }

    // Host changes shipEdit to 'none'
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const shipEditSelect = hostPage.locator(
      '.host-popover select[data-permission="shipEdit"]',
    );
    await shipEditSelect.selectOption('none');
    console.log('  Host set shipEdit to none');

    // Wait for sync
    await sleep(500);

    // Check indicator updated to show "No loadout access"
    indicatorText = await indicator.textContent();
    console.log(`  Updated indicator: "${indicatorText}"`);

    if (!indicatorText?.includes('No loadout access')) {
      throw new Error(
        `Expected "No loadout access" after change, got: ${indicatorText}`,
      );
    }

    // Host changes shipEdit to 'any'
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const shipEditSelectAny = hostPage
      .locator('.host-popover select[data-permission="shipEdit"]')
      .first();
    await shipEditSelectAny.selectOption('any');
    console.log('  Host set shipEdit to any');

    // Wait for sync
    await sleep(500);

    // Check indicator updated to show "Full loadout access"
    indicatorText = await indicator.textContent();
    console.log(`  Final indicator: "${indicatorText}"`);

    if (!indicatorText?.includes('Full loadout access')) {
      throw new Error(
        `Expected "Full loadout access" after change, got: ${indicatorText}`,
      );
    }

    console.log('  ✓ Permissions indicator updates correctly');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Permissions indicator shows store restrictions.
 */
export function testPermissionsIndicatorStoreRestrictions() {
  return runTest(
    'Permissions Indicator Store Restrictions',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'PermIndStoreGuest');
      console.log('  Both players connected');

      // Host revokes canBuy
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
      await canBuyCheckbox.uncheck();
      console.log('  Host revoked canBuy');

      // Wait for sync
      await sleep(500);

      // Check indicator shows "No buying"
      const indicator = guestPage.locator('.permissions-indicator');
      let indicatorText = await indicator.textContent();
      console.log(`  Indicator after revoking canBuy: "${indicatorText}"`);

      if (!indicatorText?.includes('No buying')) {
        throw new Error(
          `Expected "No buying" in indicator, got: ${indicatorText}`,
        );
      }

      // Clean up popover before opening again
      await hostPage.mouse.move(0, 0);
      await sleep(200);
      await hostPage.evaluate(() => {
        for (const el of document.querySelectorAll('.host-popover')) {
          el.remove();
        }
      });
      await sleep(100);

      // Host also revokes canSell
      await guestRow.hover();
      await hostPage.waitForSelector('.host-popover', {
        state: 'visible',
        timeout: 5000,
      });

      const canSellCheckbox = hostPage
        .locator('.host-popover input[data-permission="canSell"]')
        .first();
      await canSellCheckbox.uncheck();
      console.log('  Host revoked canSell');

      // Wait for sync
      await sleep(500);

      // Check indicator shows "No store access"
      indicatorText = await indicator.textContent();
      console.log(`  Indicator after revoking both: "${indicatorText}"`);

      if (!indicatorText?.includes('No store access')) {
        throw new Error(
          `Expected "No store access" in indicator, got: ${indicatorText}`,
        );
      }

      console.log('  ✓ Permissions indicator shows store restrictions');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test: Multiple permission changes are all received by guest.
 */
export function testMultiplePermissionChangesSync() {
  return runTest('Multiple Permission Changes Sync', async (browser) => {
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
      await hostContext.close();
      await guestContext.close();
    } else {
      throw new Error(
        `Expected at least 2 permission messages, got ${newMessages}`,
      );
    }
  });
}

// =============================================================================
// Main
// =============================================================================

/** All test definitions */
export const ALL_TESTS = [
  { name: 'Permission change syncs to guest', fn: testPermissionChangeSync },
  {
    name: 'Guest sees permissions indicator',
    fn: testGuestSeesPermissionsIndicator,
  },
  {
    name: 'Permissions indicator updates',
    fn: testPermissionsIndicatorUpdates,
  },
  {
    name: 'Permissions indicator store restrictions',
    fn: testPermissionsIndicatorStoreRestrictions,
  },
  {
    name: 'Multiple permission changes sync',
    fn: testMultiplePermissionChangesSync,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Lobby E2E Tests - Permission Sync', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
