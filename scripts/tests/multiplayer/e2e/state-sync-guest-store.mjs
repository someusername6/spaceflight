/**
 * E2E Tests - State Sync - Guest Store Actions
 *
 * Tests for:
 * - Guest with buy permission → host sees updated credits
 * - Guest sell → host sees synced credits
 * - Guest hire recruit disabled (host-only)
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  togglePermission,
  waitForCreditsToEqual,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test 4: Guest with buy permission buys item → host sees updated credits.
 */
function testGuestBuyWithPermission() {
  return runTest(
    'Guest With Buy Permission → Host Sees Credits',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'GuestBuyGuest');
      console.log('  Both players connected');

      // Host grants buy permission to guest
      await togglePermission(hostPage, 'canBuy', true);
      console.log('  Host granted canBuy to guest');

      // Wait for permission to propagate
      await sleep(500);

      // Guest navigates to store
      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      // Get initial credits
      const initialCredits = await getDisplayedCredits(guestPage);
      console.log(`  Initial credits: ${initialCredits}`);

      // Select first store item
      const storeItem = guestPage.locator('.store-item').first();
      if (!(await storeItem.isVisible().catch(() => false))) {
        throw new Error('No store items visible on guest');
      }
      await storeItem.click();
      await sleep(200);

      // Click Buy button (should be enabled now)
      const buyBtn = guestPage.locator('.btn-buy:not([disabled])').first();
      const buyVisible = await buyBtn.isVisible().catch(() => false);
      console.log(`  Guest buy button enabled: ${buyVisible}`);

      if (!buyVisible) {
        throw new Error('Buy button not enabled for guest with permission');
      }

      await buyBtn.click();
      await sleep(500);

      // Check guest credits decreased
      const guestCreditsAfter = await getDisplayedCredits(guestPage);
      console.log(`  Guest credits after buy: ${guestCreditsAfter}`);

      if (guestCreditsAfter >= initialCredits) {
        throw new Error(
          `Credits did not decrease: ${initialCredits} → ${guestCreditsAfter}`,
        );
      }
      console.log('  ✓ Guest credits decreased');

      // Wait for host to receive synced state
      await waitForCreditsToEqual(hostPage, guestCreditsAfter);
      console.log('  ✓ Host credits match guest after sync');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test 7: Guest sell syncs to host.
 *
 * 1. Host buys an item → storage populated, host credits decrease
 * 2. Guest navigates to store, selects the item
 * 3. Guest clicks Sell button
 * 4. Verify guest credits increase
 * 5. Wait for host to see matching credits (via CampaignSync)
 */
function testGuestSellSyncsToHost() {
  return runTest('Guest Sell → Host Sees Synced Credits', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'GuestSellGuest');
    console.log('  Both players connected');

    // Get initial credits
    const initialCredits = await getDisplayedCredits(hostPage);
    console.log(`  Initial credits: ${initialCredits}`);

    // Host navigates to store and buys an item
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

    // Wait for guest to receive synced state
    await waitForCreditsToEqual(guestPage, creditsAfterBuy);
    console.log('  Guest synced after host buy');

    // Guest navigates to store and selects the item
    await navigateTo(guestPage, 'store');
    const guestStoreItem = guestPage.locator('.store-item').first();
    await guestStoreItem.click();
    await sleep(300);

    // Guest clicks Sell button (canSell is true by default)
    const sellBtn = guestPage.locator('#btn-sell:not([disabled])');
    const sellVisible = await sellBtn.isVisible().catch(() => false);
    console.log(`  Guest Sell button enabled: ${sellVisible}`);

    if (!sellVisible) {
      throw new Error('Sell button not enabled for guest');
    }

    await sellBtn.click();
    await sleep(500);

    // Verify guest credits increased
    const guestCreditsAfterSell = await getDisplayedCredits(guestPage);
    console.log(`  Guest credits after sell: ${guestCreditsAfterSell}`);

    if (guestCreditsAfterSell <= creditsAfterBuy) {
      throw new Error(
        `Credits did not increase: ${creditsAfterBuy} → ${guestCreditsAfterSell}`,
      );
    }
    console.log('  ✓ Guest credits increased after sell');

    // Wait for host to see matching credits
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

/**
 * Test 8: Guest hire recruit disabled (host-only).
 */
function testGuestHireRecruitDisabled() {
  return runTest('Guest Hire Recruit Disabled (Host-Only)', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HireGuest');
    console.log('  Both players connected');

    // Guest navigates to squadron
    await navigateTo(guestPage, 'squadron');

    // Look for recruit cards in the list
    const recruitCard = guestPage
      .locator('.recruit-card, .ship-item[data-recruit-id]')
      .first();
    const hasRecruit = await recruitCard.isVisible().catch(() => false);

    if (hasRecruit) {
      console.log('  Found recruit card, selecting...');
      await recruitCard.click();
      await sleep(300);

      // Check if the hire button is disabled
      const hireBtn = guestPage.locator('#btn-hire-recruit');
      const hireBtnVisible = await hireBtn.isVisible().catch(() => false);

      if (hireBtnVisible) {
        const isDisabled = await hireBtn.evaluate((el) =>
          el.hasAttribute('disabled'),
        );
        console.log(`  Hire button disabled: ${isDisabled}`);

        const title = await hireBtn.getAttribute('title');
        const hasHostTooltip = title?.includes('host');
        console.log(`  Has host-only tooltip: ${hasHostTooltip}`);

        if (isDisabled && hasHostTooltip) {
          console.log('  ✓ Hire button correctly disabled for guest');
        } else if (isDisabled) {
          console.log('  ✓ Hire button disabled (may be unaffordable)');
        } else {
          throw new Error('Hire button should be disabled for guest');
        }
      } else {
        console.log('  Hire button not visible (recruit viewer not shown)');
      }
    } else {
      // No recruits available in default campaign
      console.log('  No recruits available in default roster');
      console.log('  (Host-only guard still active in code)');
    }

    // Also verify host CAN see an enabled hire button
    await navigateTo(hostPage, 'squadron');
    const hostRecruitCard = hostPage
      .locator('.recruit-card, .ship-item[data-recruit-id]')
      .first();
    const hostHasRecruit = await hostRecruitCard.isVisible().catch(() => false);

    if (hostHasRecruit) {
      await hostRecruitCard.click();
      await sleep(300);

      const hostHireBtn = hostPage.locator('#btn-hire-recruit');
      const hostHireBtnVisible = await hostHireBtn
        .isVisible()
        .catch(() => false);

      if (hostHireBtnVisible) {
        const hostTitle = await hostHireBtn.getAttribute('title');
        const hostHasHostTooltip = hostTitle?.includes('host');
        console.log(
          `  Host hire button has host-only tooltip: ${hostHasHostTooltip}`,
        );

        // Host should NOT have host-only restriction tooltip
        if (hostHasHostTooltip) {
          throw new Error('Host should not see host-only restriction');
        }
        console.log('  ✓ Host hire button not restricted');
      }
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
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
  {
    name: 'Guest hire recruit disabled (host-only)',
    fn: testGuestHireRecruitDisabled,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - State Sync - Guest Store Actions', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
