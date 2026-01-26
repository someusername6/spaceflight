/**
 * Lobby E2E UI Tests - Copy and Ping
 *
 * Tests for copy room code and ping display.
 */

import { chromium } from 'playwright';
import { VITE_URL } from './e2e-test-utils.mjs';

/**
 * Test: Copy room code button works.
 */
export async function testCopyRoomCode() {
  console.log('\n=== Test: Copy Room Code Button ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
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

    const roomCodeElement = page.locator('.lobby-screen .room-code-value');
    const displayedRoomCode = (await roomCodeElement.textContent())?.trim();
    console.log(`  Room code: ${displayedRoomCode}`);

    const copyBtn = page.locator('.lobby-screen #btn-copy');
    const copyBtnVisible = await copyBtn.isVisible();
    if (!copyBtnVisible) {
      throw new Error('Copy button not visible');
    }
    console.log('  Copy button visible');

    await copyBtn.click();
    console.log('  Clicked copy button');

    await page.waitForFunction(
      () => {
        const btn = document.querySelector('.lobby-screen #btn-copy');
        return btn?.textContent?.includes('Copied');
      },
      { timeout: 5000 },
    );
    console.log('  Button shows "Copied!" state');

    const hasCopiedClass = await copyBtn.evaluate((el) =>
      el.classList.contains('copied'),
    );
    if (!hasCopiedClass) {
      throw new Error('Copy button missing "copied" class');
    }
    console.log('  Button has "copied" class');

    console.log('\n✅ Copy room code button test PASSED\n');
    await context.close();
    return true;
  } catch (error) {
    console.error(
      '\n❌ Copy room code button test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Ping display is shown for all players.
 */
export async function testPingDisplay() {
  console.log('\n=== Test: Ping Display ===\n');

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

    const pingElement = page.locator('.ping');
    const pingVisible = await pingElement.isVisible();
    if (!pingVisible) {
      throw new Error('Ping element not visible');
    }
    console.log('  Ping element visible');

    const pingText = await pingElement.textContent();
    if (!pingText?.includes('ms')) {
      throw new Error(`Ping should show "ms" unit, got: ${pingText}`);
    }
    console.log(`  Ping shows: ${pingText}`);

    const hasValidPingClass = await pingElement.evaluate((el) => {
      return (
        el.classList.contains('ping-good') ||
        el.classList.contains('ping-medium') ||
        el.classList.contains('ping-bad')
      );
    });
    if (!hasValidPingClass) {
      throw new Error('Ping missing quality class (ping-good/medium/bad)');
    }
    console.log('  Ping has quality class');

    console.log('\n✅ Ping display test PASSED\n');
    await context.close();
    return true;
  } catch (error) {
    console.error('\n❌ Ping display test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}
