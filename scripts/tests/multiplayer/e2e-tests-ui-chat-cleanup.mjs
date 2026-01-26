/**
 * Lobby E2E UI Tests - Chat and Cleanup
 *
 * Tests for chat messaging and back button cleanup/resource management.
 */

import { chromium } from 'playwright';
import { VITE_URL } from './e2e-test-utils.mjs';

/**
 * Test: Chat messaging between host and guest.
 */
export async function testChatMessaging() {
  console.log('\n=== Test: Chat Messaging ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    hostPage.on('pageerror', (err) => {
      console.log(`  [Host Error] ${err.message}`);
    });
    guestPage.on('pageerror', (err) => {
      console.log(`  [Guest Error] ${err.message}`);
    });

    // === Setup: Get both players into lobby ===
    await hostPage.goto(VITE_URL, { waitUntil: 'networkidle' });

    await hostPage.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 15000,
    });
    await hostPage.click('#btn-host-game');

    await hostPage.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });

    const hostOccupiedSlot = await hostPage
      .locator('.save-slot.occupied')
      .first();
    const hostHasOccupied = await hostOccupiedSlot
      .isVisible()
      .catch(() => false);

    if (hostHasOccupied) {
      await hostOccupiedSlot.click();
    } else {
      await hostPage.locator('.save-slot.empty').first().click();
      await hostPage.waitForSelector('.campaign-create-modal', {
        state: 'visible',
        timeout: 5000,
      });
      await hostPage.click('#btn-start');
    }

    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Host: In lobby');

    const roomCode = (
      await hostPage.locator('.lobby-screen .room-code-value').textContent()
    )?.trim();

    await guestPage.goto(VITE_URL, { waitUntil: 'networkidle' });
    await guestPage.waitForSelector('#btn-join-game', {
      state: 'visible',
      timeout: 15000,
    });
    await guestPage.click('#btn-join-game');

    await guestPage.waitForSelector('.join-game-screen', {
      state: 'visible',
      timeout: 5000,
    });
    const roomCodeWithoutSpace = roomCode.replace(/\s+/g, '');
    await guestPage.fill('#room-code', roomCodeWithoutSpace);

    const callsignInput = guestPage.locator('#callsign');
    if (await callsignInput.isVisible().catch(() => false)) {
      await callsignInput.fill('ChatGuest');
    }

    await guestPage.click('#btn-join');

    await guestPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Guest: In lobby');

    await Promise.all([
      hostPage.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 2,
        { timeout: 15000 },
      ),
      guestPage.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 2,
        { timeout: 15000 },
      ),
    ]);
    console.log('  Both players connected');

    // === Test: Host sends a chat message ===
    const testMessage = 'Hello from host!';
    await hostPage.fill('#chat-input', testMessage);
    await hostPage.press('#chat-input', 'Enter');
    console.log('  Host: Sent chat message');

    await hostPage.waitForFunction(
      (msg) => {
        const messages = document.querySelectorAll(
          '.chat-message:not(.system)',
        );
        return Array.from(messages).some((el) => el.textContent?.includes(msg));
      },
      testMessage,
      { timeout: 10000 },
    );
    console.log('  Host: Sees own message');

    await guestPage.waitForFunction(
      (msg) => {
        const messages = document.querySelectorAll(
          '.chat-message:not(.system)',
        );
        return Array.from(messages).some((el) => el.textContent?.includes(msg));
      },
      testMessage,
      { timeout: 10000 },
    );
    console.log('  Guest: Sees host message');

    // === Test: Guest sends a chat message ===
    const guestMessage = 'Reply from guest!';
    await guestPage.fill('#chat-input', guestMessage);
    await guestPage.press('#chat-input', 'Enter');
    console.log('  Guest: Sent chat message');

    await Promise.all([
      hostPage.waitForFunction(
        (msg) => {
          const messages = document.querySelectorAll(
            '.chat-message:not(.system)',
          );
          return Array.from(messages).some((el) =>
            el.textContent?.includes(msg),
          );
        },
        guestMessage,
        { timeout: 10000 },
      ),
      guestPage.waitForFunction(
        (msg) => {
          const messages = document.querySelectorAll(
            '.chat-message:not(.system)',
          );
          return Array.from(messages).some((el) =>
            el.textContent?.includes(msg),
          );
        },
        guestMessage,
        { timeout: 10000 },
      ),
    ]);
    console.log('  Both: See guest message');

    console.log('\n✅ Chat messaging test PASSED\n');
    await hostContext.close();
    await guestContext.close();
    return true;
  } catch (error) {
    console.error('\n❌ Chat messaging test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Back button returns to title with proper cleanup.
 */
export async function testBackButtonCleanup() {
  console.log('\n=== Test: Back Button Cleanup ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => {
      console.log(`  [Page Error] ${err.message}`);
    });

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

    await page.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 15000,
    });
    await page.click('#btn-host-game');
    console.log('  Clicked Host Game');

    await page.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });

    const occupiedSlot = await page.locator('.save-slot.occupied').first();
    const hasOccupied = await occupiedSlot.isVisible().catch(() => false);

    if (hasOccupied) {
      await occupiedSlot.click();
    } else {
      await page.locator('.save-slot.empty').first().click();
      await page.waitForSelector('.campaign-create-modal', {
        state: 'visible',
        timeout: 5000,
      });
      await page.click('#btn-start');
    }

    await page.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  In lobby');

    const roomCode = await page
      .locator('.lobby-screen .room-code-value')
      .textContent();
    console.log(`  Room code: ${roomCode?.trim()}`);

    await page.click('.lobby-screen #btn-back');
    console.log('  Clicked Leave button');

    await page.waitForSelector('#btn-play', {
      state: 'visible',
      timeout: 10000,
    });
    console.log('  Returned to title screen');

    const lobbyVisible = await page
      .locator('.lobby-screen')
      .isVisible()
      .catch(() => false);
    if (lobbyVisible) {
      throw new Error('Lobby still visible after leaving');
    }
    console.log('  Lobby screen cleaned up');

    const hostBtnVisible = await page.locator('#btn-host-game').isVisible();
    const joinBtnVisible = await page.locator('#btn-join-game').isVisible();

    if (!hostBtnVisible || !joinBtnVisible) {
      throw new Error('Multiplayer buttons not visible after returning');
    }
    console.log('  Multiplayer buttons accessible');

    await page.click('#btn-host-game');
    console.log('  Clicked Host Game again');

    await page.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Can access load campaign screen - cleanup successful');

    console.log('\n✅ Back button cleanup test PASSED\n');
    await context.close();
    return true;
  } catch (error) {
    console.error('\n❌ Back button cleanup test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}
