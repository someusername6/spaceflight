/**
 * E2E Tests - Campaign Sync - Basics
 *
 * Tests:
 * - Both see all players
 * - No duplicate nav elements
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { isMainModule, runTest, runTestSuite } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

// Note: Ready state tests are in ui-ready.mjs

/**
 * Test: Host and guest see same player count.
 */
function testBothSeeAllPlayers() {
  return runTest('Both See All Players', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'AllPlayersGuest');
    console.log('  Both players connected');

    // Count players on both screens
    const hostPlayerCount = await hostPage.locator('.player-row').count();
    const guestPlayerCount = await guestPage.locator('.player-row').count();
    console.log(`  Host sees ${hostPlayerCount} players`);
    console.log(`  Guest sees ${guestPlayerCount} players`);

    // Both should see 2 players
    if (hostPlayerCount === 2 && guestPlayerCount === 2) {
      await hostContext.close();
      await guestContext.close();
    } else {
      throw new Error('Player counts do not match expected');
    }
  });
}

/**
 * Test: Singleton UI elements remain unique after navigating across screens.
 * Verifies that stale screen DOM is properly cleaned up so elements like
 * the nav bar, credit display, and nav tabs exist exactly once.
 */
function testNoDuplicateNavElements() {
  return runTest('No Duplicate Nav Elements', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'NoDupeGuest');
    console.log('  Both players connected');

    // Elements that must appear exactly once on any given screen
    const singletonSelectors = [
      '.global-nav',
      '.nav-credits',
      '#nav-squadron',
      '#nav-store',
      '#nav-contracts',
    ];

    /** Assert every selector matches exactly 1 element on the page */
    async function assertSingletons(page, label) {
      for (const sel of singletonSelectors) {
        const count = await page.locator(sel).count();
        if (count !== 1) {
          throw new Error(`${label}: expected 1 "${sel}", found ${count}`);
        }
      }
    }

    // Check on lobby (starting screen)
    await assertSingletons(hostPage, 'Host lobby');
    await assertSingletons(guestPage, 'Guest lobby');
    console.log('  ✓ Lobby: all nav elements unique');

    // Navigate both to squadron
    await hostPage.click('#nav-squadron');
    await hostPage.waitForSelector('.squadron-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.click('#nav-squadron');
    await guestPage.waitForSelector('.squadron-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await assertSingletons(hostPage, 'Host squadron');
    await assertSingletons(guestPage, 'Guest squadron');
    console.log('  ✓ Squadron: all nav elements unique');

    // Navigate both to store
    await hostPage.click('#nav-store');
    await hostPage.waitForSelector('.store-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.click('#nav-store');
    await guestPage.waitForSelector('.store-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await assertSingletons(hostPage, 'Host store');
    await assertSingletons(guestPage, 'Guest store');
    console.log('  ✓ Store: all nav elements unique');

    // Navigate both to contracts
    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await assertSingletons(hostPage, 'Host contracts');
    await assertSingletons(guestPage, 'Guest contracts');
    console.log('  ✓ Contracts: all nav elements unique');

    // Navigate back to lobby to complete the loop
    await hostPage.click('#nav-lobby');
    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.click('#nav-lobby');
    await guestPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await assertSingletons(hostPage, 'Host lobby (return)');
    await assertSingletons(guestPage, 'Guest lobby (return)');
    console.log('  ✓ Lobby (return): all nav elements unique');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

/** All test definitions */
export const ALL_TESTS = [
  // Note: Ready state tests are in ui-ready.mjs
  { name: 'Both see all players', fn: testBothSeeAllPlayers },
  { name: 'No duplicate nav elements', fn: testNoDuplicateNavElements },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Campaign Sync - Basics', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
