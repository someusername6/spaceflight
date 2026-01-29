/**
 * E2E Tests - State Sync - Multi-Guest & Credits
 *
 * Tests for:
 * - Multi-guest sync (3 players: guest1 buy → guest2 sees)
 * - Guest buy disabled with insufficient credits (credit depletion sync)
 */

import {
  joinGuestToLobby,
  setupHostAndGuest,
  setupHostInLobby,
} from './connection-helpers.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  waitForCreditsToEqual,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test 10: Multi-guest sync (3 players).
 * Guest1 buys with permission → Guest2 sees updated credits.
 */
function testMultiGuestSync() {
  return runTest('Multi-Guest Sync (3 Players)', async (browser) => {
    // Setup host in lobby
    const { hostContext, hostPage, roomCode } = await setupHostInLobby(browser);
    console.log(`  Host in lobby (room: ${roomCode})`);

    // Join guest 1
    const { guestContext: guest1Context, guestPage: guest1Page } =
      await joinGuestToLobby(browser, roomCode);
    console.log('  Guest 1 joined');

    // Wait for host to see guest 1
    await hostPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      { timeout: 15000 },
    );

    // Join guest 2
    const { guestContext: guest2Context, guestPage: guest2Page } =
      await joinGuestToLobby(browser, roomCode);
    console.log('  Guest 2 joined');

    // Wait for all to see 3 players
    await Promise.all([
      hostPage.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 3,
        { timeout: 15000 },
      ),
      guest1Page.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 3,
        { timeout: 15000 },
      ),
      guest2Page.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 3,
        { timeout: 15000 },
      ),
    ]);
    console.log('  All 3 players see each other');

    // Get initial credits
    const initialCredits = await getDisplayedCredits(hostPage);
    console.log(`  Initial credits: ${initialCredits}`);

    // Host grants canBuy to guest 1 (first non-host row)
    const guest1Row = hostPage
      .locator('.player-row:not(:has(.host-indicator))')
      .first();
    await guest1Row.hover();
    await sleep(400);

    const popover = hostPage.locator('.host-popover');
    await popover.waitFor({ state: 'visible', timeout: 3000 });

    const checkbox = popover.locator('input[data-permission="canBuy"]');
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
      await sleep(300);
    }
    await hostPage.mouse.move(0, 0);
    await sleep(500);
    console.log('  Host granted canBuy to Guest 1');

    // Guest 1 navigates to store and buys
    await navigateTo(guest1Page, 'store');

    const storeItem = guest1Page.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      throw new Error('No store items visible for Guest 1');
    }
    await storeItem.click();
    await sleep(200);

    const buyBtn = guest1Page.locator('#btn-buy:not([disabled])');
    if (!(await buyBtn.isVisible().catch(() => false))) {
      throw new Error('Buy button not enabled for Guest 1 with permission');
    }
    await buyBtn.click();
    await sleep(500);

    const guest1Credits = await getDisplayedCredits(guest1Page);
    console.log(`  Guest 1 credits after buy: ${guest1Credits}`);

    if (guest1Credits >= initialCredits) {
      throw new Error(
        `Guest 1 credits did not decrease: ${initialCredits} → ${guest1Credits}`,
      );
    }
    console.log('  ✓ Guest 1 credits decreased');

    // Wait for Guest 2 to receive synced state
    await waitForCreditsToEqual(guest2Page, guest1Credits);
    const guest2Credits = await getDisplayedCredits(guest2Page);
    console.log(`  Guest 2 credits after sync: ${guest2Credits}`);

    if (guest2Credits !== guest1Credits) {
      throw new Error(
        `Guest 2 credits mismatch: guest1=${guest1Credits} guest2=${guest2Credits}`,
      );
    }
    console.log('  ✓ Guest 2 credits match Guest 1');

    // Verify host credits also match
    await waitForCreditsToEqual(hostPage, guest1Credits);
    const hostCreditsAfter = await getDisplayedCredits(hostPage);
    console.log(`  Host credits after sync: ${hostCreditsAfter}`);

    if (hostCreditsAfter !== guest1Credits) {
      throw new Error(
        `Host credits mismatch: host=${hostCreditsAfter} guest1=${guest1Credits}`,
      );
    }
    console.log('  ✓ All 3 players have matching credits');

    await hostContext.close();
    await guest1Context.close();
    await guest2Context.close();
  });
}

