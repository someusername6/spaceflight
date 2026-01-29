/**
 * Lobby E2E UI Tests - Player Indicators
 *
 * Tests for host indicator and self highlight.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { isMainModule, runTest, runTestSuite } from './utils.mjs';

/**
 * Test: Host indicator (star) is displayed for host player.
 */
function testHostIndicator() {
  return runTest('Host Indicator', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'GuestPlayer');
    console.log('  Both players connected');

    const hostIndicatorOnHost = await hostPage
      .locator('.host-indicator')
      .count();
    if (hostIndicatorOnHost !== 1) {
      throw new Error(
        `Expected 1 host indicator on host view, got ${hostIndicatorOnHost}`,
      );
    }
    console.log('  Host view: Has 1 host indicator (★)');

    const hostIndicatorOnGuest = await guestPage
      .locator('.host-indicator')
      .count();
    if (hostIndicatorOnGuest !== 1) {
      throw new Error(
        `Expected 1 host indicator on guest view, got ${hostIndicatorOnGuest}`,
      );
    }
    console.log('  Guest view: Has 1 host indicator (★)');

    const starText = await hostPage.locator('.host-indicator').textContent();
    if (!starText?.includes('★')) {
      throw new Error('Host indicator missing star character');
    }
    console.log('  Host indicator shows star (★)');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Self is highlighted in player list.
 */
function testSelfHighlight() {
  return runTest('Self Highlight in Player List', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HighlightGuest');
    console.log('  Both players connected');

    const hostSelfRows = await hostPage.locator('.player-row.self').count();
    if (hostSelfRows !== 1) {
      throw new Error(
        `Host should have 1 self-highlighted row, got ${hostSelfRows}`,
      );
    }
    console.log('  Host view: Has 1 self-highlighted row');

    const guestSelfRows = await guestPage.locator('.player-row.self').count();
    if (guestSelfRows !== 1) {
      throw new Error(
        `Guest should have 1 self-highlighted row, got ${guestSelfRows}`,
      );
    }
    console.log('  Guest view: Has 1 self-highlighted row');

    const hostSelfHasHostIndicator = await hostPage.evaluate(() => {
      const selfRow = document.querySelector('.player-row.self');
      return selfRow?.querySelector('.host-indicator') !== null;
    });
    if (!hostSelfHasHostIndicator) {
      throw new Error('Host self row should have host indicator');
    }
    console.log('  Host self row has host indicator');

    const guestSelfHasHostIndicator = await guestPage.evaluate(() => {
      const selfRow = document.querySelector('.player-row.self');
      return selfRow?.querySelector('.host-indicator') !== null;
    });
    if (guestSelfHasHostIndicator) {
      throw new Error('Guest self row should NOT have host indicator');
    }
    console.log('  Guest self row does not have host indicator');

    await hostContext.close();
    await guestContext.close();
  });
}

export const ALL_TESTS = [
  { name: 'Host Indicator', fn: testHostIndicator },
  { name: 'Self Highlight', fn: testSelfHighlight },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('UI - Indicator Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
