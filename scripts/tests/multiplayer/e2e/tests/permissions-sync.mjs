/**
 * E2E Tests - Permission Sync
 *
 * Tests for permission synchronization between host and guest.
 * Total: 5 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import { setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Permission Sync Tests
// =============================================================================

function testPermissionChangeSync() {
  return runTest('Permission Change Sync', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const initialMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    console.log(`  Initial system messages: ${initialMessages.length}`);

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
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

    if (wasChecked) await canBuyCheckbox.uncheck();
    else await canBuyCheckbox.check();
    console.log('  Host: Toggled canBuy permission');

    await sleep(500);

    const newMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    const permissionMessageReceived =
      newMessages.length > initialMessages.length;
    console.log(`  New system messages: ${newMessages.length}`);
    console.log(
      `  Permission notification received: ${permissionMessageReceived}`,
    );

    if (!permissionMessageReceived)
      throw new Error('Permission change notification not received');

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestSeesPermissionsIndicator() {
  return runTest('Guest Sees Permissions Indicator', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const guestIndicator = guestPage.locator('.permissions-indicator');
    if (!(await guestIndicator.isVisible()))
      throw new Error('Guest should see permissions indicator');
    console.log('  Guest sees permissions indicator: true');

    const indicatorText = await guestIndicator.textContent();
    console.log(`  Indicator text: "${indicatorText}"`);
    if (!indicatorText?.includes('Own ship only')) {
      throw new Error(
        `Expected "Own ship only" in indicator, got: ${indicatorText}`,
      );
    }

    const hostIndicator = hostPage.locator('.permissions-indicator');
    if (await hostIndicator.isVisible().catch(() => false)) {
      throw new Error('Host should not see permissions indicator');
    }
    console.log('  Host sees permissions indicator: false');

    await hostContext.close();
    await guestContext.close();
  });
}

function testPermissionsIndicatorUpdates() {
  return runTest('Permissions Indicator Updates', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const indicator = guestPage.locator('.permissions-indicator');
    let indicatorText = await indicator.textContent();
    console.log(`  Initial indicator: "${indicatorText}"`);
    if (!indicatorText?.includes('Own ship only')) {
      throw new Error(
        `Expected initial "Own ship only", got: ${indicatorText}`,
      );
    }

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
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
    await sleep(500);

    indicatorText = await indicator.textContent();
    console.log(`  Updated indicator: "${indicatorText}"`);
    if (!indicatorText?.includes('No loadout access')) {
      throw new Error(
        `Expected "No loadout access" after change, got: ${indicatorText}`,
      );
    }

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
    await sleep(500);

    indicatorText = await indicator.textContent();
    console.log(`  Final indicator: "${indicatorText}"`);
    if (!indicatorText?.includes('Full loadout access')) {
      throw new Error(
        `Expected "Full loadout access" after change, got: ${indicatorText}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testPermissionsIndicatorStoreRestrictions() {
  return runTest(
    'Permissions Indicator Store Restrictions',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      const guestRow = hostPage
        .locator('.player-row')
        .filter({ hasNot: hostPage.locator('.host-indicator') });
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
      await sleep(500);

      const indicator = guestPage.locator('.permissions-indicator');
      let indicatorText = await indicator.textContent();
      console.log(`  Indicator after revoking canBuy: "${indicatorText}"`);
      if (!indicatorText?.includes('No buying')) {
        throw new Error(
          `Expected "No buying" in indicator, got: ${indicatorText}`,
        );
      }

      await hostPage.mouse.move(0, 0);
      await sleep(200);
      await hostPage.evaluate(() => {
        for (const el of document.querySelectorAll('.host-popover'))
          el.remove();
      });
      await sleep(100);

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
      await sleep(500);

      indicatorText = await indicator.textContent();
      console.log(`  Indicator after revoking both: "${indicatorText}"`);
      if (!indicatorText?.includes('No store access')) {
        throw new Error(
          `Expected "No store access" in indicator, got: ${indicatorText}`,
        );
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testMultiplePermissionChangesSync() {
  return runTest('Multiple Permission Changes Sync', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const initialCount = await guestPage
      .locator('.chat-message.system')
      .count();

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const canBuyCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canBuy"]',
    );
    const canSellCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canSell"]',
    );

    if (await canBuyCheckbox.isChecked()) await canBuyCheckbox.uncheck();
    else await canBuyCheckbox.check();
    console.log('  Host: Toggled canBuy');
    await sleep(300);

    if (await canSellCheckbox.isChecked()) await canSellCheckbox.uncheck();
    else await canSellCheckbox.check();
    console.log('  Host: Toggled canSell');
    await sleep(300);

    const finalCount = await guestPage.locator('.chat-message.system').count();
    const newMessages = finalCount - initialCount;
    console.log(`  Guest received ${newMessages} permission messages`);

    if (newMessages < 2)
      throw new Error(
        `Expected at least 2 permission messages, got ${newMessages}`,
      );

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

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
  runTestSuite('Permission Sync Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
