/**
 * E2E Tests - State Sync (Campaign Basics)
 *
 * Tests for campaign state sync across navigation.
 * Total: 3 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  setupHostAndGuest,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Campaign Sync Basics
// =============================================================================

function testBothSeeAllPlayers() {
  return runTest('Both See All Players', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'AllPlayersGuest');
    console.log('  Both players connected');

    const hostPlayerCount = await hostPage.locator('.player-row').count();
    const guestPlayerCount = await guestPage.locator('.player-row').count();
    console.log(`  Host sees ${hostPlayerCount} players`);
    console.log(`  Guest sees ${guestPlayerCount} players`);

    if (hostPlayerCount === 2 && guestPlayerCount === 2) {
      await hostContext.close();
      await guestContext.close();
    } else {
      throw new Error('Player counts do not match expected');
    }
  });
}

function testNoDuplicateNavElements() {
  return runTest('No Duplicate Nav Elements', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'NoDupeGuest');
    console.log('  Both players connected');

    const singletonSelectors = [
      '.global-nav',
      '.nav-credits',
      '#nav-squadron',
      '#nav-store',
      '#nav-contracts',
    ];

    async function assertSingletons(page, label) {
      for (const sel of singletonSelectors) {
        const count = await page.locator(sel).count();
        if (count !== 1) {
          throw new Error(`${label}: expected 1 "${sel}", found ${count}`);
        }
      }
    }

    await assertSingletons(hostPage, 'Host lobby');
    await assertSingletons(guestPage, 'Guest lobby');
    console.log('  ✓ Lobby: all nav elements unique');

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

function testCampaignStateSyncsOnNavigation() {
  return runTest('Campaign State Syncs On Navigation', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'NavSyncGuest');
    console.log('  Both players connected');

    const hostCredits = await getDisplayedCredits(hostPage);
    await waitForCreditsToEqual(guestPage, 1000);
    const guestCredits = await getDisplayedCredits(guestPage);
    if (hostCredits !== 1000 || guestCredits !== 1000) {
      throw new Error(
        `Expected 1000 credits, got host=${hostCredits} guest=${guestCredits}`,
      );
    }
    console.log('  ✓ Credits match initial value (1000)');

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

    const hostDeployed = await hostPage.locator('.ship-item.deployed').count();
    const guestDeployed = await guestPage
      .locator('.ship-item.deployed')
      .count();
    if (hostDeployed !== 4 || guestDeployed !== 4) {
      throw new Error(
        `Expected 4 deployed ships, got host=${hostDeployed} guest=${guestDeployed}`,
      );
    }
    console.log('  ✓ Both show 4 deployed ships');

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('#btn-refresh-contracts');
    await sleep(500);

    const hostCreditsAfter = await getDisplayedCredits(hostPage);
    if (hostCreditsAfter !== 950) {
      throw new Error(
        `Expected 950 credits after refresh, got ${hostCreditsAfter}`,
      );
    }
    console.log('  ✓ Host credits updated after refresh (1000 → 950)');

    await waitForCreditsToEqual(guestPage, 950);
    console.log('  ✓ Guest credits synced (950)');

    await guestPage.click('#nav-lobby');
    await guestPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.click('#nav-squadron');
    await guestPage.waitForSelector('.squadron-screen', {
      state: 'visible',
      timeout: 5000,
    });

    await hostPage.click('#nav-squadron');
    await hostPage.waitForSelector('.squadron-screen', {
      state: 'visible',
      timeout: 5000,
    });

    const guestDeployedAfter = await guestPage
      .locator('.ship-item.deployed')
      .count();
    if (guestDeployedAfter !== 4) {
      throw new Error(
        `Ships lost after operation: guest=${guestDeployedAfter}`,
      );
    }
    console.log('  ✓ Loadout intact after state mutation (4 ships preserved)');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Both see all players', fn: testBothSeeAllPlayers },
  { name: 'No duplicate nav elements', fn: testNoDuplicateNavElements },
  {
    name: 'Campaign state syncs on navigation',
    fn: testCampaignStateSyncsOnNavigation,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Campaign Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
