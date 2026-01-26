/**
 * Lobby E2E Navigation Tests
 *
 * Tests for basic navigation: title screen, host game, join game.
 */

import { chromium } from 'playwright';
import { VITE_URL } from './e2e-test-utils.mjs';

/**
 * Test: Title screen has multiplayer buttons.
 */
export async function testTitleScreenButtons() {
  console.log('\n=== Test: Title Screen Buttons ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log any page errors
    page.on('pageerror', (err) => {
      console.log(`  [Page Error] ${err.message}`);
    });

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

    // Wait for title screen
    await page.waitForSelector('#btn-play', {
      state: 'visible',
      timeout: 15000,
    });

    // Check for multiplayer buttons
    const hostGameBtn = await page.locator('#btn-host-game').isVisible();
    const joinGameBtn = await page.locator('#btn-join-game').isVisible();

    if (!hostGameBtn) {
      throw new Error('Host Game button not found');
    }
    if (!joinGameBtn) {
      throw new Error('Join Game button not found');
    }

    console.log('  Host Game button: visible');
    console.log('  Join Game button: visible');

    console.log('\n✅ Title screen buttons test PASSED\n');
    await context.close();
    return true;
  } catch (error) {
    console.error(
      '\n❌ Title screen buttons test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Host Game leads to load campaign screen.
 */
export async function testHostGameNavigation() {
  console.log('\n=== Test: Host Game Navigation ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL);

    // Click Host Game
    await page.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 10000,
    });
    await page.click('#btn-host-game');
    console.log('  Clicked Host Game');

    // Should show load campaign screen
    await page.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Load campaign screen visible');

    // Check for campaign slots
    const slots = await page.locator('.save-slot').count();
    if (slots === 0) {
      throw new Error('No campaign slots found');
    }
    console.log(`  Campaign slots found: ${slots}`);

    console.log('\n✅ Host game navigation test PASSED\n');
    await context.close();
    return true;
  } catch (error) {
    console.error(
      '\n❌ Host game navigation test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Join Game leads to join game screen.
 */
export async function testJoinGameNavigation() {
  console.log('\n=== Test: Join Game Navigation ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL);

    // Click Join Game
    await page.waitForSelector('#btn-join-game', {
      state: 'visible',
      timeout: 10000,
    });
    await page.click('#btn-join-game');
    console.log('  Clicked Join Game');

    // Should show join game screen with room code input
    await page.waitForSelector('.join-game-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Join game screen visible');

    // Check for room code input
    const roomCodeInput = await page.locator('input').first();
    const isVisible = await roomCodeInput.isVisible();
    if (!isVisible) {
      throw new Error('Room code input not found');
    }
    console.log('  Room code input visible');

    // Check for back button
    const backBtn = await page.locator('#btn-back').isVisible();
    if (!backBtn) {
      throw new Error('Back button not found');
    }
    console.log('  Back button visible');

    console.log('\n✅ Join game navigation test PASSED\n');
    await context.close();
    return true;
  } catch (error) {
    console.error(
      '\n❌ Join game navigation test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}
