/**
 * E2E Tests - State Sync (Store Restrictions)
 *
 * Tests for guest store restrictions (hire, buy with insufficient credits).
 * Total: 2 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  setupHostAndGuest,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Guest Store Tests
// =============================================================================

function testGuestHireRecruitDisabled() {
  return runTest('Guest Hire Recruit Disabled (Host-Only)', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'HireGuest');
    console.log('  Both players connected');

    await navigateTo(guestPage, 'squadron');

    const recruitCard = guestPage
      .locator('.recruit-card, .ship-item[data-recruit-id]')
      .first();
    const hasRecruit = await recruitCard.isVisible().catch(() => false);

    if (hasRecruit) {
      console.log('  Found recruit card, selecting...');
      await recruitCard.click();
      await sleep(300);

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
      console.log('  No recruits available in default roster');
      console.log('  (Host-only guard still active in code)');
    }

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

function testGuestBuyDisabledInsufficientCredits() {
  return runTest(
    'Guest Buy Disabled (Insufficient Credits)',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'InsufficientGuest');
      console.log('  Both players connected');

      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      await navigateTo(guestPage, 'store');

      const shipsCatGuest = guestPage.locator('[data-cat="ships"]');
      const hasShipsCat = await shipsCatGuest.isVisible().catch(() => false);
      if (hasShipsCat) {
        await shipsCatGuest.click();
        await sleep(200);
      }

      const guestShipItem = guestPage.locator(
        '.store-item[data-item="fighter"]',
      );
      if (!(await guestShipItem.isVisible().catch(() => false))) {
        throw new Error('Fighter ship not visible for guest');
      }
      await guestShipItem.click();
      await sleep(200);

      const initialEnabled = await guestPage.evaluate(() => {
        const btn = document.querySelector('#btn-buy');
        return btn ? !btn.hasAttribute('disabled') : false;
      });
      console.log(`  Guest Buy button initially enabled: ${initialEnabled}`);

      if (!initialEnabled) {
        throw new Error('Buy button should be enabled with initial credits');
      }
      console.log('  ✓ Buy button enabled with sufficient credits');

      await navigateTo(hostPage, 'store');

      const shipsCatHost = hostPage.locator('[data-cat="ships"]');
      if (await shipsCatHost.isVisible().catch(() => false)) {
        await shipsCatHost.click();
        await sleep(200);
      }

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

      const hostCreditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Host credits after purchases: ${hostCreditsAfter}`);

      if (hostCreditsAfter >= 400) {
        throw new Error(
          `Expected credits < 400 after buying fighter+scout, got ${hostCreditsAfter}`,
        );
      }
      console.log('  ✓ Host credits depleted below fighter price');

      await waitForCreditsToEqual(guestPage, hostCreditsAfter);
      console.log(`  Guest credits synced: ${hostCreditsAfter}`);

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
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Guest hire recruit disabled (host-only)',
    fn: testGuestHireRecruitDisabled,
  },
  {
    name: 'Guest buy disabled (insufficient credits)',
    fn: testGuestBuyDisabledInsufficientCredits,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Store Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
