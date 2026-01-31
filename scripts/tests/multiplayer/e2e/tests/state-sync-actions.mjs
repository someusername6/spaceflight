/**
 * E2E Tests - State Sync (Guest Actions)
 *
 * Tests for guest-initiated store actions and multi-guest sync.
 * Total: 3 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  joinGuestToLobby,
  navigateTo,
  setupHostAndGuest,
  setupHostInLobby,
  togglePermission,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Guest Store Tests
// =============================================================================

function testGuestBuyWithPermission() {
  return runTest(
    'Guest With Buy Permission → Host Sees Credits',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'GuestBuyGuest');
      console.log('  Both players connected');

      await togglePermission(hostPage, 'canBuy', true);
      console.log('  Host granted canBuy to guest');
      await sleep(500);

      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      const initialCredits = await getDisplayedCredits(guestPage);
      console.log(`  Initial credits: ${initialCredits}`);

      const storeItem = guestPage.locator('.store-item').first();
      if (!(await storeItem.isVisible().catch(() => false))) {
        throw new Error('No store items visible on guest');
      }
      await storeItem.click();
      await sleep(200);

      const buyBtn = guestPage.locator('.btn-buy:not([disabled])').first();
      const buyVisible = await buyBtn.isVisible().catch(() => false);
      console.log(`  Guest buy button enabled: ${buyVisible}`);

      if (!buyVisible) {
        throw new Error('Buy button not enabled for guest with permission');
      }

      await buyBtn.click();
      await sleep(500);

      const guestCreditsAfter = await getDisplayedCredits(guestPage);
      console.log(`  Guest credits after buy: ${guestCreditsAfter}`);

      if (guestCreditsAfter >= initialCredits) {
        throw new Error(
          `Credits did not decrease: ${initialCredits} → ${guestCreditsAfter}`,
        );
      }
      console.log('  ✓ Guest credits decreased');

      await waitForCreditsToEqual(hostPage, guestCreditsAfter);
      console.log('  ✓ Host credits match guest after sync');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testGuestSellSyncsToHost() {
  return runTest('Guest Sell → Host Sees Synced Credits', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'GuestSellGuest');
    console.log('  Both players connected');

    const initialCredits = await getDisplayedCredits(hostPage);
    console.log(`  Initial credits: ${initialCredits}`);

    await navigateTo(hostPage, 'store');
    const storeItem = hostPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      throw new Error('No store items visible on host');
    }
    await storeItem.click();
    await sleep(200);

    const buyBtn = hostPage.locator('#btn-buy:not([disabled])');
    if (!(await buyBtn.isVisible().catch(() => false))) {
      throw new Error('No enabled Buy button found on host');
    }
    await buyBtn.click();
    await sleep(500);

    const creditsAfterBuy = await getDisplayedCredits(hostPage);
    console.log(`  Credits after host buy: ${creditsAfterBuy}`);

    if (creditsAfterBuy >= initialCredits) {
      throw new Error(
        `Credits did not decrease: ${initialCredits} → ${creditsAfterBuy}`,
      );
    }
    console.log('  ✓ Host credits decreased after buy');

    await waitForCreditsToEqual(guestPage, creditsAfterBuy);
    console.log('  Guest synced after host buy');

    await navigateTo(guestPage, 'store');
    const guestStoreItem = guestPage.locator('.store-item').first();
    await guestStoreItem.click();
    await sleep(300);

    const sellBtn = guestPage.locator('#btn-sell:not([disabled])');
    const sellVisible = await sellBtn.isVisible().catch(() => false);
    console.log(`  Guest Sell button enabled: ${sellVisible}`);

    if (!sellVisible) {
      throw new Error('Sell button not enabled for guest');
    }

    await sellBtn.click();
    await sleep(500);

    const guestCreditsAfterSell = await getDisplayedCredits(guestPage);
    console.log(`  Guest credits after sell: ${guestCreditsAfterSell}`);

    if (guestCreditsAfterSell <= creditsAfterBuy) {
      throw new Error(
        `Credits did not increase: ${creditsAfterBuy} → ${guestCreditsAfterSell}`,
      );
    }
    console.log('  ✓ Guest credits increased after sell');

    await waitForCreditsToEqual(hostPage, guestCreditsAfterSell);
    const hostCreditsAfterSync = await getDisplayedCredits(hostPage);
    console.log(`  Host credits after sync: ${hostCreditsAfterSync}`);

    if (hostCreditsAfterSync !== guestCreditsAfterSell) {
      throw new Error(
        `Credits mismatch: host=${hostCreditsAfterSync} guest=${guestCreditsAfterSell}`,
      );
    }
    console.log('  ✓ Host credits match guest after sell sync');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Multi-Guest Tests
// =============================================================================

function testMultiGuestSync() {
  return runTest('Multi-Guest Sync (3 Players)', async (browser) => {
    const { hostContext, hostPage, roomCode } = await setupHostInLobby(browser);
    console.log(`  Host in lobby (room: ${roomCode})`);

    const { guestContext: guest1Context, guestPage: guest1Page } =
      await joinGuestToLobby(browser, roomCode);
    console.log('  Guest 1 joined');

    await hostPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      { timeout: 15000 },
    );

    const { guestContext: guest2Context, guestPage: guest2Page } =
      await joinGuestToLobby(browser, roomCode);
    console.log('  Guest 2 joined');

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

    const initialCredits = await getDisplayedCredits(hostPage);
    console.log(`  Initial credits: ${initialCredits}`);

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

    await waitForCreditsToEqual(guest2Page, guest1Credits);
    const guest2Credits = await getDisplayedCredits(guest2Page);
    console.log(`  Guest 2 credits after sync: ${guest2Credits}`);

    if (guest2Credits !== guest1Credits) {
      throw new Error(
        `Guest 2 credits mismatch: guest1=${guest1Credits} guest2=${guest2Credits}`,
      );
    }
    console.log('  ✓ Guest 2 credits match Guest 1');

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

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Guest with buy permission → host sees credits',
    fn: testGuestBuyWithPermission,
  },
  {
    name: 'Guest sell → host sees synced credits',
    fn: testGuestSellSyncsToHost,
  },
  { name: 'Multi-guest sync (3 players)', fn: testMultiGuestSync },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Actions Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
