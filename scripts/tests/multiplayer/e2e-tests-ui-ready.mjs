/**
 * Lobby E2E UI Tests - Ready Toggle
 *
 * Tests for ready button toggle and sync.
 */

import { chromium } from 'playwright';
import { setupHostAndGuest } from './e2e-tests-connection-helpers.mjs';

/**
 * Test: Ready button toggle and sync between players.
 */
export async function testReadyToggle() {
  console.log('\n=== Test: Ready Button Toggle ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ReadyGuest');
    console.log('  Both players connected');

    const hostReadyBtn = hostPage.locator('.lobby-screen #btn-ready');
    const guestReadyBtn = guestPage.locator('.lobby-screen #btn-ready');

    const hostHasReadyActive = await hostReadyBtn.evaluate((el) =>
      el.classList.contains('ready-active'),
    );
    const guestHasReadyActive = await guestReadyBtn.evaluate((el) =>
      el.classList.contains('ready-active'),
    );
    console.log(
      `  Initial state - Host ready: ${hostHasReadyActive}, Guest ready: ${guestHasReadyActive}`,
    );

    await hostReadyBtn.click();
    console.log('  Host: Clicked Ready');

    await hostPage.waitForFunction(
      () => {
        const btn = document.querySelector('.lobby-screen #btn-ready');
        return btn?.classList.contains('ready-active');
      },
      { timeout: 10000 },
    );
    console.log('  Host: Button shows ready state');

    await guestPage.waitForFunction(
      () => {
        const readyIndicators = document.querySelectorAll(
          '.ready-indicator.ready',
        );
        return readyIndicators.length >= 1;
      },
      { timeout: 10000 },
    );
    console.log('  Guest: Sees host is ready');

    await guestReadyBtn.click();
    console.log('  Guest: Clicked Ready');

    await guestPage.waitForFunction(
      () => {
        const btn = document.querySelector('.lobby-screen #btn-ready');
        return btn?.classList.contains('ready-active');
      },
      { timeout: 10000 },
    );
    console.log('  Guest: Button shows ready state');

    await hostPage.waitForFunction(
      () => {
        const readyIndicators = document.querySelectorAll(
          '.ready-indicator.ready',
        );
        return readyIndicators.length >= 2;
      },
      { timeout: 10000 },
    );
    console.log('  Host: Sees both players ready');

    await hostReadyBtn.click();
    console.log('  Host: Clicked to unready');

    await hostPage.waitForFunction(
      () => {
        const btn = document.querySelector('.lobby-screen #btn-ready');
        return btn && !btn.classList.contains('ready-active');
      },
      { timeout: 10000 },
    );
    console.log('  Host: Button shows not ready state');

    console.log('\n✅ Ready button toggle test PASSED\n');
    await hostContext.close();
    await guestContext.close();
    return true;
  } catch (error) {
    console.error('\n❌ Ready button toggle test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}