/**
 * Test 15: Guest buy disabled when credits insufficient.
 *
 * Verifies that credit depletion syncs to guest and disables the Buy button:
 * 1. Guest navigates to store, selects fighter (400 cr) → Buy button enabled
 * 2. Host buys fighter (400) + scout (300) → 300 cr remaining
 * 3. Guest receives CampaignSync → Buy button becomes disabled
 *    (fighter costs 400 but only 300 cr available)
 */
function testGuestBuyDisabledInsufficientCredits() {
  return runTest(
    'Guest Buy Disabled (Insufficient Credits)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'InsufficientGuest');
      console.log('  Both players connected');

      // Get initial credits
      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      // Guest navigates to store → ships category → select fighter (400 cr)
      await navigateTo(guestPage, 'store');

      const shipsCatGuest = guestPage.locator('[data-cat="ships"]');
      const hasShipsCat = await shipsCatGuest.isVisible().catch(() => false);
      if (hasShipsCat) {
        await shipsCatGuest.click();
        await sleep(200);
      }

      // Select fighter specifically (400 cr, will be unaffordable after depletion)
      const guestShipItem = guestPage.locator(
        '.store-item[data-item="fighter"]',
      );
      if (!(await guestShipItem.isVisible().catch(() => false))) {
        throw new Error('Fighter ship not visible for guest');
      }
      await guestShipItem.click();
      await sleep(200);

      // Verify Buy button is enabled with full credits
      const initialEnabled = await guestPage.evaluate(() => {
        const btn = document.querySelector('#btn-buy');
        return btn ? !btn.hasAttribute('disabled') : false;
      });
      console.log(`  Guest Buy button initially enabled: ${initialEnabled}`);

      if (!initialEnabled) {
        throw new Error('Buy button should be enabled with initial credits');
      }
      console.log('  ✓ Buy button enabled with sufficient credits');

      // Host navigates to store → ships category → buy fighters to deplete credits
      // Sector 1 stocks: patrol (200), scout (300), fighter (400)
      // Buy fighter twice (400×2 = 800) → 200 cr remaining, then scout (300) is
      // unaffordable. Or buy fighter + scout + patrol = 900 → 100 cr remaining.
      await navigateTo(hostPage, 'store');

      const shipsCatHost = hostPage.locator('[data-cat="ships"]');
      if (await shipsCatHost.isVisible().catch(() => false)) {
        await shipsCatHost.click();
        await sleep(200);
      }

      // Buy different ships to avoid selection toggle:
      // fighter (400) + scout (300) = 700 → 300 cr remaining (< 400 for fighter)
      const shipsToBuy = ['fighter', 'scout'];
      for (const ship of shipsToBuy) {
        await hostPage.waitForSelector(`.store-item[data-item="${ship}"]`, {
          state: 'visible',
          timeout: 5000,
        });
        await hostPage.click(`.store-item[data-item="${ship}"]`);
        await sleep(300);

        await hostPage.waitForSelector('#btn-buy:not([disabled])', {
          state: 'visible',
          timeout: 5000,
        });
        await hostPage.click('#btn-buy');
        await sleep(500);
        console.log(`  Host bought ${ship}`);
      }

      // Verify host credits dropped (1000 - 700 = 300, < fighter price 400)
      const hostCreditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Host credits after purchases: ${hostCreditsAfter}`);

      if (hostCreditsAfter >= 400) {
        throw new Error(
          `Expected credits < 400 after buying fighter+scout, got ${hostCreditsAfter}`,
        );
      }
      console.log('  ✓ Host credits depleted below fighter price');

      // Wait for guest credits to sync
      await waitForCreditsToEqual(guestPage, hostCreditsAfter);
      console.log(`  Guest credits synced: ${hostCreditsAfter}`);

      // Wait for Buy button to become disabled (insufficient credits for any ship)
      await guestPage.waitForFunction(
        () => {
          const btn = document.querySelector('#btn-buy');
          return btn?.hasAttribute('disabled');
        },
        { timeout: 10000 },
      );
      console.log('  ✓ Guest Buy button disabled (insufficient credits)');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  { name: 'Multi-guest sync (3 players)', fn: testMultiGuestSync },
  {
    name: 'Guest buy disabled (insufficient credits)',
    fn: testGuestBuyDisabledInsufficientCredits,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite(
    'E2E Tests - State Sync - Multi-Guest & Credits',
    ALL_TESTS,
  ).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
