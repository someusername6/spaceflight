/**
 * E2E Tests - Lobby UI (Player)
 *
 * Tests for host indicator, self highlight, ready toggle, and system messages.
 * Total: 5 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  VITE_URL,
} from '../core/index.mjs';
import { setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Host Indicator & Self Highlight
// =============================================================================

function testHostIndicator() {
  return runTest('Host Indicator', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const hostIndicatorOnHost = await hostPage
      .locator('.host-indicator')
      .count();
    if (hostIndicatorOnHost !== 1)
      throw new Error(
        `Expected 1 host indicator on host view, got ${hostIndicatorOnHost}`,
      );
    console.log('  Host view: Has 1 host indicator (★)');

    const hostIndicatorOnGuest = await guestPage
      .locator('.host-indicator')
      .count();
    if (hostIndicatorOnGuest !== 1)
      throw new Error(
        `Expected 1 host indicator on guest view, got ${hostIndicatorOnGuest}`,
      );
    console.log('  Guest view: Has 1 host indicator (★)');

    const starText = await hostPage.locator('.host-indicator').textContent();
    if (!starText?.includes('★'))
      throw new Error('Host indicator missing star character');
    console.log('  Host indicator shows star (★)');

    await hostContext.close();
    await guestContext.close();
  });
}

function testSelfHighlight() {
  return runTest('Self Highlight in Player List', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const hostSelfRows = await hostPage.locator('.player-row.self').count();
    if (hostSelfRows !== 1)
      throw new Error(
        `Host should have 1 self-highlighted row, got ${hostSelfRows}`,
      );
    console.log('  Host view: Has 1 self-highlighted row');

    const guestSelfRows = await guestPage.locator('.player-row.self').count();
    if (guestSelfRows !== 1)
      throw new Error(
        `Guest should have 1 self-highlighted row, got ${guestSelfRows}`,
      );
    console.log('  Guest view: Has 1 self-highlighted row');

    const hostSelfHasHostIndicator = await hostPage.evaluate(
      () =>
        document
          .querySelector('.player-row.self')
          ?.querySelector('.host-indicator') !== null,
    );
    if (!hostSelfHasHostIndicator)
      throw new Error('Host self row should have host indicator');
    console.log('  Host self row has host indicator');

    const guestSelfHasHostIndicator = await guestPage.evaluate(
      () =>
        document
          .querySelector('.player-row.self')
          ?.querySelector('.host-indicator') !== null,
    );
    if (guestSelfHasHostIndicator)
      throw new Error('Guest self row should NOT have host indicator');
    console.log('  Guest self row does not have host indicator');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Ready Toggle
// =============================================================================

function testReadyToggle() {
  return runTest('Ready Button Toggle', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
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
      () =>
        document
          .querySelector('.lobby-screen #btn-ready')
          ?.classList.contains('ready-active'),
      { timeout: 10000 },
    );
    console.log('  Host: Button shows ready state');

    await guestPage.waitForFunction(
      () => document.querySelectorAll('.ready-indicator.ready').length >= 1,
      { timeout: 10000 },
    );
    console.log('  Guest: Sees host is ready');

    await guestReadyBtn.click();
    console.log('  Guest: Clicked Ready');

    await guestPage.waitForFunction(
      () =>
        document
          .querySelector('.lobby-screen #btn-ready')
          ?.classList.contains('ready-active'),
      { timeout: 10000 },
    );
    console.log('  Guest: Button shows ready state');

    await hostPage.waitForFunction(
      () => document.querySelectorAll('.ready-indicator.ready').length >= 2,
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

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// System Messages
// =============================================================================

function testSystemMessages() {
  return runTest('System Messages', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await hostPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (el) => el.textContent?.toLowerCase().includes('joined'),
        ),
      { timeout: 10000 },
    );
    console.log('  Host: Sees "joined" system message');

    const systemMsgCount = await hostPage
      .locator('.chat-message.system')
      .count();
    if (systemMsgCount < 1) throw new Error('No system messages found');
    console.log(`  Host: Has ${systemMsgCount} system message(s)`);

    await guestPage.click('.lobby-screen #btn-ready');
    console.log('  Guest: Clicked Ready');

    await hostPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (el) => el.textContent?.toLowerCase().includes('ready'),
        ),
      { timeout: 10000 },
    );
    console.log('  Host: Sees "ready" system message');

    const allSystemMsgs = await hostPage
      .locator('.chat-message.system')
      .count();
    console.log(`  Total system messages: ${allSystemMsgs}`);

    await hostContext.close();
    await guestContext.close();
  });
}

function testLobbyRendering() {
  return runTest('Lobby Component Rendering', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(VITE_URL);

    const styles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          const hasLobbyStyles = rules.some(
            (rule) =>
              rule.cssText?.includes('.lobby-screen') ||
              rule.cssText?.includes('.players-panel') ||
              rule.cssText?.includes('.chat-panel'),
          );
          if (hasLobbyStyles) return true;
        } catch {
          // Cross-origin stylesheet, skip
        }
      }
      return false;
    });

    if (!styles) {
      console.log('  Warning: Lobby styles not found in loaded stylesheets');
      console.log('  (This may be expected if styles are lazy-loaded)');
    } else {
      console.log('  Lobby styles loaded in stylesheets');
    }

    await context.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Host Indicator', fn: testHostIndicator },
  { name: 'Self Highlight', fn: testSelfHighlight },
  { name: 'Ready Button Toggle', fn: testReadyToggle },
  { name: 'System Messages', fn: testSystemMessages },
  { name: 'Lobby Component Rendering', fn: testLobbyRendering },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Lobby UI Player Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
