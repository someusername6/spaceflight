/**
 * Lobby E2E Navigation Tests
 *
 * Tests for basic navigation: title screen, host game, join game.
 */

import { isMainModule, runTest, runTestSuite, VITE_URL } from './utils.mjs';

/**
 * Test: Title screen has multiplayer buttons.
 */
function testTitleScreenButtons() {
  return runTest('Title Screen Buttons', async (browser) => {
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

    await context.close();
  });
}

/**
 * Test: Host Game leads to load campaign screen.
 */
function testHostGameNavigation() {
  return runTest('Host Game Navigation', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

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

    await context.close();
  });
}

/**
 * Test: Join Game leads to join game screen.
 */
function testJoinGameNavigation() {
  return runTest('Join Game Navigation', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

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

    await context.close();
  });
}

export const ALL_TESTS = [
  { name: 'Title Screen Buttons', fn: testTitleScreenButtons },
  { name: 'Host Game Navigation', fn: testHostGameNavigation },
  { name: 'Join Game Navigation', fn: testJoinGameNavigation },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Navigation Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
