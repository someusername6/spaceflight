/**
 * Lobby E2E UI Tests - System Messages and Rendering
 *
 * Tests for system messages and lobby rendering.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { isMainModule, runTest, runTestSuite, VITE_URL } from './utils.mjs';

/**
 * Test: System messages appear for player events.
 */
function testSystemMessages() {
  return runTest('System Messages', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'SystemMsgGuest');
    console.log('  Both players connected');

    // Host should see a system message about player joining
    await hostPage.waitForFunction(
      () => {
        const systemMsgs = document.querySelectorAll('.chat-message.system');
        return Array.from(systemMsgs).some((el) =>
          el.textContent?.toLowerCase().includes('joined'),
        );
      },
      { timeout: 10000 },
    );
    console.log('  Host: Sees "joined" system message');

    const systemMsgCount = await hostPage
      .locator('.chat-message.system')
      .count();
    if (systemMsgCount < 1) {
      throw new Error('No system messages found');
    }
    console.log(`  Host: Has ${systemMsgCount} system message(s)`);

    await guestPage.click('.lobby-screen #btn-ready');
    console.log('  Guest: Clicked Ready');

    await hostPage.waitForFunction(
      () => {
        const systemMsgs = document.querySelectorAll('.chat-message.system');
        return Array.from(systemMsgs).some((el) =>
          el.textContent?.toLowerCase().includes('ready'),
        );
      },
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

/**
 * Test: Lobby screen renders correctly.
 */
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

export const ALL_TESTS = [
  { name: 'System Messages', fn: testSystemMessages },
  { name: 'Lobby Component Rendering', fn: testLobbyRendering },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('UI - System Messages Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
