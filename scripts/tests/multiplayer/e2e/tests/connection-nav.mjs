/**
 * E2E Tests - Connection Navigation
 *
 * Tests for title screen and navigation buttons.
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  VITE_URL,
} from '../core/index.mjs';

// =============================================================================
// Navigation Tests
// =============================================================================

function testTitleScreenButtons() {
  return runTest('Title Screen Buttons', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => console.log(`  [Page Error] ${err.message}`));

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btn-play', {
      state: 'visible',
      timeout: 15000,
    });

    const hostGameBtn = await page.locator('#btn-host-game').isVisible();
    const joinGameBtn = await page.locator('#btn-join-game').isVisible();

    if (!hostGameBtn) throw new Error('Host Game button not found');
    if (!joinGameBtn) throw new Error('Join Game button not found');

    console.log('  Host Game button: visible');
    console.log('  Join Game button: visible');

    await context.close();
  });
}

function testHostGameNavigation() {
  return runTest('Host Game Navigation', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

    await page.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 10000,
    });
    await page.click('#btn-host-game');
    console.log('  Clicked Host Game');

    await page.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Load campaign screen visible');

    const slots = await page.locator('.save-slot').count();
    if (slots === 0) throw new Error('No campaign slots found');
    console.log(`  Campaign slots found: ${slots}`);

    await context.close();
  });
}

function testJoinGameNavigation() {
  return runTest('Join Game Navigation', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

    await page.waitForSelector('#btn-join-game', {
      state: 'visible',
      timeout: 10000,
    });
    await page.click('#btn-join-game');
    console.log('  Clicked Join Game');

    await page.waitForSelector('.join-game-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Join game screen visible');

    const roomCodeInput = await page.locator('input').first();
    if (!(await roomCodeInput.isVisible()))
      throw new Error('Room code input not found');
    console.log('  Room code input visible');

    const backBtn = await page.locator('#btn-back').isVisible();
    if (!backBtn) throw new Error('Back button not found');
    console.log('  Back button visible');

    await context.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Title Screen Buttons', fn: testTitleScreenButtons },
  { name: 'Host Game Navigation', fn: testHostGameNavigation },
  { name: 'Join Game Navigation', fn: testJoinGameNavigation },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Connection Navigation Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
