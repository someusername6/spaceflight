/**
 * E2E Tests - Permission UI - Store
 *
 * Tests that store buttons are disabled when guest lacks permissions:
 * - Guest with revoked canBuy → buy button disabled
 * - Guest with revoked canSell → sell button disabled
 * - Guest with revoked canConvertScrap → convert button disabled
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { navigateTo, togglePermission } from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Guest with revoked canBuy permission → buy button disabled.
 */
function testBuyDeniedWithoutPermission() {
  return runTest('Buy Denied Without Permission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'BuyDeniedGuest');
    console.log('  Both players connected');

    // Host revokes buy permission from guest
    await togglePermission(hostPage, 'canBuy', false);
    console.log('  Host revoked canBuy from guest');

    // Wait for permission to propagate
    await sleep(500);

    // Guest navigates to store
    await navigateTo(guestPage, 'store');
    console.log('  Guest navigated to store');

    // Select first store item
    const storeItem = guestPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      throw new Error('No store items visible on guest');
    }
    await storeItem.click();
    await sleep(200);

    // Check if Buy button is disabled
    const buyBtn = guestPage.locator('#btn-buy, .btn-buy').first();
    const buyBtnVisible = await buyBtn.isVisible().catch(() => false);

    if (!buyBtnVisible) {
      console.log('  Buy button not visible (may be correctly hidden)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    const isDisabled = await buyBtn.evaluate(
      (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
    );

    console.log(`  Buy button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error(
        'Buy button should be disabled without canBuy permission',
      );
    }

    console.log('  Buy button correctly disabled for guest without permission');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Guest with revoked canSell permission → sell button disabled.
 */
function testSellDeniedWithoutPermission() {
  return runTest('Sell Denied Without Permission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'SellDeniedGuest');
    console.log('  Both players connected');

    // Host buys an item first so there's something to sell
    await navigateTo(hostPage, 'store');
    const hostStoreItem = hostPage.locator('.store-item').first();
    if (await hostStoreItem.isVisible().catch(() => false)) {
      await hostStoreItem.click();
      await sleep(200);
      const hostBuyBtn = hostPage.locator('#btn-buy:not([disabled])');
      if (await hostBuyBtn.isVisible().catch(() => false)) {
        await hostBuyBtn.click();
        await sleep(500);
        console.log('  Host bought an item');
      }
    }

    // Host revokes sell permission from guest
    await navigateTo(hostPage, 'lobby');
    await togglePermission(hostPage, 'canSell', false);
    console.log('  Host revoked canSell from guest');

    // Wait for permission to propagate
    await sleep(500);

    // Guest navigates to store
    await navigateTo(guestPage, 'store');
    console.log('  Guest navigated to store');

    // Select first store item
    const storeItem = guestPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      console.log('  No store items visible on guest');
      await hostContext.close();
      await guestContext.close();
      return;
    }
    await storeItem.click();
    await sleep(200);

    // Check if Sell button is disabled
    const sellBtn = guestPage.locator('#btn-sell, .btn-sell').first();
    const sellBtnVisible = await sellBtn.isVisible().catch(() => false);

    if (!sellBtnVisible) {
      console.log('  Sell button not visible (may be correctly hidden)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    const isDisabled = await sellBtn.evaluate(
      (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
    );

    console.log(`  Sell button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error(
        'Sell button should be disabled without canSell permission',
      );
    }

    console.log(
      '  Sell button correctly disabled for guest without permission',
    );

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Guest with revoked canConvertScrap permission → convert button disabled.
 */
function testConvertScrapDenied() {
  return runTest('Convert Scrap Denied Without Permission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ConvertDeniedGuest');
    console.log('  Both players connected');

    // Host revokes convert scrap permission from guest
    await togglePermission(hostPage, 'canConvertScrap', false);
    console.log('  Host revoked canConvertScrap from guest');

    // Wait for permission to propagate
    await sleep(500);

    // Guest navigates to store
    await navigateTo(guestPage, 'store');
    console.log('  Guest navigated to store');

    // Look for convert scrap button or scrap section
    const convertBtn = guestPage
      .locator(
        '#btn-convert-scrap, .btn-convert-scrap, [data-action="convert-scrap"]',
      )
      .first();
    const convertBtnVisible = await convertBtn.isVisible().catch(() => false);

    if (!convertBtnVisible) {
      // Check if there's a scrap section
      const scrapSection = guestPage
        .locator('.scrap-section, .scrap-list')
        .first();
      const hasScrap = await scrapSection.isVisible().catch(() => false);

      if (!hasScrap) {
        console.log('  No scrap section visible (campaign may not have scrap)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      // Try clicking on scrap to see convert button
      await scrapSection.click();
      await sleep(200);
    }

    // Re-check for convert button
    const convertBtnAfterClick = guestPage
      .locator(
        '#btn-convert-scrap, .btn-convert-scrap, [data-action="convert-scrap"]',
      )
      .first();
    const visible = await convertBtnAfterClick.isVisible().catch(() => false);

    if (!visible) {
      console.log('  Convert button not visible (no scrap to convert)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    const isDisabled = await convertBtnAfterClick.evaluate(
      (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
    );

    console.log(`  Convert button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error(
        'Convert button should be disabled without canConvertScrap permission',
      );
    }

    console.log(
      '  Convert button correctly disabled for guest without permission',
    );

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Buy denied without canBuy permission',
    fn: testBuyDeniedWithoutPermission,
  },
  {
    name: 'Sell denied without canSell permission',
    fn: testSellDeniedWithoutPermission,
  },
  {
    name: 'Convert scrap denied without permission',
    fn: testConvertScrapDenied,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Permission UI - Store', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
