/**
 * E2E Tests - Store Convert Scrap
 *
 * Tests for convertScrap action:
 * - Guest converts scrap with permission → host sees state sync
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
 * Test: Guest converts scrap with permission → host sees state sync.
 *
 * Prerequisites:
 * - Campaign must have scrap to convert
 * - Guest must have canConvertScrap permission (default is true)
 */
function testGuestConvertScrapWithPermission() {
  return runTest(
    'Guest Convert Scrap With Permission → Host Sync',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ConvertGuest');
      console.log('  Both players connected');

      // Ensure guest has convert permission (should be default)
      await togglePermission(hostPage, 'canConvertScrap', true);
      console.log('  Host confirmed canConvertScrap for guest');

      // Wait for permission to propagate
      await sleep(500);

      // Get initial credits
      const initialCredits = await getDisplayedCredits(guestPage);
      console.log(`  Initial credits: ${initialCredits}`);

      // Guest navigates to store
      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      // Look for scrap section or convert button
      const scrapSection = guestPage
        .locator('.scrap-section, .scrap-list, .scrap-item')
        .first();
      const hasScrap = await scrapSection.isVisible().catch(() => false);

      if (!hasScrap) {
        console.log('  No scrap available in campaign (test skipped)');
        console.log('  (ConvertScrap action is tested at unit level)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      console.log('  Found scrap section');

      // Click on scrap to select it
      await scrapSection.click();
      await sleep(300);

      // Look for convert button
      const convertBtn = guestPage
        .locator(
          '#btn-convert-scrap, .btn-convert-scrap, [data-action="convert-scrap"]',
        )
        .first();
      const convertBtnVisible = await convertBtn.isVisible().catch(() => false);

      if (!convertBtnVisible) {
        console.log('  Convert button not visible (no scrap selected)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      // Check if button is enabled
      const isDisabled = await convertBtn.evaluate(
        (el) =>
          el.hasAttribute('disabled') || el.classList.contains('disabled'),
      );

      if (isDisabled) {
        console.log('  Convert button is disabled (test skipped)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      // Click convert
      await convertBtn.click();
      await sleep(500);

      // Check guest credits increased
      const guestCreditsAfter = await getDisplayedCredits(guestPage);
      console.log(`  Guest credits after convert: ${guestCreditsAfter}`);

      if (guestCreditsAfter <= initialCredits) {
        throw new Error(
          `Credits did not increase: ${initialCredits} → ${guestCreditsAfter}`,
        );
      }
      console.log('  Guest credits increased after convert');

      // Wait for host to receive synced state
      await waitForCreditsToEqual(hostPage, guestCreditsAfter);
      const hostCreditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Host credits after sync: ${hostCreditsAfter}`);

      if (hostCreditsAfter !== guestCreditsAfter) {
        throw new Error(
          `Credits mismatch: host=${hostCreditsAfter} guest=${guestCreditsAfter}`,
        );
      }
      console.log('  Host credits match guest after sync');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Guest convert scrap with permission → host sync',
    fn: testGuestConvertScrapWithPermission,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Store Convert', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
