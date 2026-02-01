/**
 * E2E Tests - System Messages
 *
 * Tests that system events generate appropriate chat messages.
 * Total: 4 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import { navigateTo, setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Tests
// =============================================================================

function testEquipmentChangeSystemMessage() {
  return runTest(
    'Equipment change generates system message',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'SysMsgGuest');
      console.log('  Both players connected');

      // Count initial system messages
      const initialMsgCount = await hostPage.evaluate(
        () => document.querySelectorAll('.chat-message.system').length,
      );
      console.log(`  Initial system messages: ${initialMsgCount}`);

      // Navigate host to squadron
      await navigateTo(hostPage, 'squadron');
      console.log('  Host on squadron screen');

      // Wait for deployed ships
      await hostPage.waitForSelector('[data-deployed-id]', {
        state: 'visible',
        timeout: 5000,
      });

      // Click on first deployed ship
      await hostPage.click('[data-deployed-id]');
      await hostPage.waitForSelector('.schematic-diagram', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Ship viewer visible');

      // Find a filled weapon slot and click it
      const filledSlot = hostPage.locator('.schematic-slot.filled').first();
      if (!(await filledSlot.isVisible().catch(() => false))) {
        console.log('  No filled weapon slots, skipping equipment test');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      await filledSlot.click();
      await hostPage.waitForSelector('.weapon-popover', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Weapon popover visible');

      // Click unequip
      await hostPage.click('.btn-unequip');
      await sleep(500);
      console.log('  Clicked unequip');

      // Navigate back to lobby to see chat
      await navigateTo(hostPage, 'lobby');
      await sleep(300);

      // Check for equipment system message
      const hasEquipMsg = await hostPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some(
          (m) =>
            m.textContent?.includes('unequipped') ||
            m.textContent?.includes('equipped'),
        );
      });

      console.log(`  Equipment system message found: ${hasEquipMsg}`);

      // Also check guest sees the message
      const guestHasMsg = await guestPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some(
          (m) =>
            m.textContent?.includes('unequipped') ||
            m.textContent?.includes('equipped'),
        );
      });
      console.log(`  Guest sees equipment message: ${guestHasMsg}`);

      if (!hasEquipMsg) {
        throw new Error('Equipment change did not generate system message');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testStoreTransactionSystemMessage() {
  return runTest(
    'Store transaction generates system message',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'StoreMsgGuest');
      console.log('  Both players connected');

      // Navigate host to store
      await navigateTo(hostPage, 'store');
      console.log('  Host on store screen');

      // Select first item
      const storeItem = hostPage.locator('.store-item').first();
      if (!(await storeItem.isVisible().catch(() => false))) {
        throw new Error('No store items visible');
      }
      await storeItem.click();
      await sleep(200);

      // Click buy
      const buyBtn = hostPage.locator('.btn-buy:not([disabled])').first();
      if (!(await buyBtn.isVisible().catch(() => false))) {
        console.log('  No buy button available, checking for other actions');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      await buyBtn.click();
      await sleep(500);
      console.log('  Clicked buy');

      // Navigate back to lobby to see chat
      await navigateTo(hostPage, 'lobby');
      await sleep(300);

      // Check for transaction system message
      const hasBuyMsg = await hostPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.includes('bought'),
        );
      });

      console.log(`  Buy system message found: ${hasBuyMsg}`);

      // Guest should also see it
      const guestHasMsg = await guestPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.includes('bought'),
        );
      });
      console.log(`  Guest sees buy message: ${guestHasMsg}`);

      if (!hasBuyMsg) {
        throw new Error('Store purchase did not generate system message');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testResupplySystemMessage() {
  return runTest('Resupply generates system message', async (browser) => {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'ResupplyMsgGuest',
    );
    console.log('  Both players connected');

    // Navigate host to squadron
    await navigateTo(hostPage, 'squadron');
    console.log('  Host on squadron screen');

    // Wait for deployed ships
    await hostPage.waitForSelector('[data-deployed-id]', {
      state: 'visible',
      timeout: 5000,
    });

    // Click resupply all if available
    const resupplyAllBtn = hostPage.locator('#btn-resupply-all');
    if (await resupplyAllBtn.isVisible().catch(() => false)) {
      await resupplyAllBtn.click();
      await sleep(500);
      console.log('  Clicked resupply all');

      // Navigate back to lobby to see chat
      await navigateTo(hostPage, 'lobby');
      await sleep(300);

      // Check for resupply system message
      const hasResupplyMsg = await hostPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.includes('resupplied'),
        );
      });

      console.log(`  Resupply system message found: ${hasResupplyMsg}`);

      if (!hasResupplyMsg) {
        throw new Error('Resupply did not generate system message');
      }
    } else {
      console.log('  No resupply button visible (ships may be full)');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testPermissionChangeSystemMessage() {
  return runTest(
    'Permission change generates system message',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'PermMsgGuest');
      console.log('  Both players connected');

      // Count initial system messages
      const initialMsgCount = await hostPage.evaluate(
        () => document.querySelectorAll('.chat-message.system').length,
      );
      console.log(`  Initial system messages: ${initialMsgCount}`);

      // Host hovers over guest row
      const guestRow = hostPage.locator('.player-row').nth(1);
      await guestRow.hover();

      // Wait for popover
      await hostPage.waitForSelector('.host-popover', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Popover visible');

      // Toggle a permission checkbox
      const canBuyCheckbox = hostPage.locator(
        'input[data-permission="canBuy"]',
      );
      await canBuyCheckbox.click();
      await sleep(500);
      console.log('  Toggled canBuy permission');

      // Close popover by clicking elsewhere
      await hostPage.click('.lobby-screen');
      await sleep(300);

      // Check for permission system message
      const hasPermMsg = await hostPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some(
          (m) =>
            m.textContent?.includes('permission') ||
            m.textContent?.includes('can no longer') ||
            m.textContent?.includes('can now'),
        );
      });

      console.log(`  Permission system message found: ${hasPermMsg}`);

      // Guest should also see it
      const guestHasMsg = await guestPage.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some(
          (m) =>
            m.textContent?.includes('permission') ||
            m.textContent?.includes('can no longer') ||
            m.textContent?.includes('can now'),
        );
      });
      console.log(`  Guest sees permission message: ${guestHasMsg}`);

      if (!hasPermMsg) {
        throw new Error('Permission change did not generate system message');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Equipment change system message',
    fn: testEquipmentChangeSystemMessage,
  },
  {
    name: 'Store transaction system message',
    fn: testStoreTransactionSystemMessage,
  },
  { name: 'Resupply system message', fn: testResupplySystemMessage },
  {
    name: 'Permission change system message',
    fn: testPermissionChangeSystemMessage,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('System Messages Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
