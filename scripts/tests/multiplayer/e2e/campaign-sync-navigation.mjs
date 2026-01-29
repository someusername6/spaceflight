/**
 * E2E Tests - Campaign Sync - Navigation
 *
 * Tests:
 * - Campaign state syncs on navigation (verifies initial state, mutations, and loadout integrity)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { getDisplayedCredits, waitForCreditsToEqual } from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Campaign state syncs on navigation.
 */
function testCampaignStateSyncsOnNavigation() {
  return runTest('Campaign State Syncs On Navigation', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'NavSyncGuest');
    console.log('  Both players connected');

    // ── Phase 1: Verify initial state matches single-player defaults ──

    // 1a. Credits should be 1000 (default new campaign)
    const hostCredits = await getDisplayedCredits(hostPage);
    await waitForCreditsToEqual(guestPage, 1000);
    const guestCredits = await getDisplayedCredits(guestPage);
    if (hostCredits !== 1000 || guestCredits !== 1000) {
      throw new Error(
        `Expected 1000 credits, got host=${hostCredits} guest=${guestCredits}`,
      );
    }
    console.log('  ✓ Credits match initial value (1000)');

    // 1b. Navigate both to squadron
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

    // 1c. Verify 4 deployed ships on both (default roster)
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

    // 1d. Verify pilot names match initial roster
    const expectedPilots = ['Commander', 'Viper', 'Ghost', 'Shadow'];
    const hostPilots = (
      await hostPage
        .locator('.ship-item.deployed .ship-item-pilot')
        .allTextContents()
    ).map((t) => t.trim());
    const guestPilots = (
      await guestPage
        .locator('.ship-item.deployed .ship-item-pilot')
        .allTextContents()
    ).map((t) => t.trim());
    const pilotsMatch =
      expectedPilots.every((name) => hostPilots.includes(name)) &&
      expectedPilots.every((name) => guestPilots.includes(name));
    if (!pilotsMatch) {
      throw new Error(
        `Pilot names don't match expected [${expectedPilots}]: host=[${hostPilots}] guest=[${guestPilots}]`,
      );
    }
    console.log(
      `  ✓ Pilot names match initial roster (${expectedPilots.join(', ')})`,
    );

    // 1e. Verify weapon badges render (SlotArray deserialization proof)
    //     4 ships × 2 badge types (primary + secondary) = 8 badges
    const hostBadges = await hostPage
      .locator('.ship-item.deployed .weapon-badge')
      .count();
    const guestBadges = await guestPage
      .locator('.ship-item.deployed .weapon-badge')
      .count();
    if (hostBadges !== 8 || guestBadges !== 8) {
      throw new Error(
        `Expected 8 weapon badges, got host=${hostBadges} guest=${guestBadges}`,
      );
    }
    // Each fighter has 2/2 primary banks filled
    const guestPrimaryTexts = await guestPage
      .locator('.ship-item.deployed .weapon-badge.primary')
      .allTextContents();
    const allPrimary2of2 = guestPrimaryTexts.every((t) => t.includes('2/2'));
    if (!allPrimary2of2) {
      throw new Error(
        `Primary badges not showing 2/2: ${guestPrimaryTexts.map((t) => t.trim().split('\n')[0]).join('; ')}`,
      );
    }
    console.log(
      '  ✓ Weapon badges render correctly on guest (SlotArrays intact)',
    );

    // ── Phase 2: Host performs a state mutation (refresh contracts) ──

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('#btn-refresh-contracts');
    await sleep(500);

    // Refresh at sector 1 costs 50 cr → expect 950
    const hostCreditsAfter = await getDisplayedCredits(hostPage);
    if (hostCreditsAfter !== 950) {
      throw new Error(
        `Expected 950 credits after refresh, got ${hostCreditsAfter}`,
      );
    }
    console.log('  ✓ Host credits updated after refresh (1000 → 950)');

    // Wait for guest to receive synced state
    await waitForCreditsToEqual(guestPage, 950);
    console.log('  ✓ Guest credits synced (950)');

    // ── Phase 3: Verify loadout survives the state mutation ──

    // Guest navigates away from squadron and back to force a fresh render
    // using the campaign state that arrived via CampaignSync
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

    // Host also returns to squadron
    await hostPage.click('#nav-squadron');
    await hostPage.waitForSelector('.squadron-screen', {
      state: 'visible',
      timeout: 5000,
    });

    // Re-verify deployed ships
    const hostDeployedAfter = await hostPage
      .locator('.ship-item.deployed')
      .count();
    const guestDeployedAfter = await guestPage
      .locator('.ship-item.deployed')
      .count();
    if (hostDeployedAfter !== 4 || guestDeployedAfter !== 4) {
      throw new Error(
        `Ships lost after operation: host=${hostDeployedAfter} guest=${guestDeployedAfter}`,
      );
    }

    // Re-verify weapon badges (SlotArrays survived CampaignSync round-trip)
    const hostBadgesAfter = await hostPage
      .locator('.ship-item.deployed .weapon-badge')
      .count();
    const guestBadgesAfter = await guestPage
      .locator('.ship-item.deployed .weapon-badge')
      .count();
    if (hostBadgesAfter !== 8 || guestBadgesAfter !== 8) {
      throw new Error(
        `Weapon badges lost after operation: host=${hostBadgesAfter} guest=${guestBadgesAfter}`,
      );
    }
    const guestPrimaryAfter = await guestPage
      .locator('.ship-item.deployed .weapon-badge.primary')
      .allTextContents();
    if (!guestPrimaryAfter.every((t) => t.includes('2/2'))) {
      throw new Error('Weapon badge content corrupted after state mutation');
    }
    console.log(
      '  ✓ Loadout intact after state mutation (4 ships, all weapons preserved)',
    );

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

/** All test definitions */
export const ALL_TESTS = [
  {
    name: 'Campaign state syncs on navigation',
    fn: testCampaignStateSyncsOnNavigation,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Campaign Sync - Navigation', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
