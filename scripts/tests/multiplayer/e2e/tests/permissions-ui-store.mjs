/**
 * E2E Tests - Permissions UI (Store + Squadron)
 *
 * Tests for permission UI enforcement on store and squadron screens.
 * Total: 5 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  navigateTo,
  setupHostAndGuest,
  togglePermission,
} from '../helpers/index.mjs';

// =============================================================================
// Permission UI - Squadron
// =============================================================================

function testEquipDeniedWithoutPermission() {
  return runTest('Equip Denied With shipEdit=none', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await hostPage.mouse.move(0, 0);
    await sleep(200);
    await hostPage.evaluate(() => {
      for (const el of document.querySelectorAll('.host-popover')) el.remove();
    });
    await sleep(100);

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
    await guestRow.hover();
    await sleep(400);
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const shipEditSelect = hostPage.locator(
      '.host-popover select[data-permission="shipEdit"]',
    );
    if (await shipEditSelect.isVisible().catch(() => false)) {
      await shipEditSelect.selectOption('none');
      console.log('  Host set shipEdit to none');
      await sleep(500);
    }

    await hostPage.mouse.move(0, 0);
    await sleep(300);

    await navigateTo(guestPage, 'squadron');
    console.log('  Guest navigated to squadron');

    const weaponSlot = guestPage
      .locator('.weapon-slot, .slot-primary, .slot-secondary')
      .first();
    if (!(await weaponSlot.isVisible().catch(() => false))) {
      console.log('  No weapon slots visible');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    await weaponSlot.click();
    await sleep(300);

    const picker = guestPage.locator(
      '.weapon-picker, .equip-picker, .equip-modal',
    );
    if (await picker.isVisible().catch(() => false)) {
      const equipBtn = guestPage.locator('#btn-equip, .btn-equip').first();
      if (await equipBtn.isVisible().catch(() => false)) {
        const isDisabled = await equipBtn.evaluate(
          (el) =>
            el.hasAttribute('disabled') || el.classList.contains('disabled'),
        );
        console.log(`  Equip button disabled: ${isDisabled}`);
        if (!isDisabled)
          throw new Error('Equip button should be disabled with shipEdit=none');
      }
    } else {
      console.log('  Weapon picker did not open (correctly blocked)');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testShipEditOwnEnforcement() {
  return runTest('shipEdit=own → Cannot Edit Others Ship', async (browser) => {
    const { hostContext, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await navigateTo(guestPage, 'squadron');
    console.log('  Guest navigated to squadron');

    const deployedCount = await guestPage
      .locator('.ship-item.deployed')
      .count();
    console.log(`  Guest sees ${deployedCount} deployed ships`);

    if (deployedCount < 2) {
      console.log('  Not enough ships to test (need commander + wingman)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    await guestPage.locator('.ship-item.deployed').first().click();
    await sleep(500);
    console.log('  Guest selected commanders ship');

    const commanderSlot = guestPage
      .locator('.schematic-slot.primary.filled')
      .first();
    if (await commanderSlot.isVisible().catch(() => false)) {
      await commanderSlot.hover();
      await sleep(300);
      await commanderSlot.click();
      await sleep(300);

      const unequipBtn = guestPage.locator('.btn-unequip').first();
      if (await unequipBtn.isVisible().catch(() => false)) {
        const isDisabled = await unequipBtn.evaluate(
          (el) =>
            el.hasAttribute('disabled') || el.classList.contains('disabled'),
        );
        console.log(
          `  Unequip button on commanders ship disabled: ${isDisabled}`,
        );

        if (!isDisabled) {
          const title = await unequipBtn.getAttribute('title');
          const hasPermissionTooltip =
            title?.toLowerCase().includes('permission') ||
            title?.toLowerCase().includes('own');
          console.log(`  Has permission tooltip: ${hasPermissionTooltip}`);
          if (!hasPermissionTooltip)
            throw new Error(
              'Unequip should be disabled for commanders ship with shipEdit=own',
            );
        }
        console.log('  Correctly cannot unequip from commanders ship');
      } else {
        console.log('  No unequip button shown (correctly blocked)');
      }
    }

    await guestPage.locator('.ship-item.deployed').nth(1).click();
    await sleep(500);
    console.log('  Guest selected wingman ship');

    const wingmanSlot = guestPage
      .locator('.schematic-slot.primary.filled')
      .first();
    if (await wingmanSlot.isVisible().catch(() => false)) {
      await wingmanSlot.hover();
      await sleep(300);
      await wingmanSlot.click();
      await sleep(300);

      const unequipBtnWingman = guestPage.locator('.btn-unequip').first();
      if (await unequipBtnWingman.isVisible().catch(() => false)) {
        const isDisabledWingman = await unequipBtnWingman.evaluate(
          (el) =>
            el.hasAttribute('disabled') || el.classList.contains('disabled'),
        );
        console.log(
          `  Unequip button on wingman ship disabled: ${isDisabledWingman}`,
        );
        if (!isDisabledWingman)
          console.log('  Guest CAN unequip from their assigned ship');
        else console.log('  Wingman not guests assigned ship (also valid)');
      }
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Permission UI - Store
// =============================================================================

function testBuyDeniedWithoutPermission() {
  return runTest('Buy Denied Without Permission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await togglePermission(hostPage, 'canBuy', false);
    console.log('  Host revoked canBuy from guest');
    await sleep(500);

    await navigateTo(guestPage, 'store');
    console.log('  Guest navigated to store');

    const storeItem = guestPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false)))
      throw new Error('No store items visible on guest');
    await storeItem.click();
    await sleep(200);

    const buyBtn = guestPage.locator('#btn-buy, .btn-buy').first();
    if (!(await buyBtn.isVisible().catch(() => false))) {
      console.log('  Buy button not visible (may be correctly hidden)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    const isDisabled = await buyBtn.evaluate(
      (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
    );
    console.log(`  Buy button disabled: ${isDisabled}`);
    if (!isDisabled)
      throw new Error(
        'Buy button should be disabled without canBuy permission',
      );

    await hostContext.close();
    await guestContext.close();
  });
}

function testSellDeniedWithoutPermission() {
  return runTest('Sell Denied Without Permission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

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

    await navigateTo(hostPage, 'lobby');
    await togglePermission(hostPage, 'canSell', false);
    console.log('  Host revoked canSell from guest');
    await sleep(500);

    await navigateTo(guestPage, 'store');
    console.log('  Guest navigated to store');

    const storeItem = guestPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      console.log('  No store items visible on guest');
      await hostContext.close();
      await guestContext.close();
      return;
    }
    await storeItem.click();
    await sleep(200);

    const sellBtn = guestPage.locator('#btn-sell, .btn-sell').first();
    if (!(await sellBtn.isVisible().catch(() => false))) {
      console.log('  Sell button not visible (may be correctly hidden)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    const isDisabled = await sellBtn.evaluate(
      (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
    );
    console.log(`  Sell button disabled: ${isDisabled}`);
    if (!isDisabled)
      throw new Error(
        'Sell button should be disabled without canSell permission',
      );

    await hostContext.close();
    await guestContext.close();
  });
}

function testConvertScrapDenied() {
  return runTest('Convert Scrap Denied Without Permission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await togglePermission(hostPage, 'canConvertScrap', false);
    console.log('  Host revoked canConvertScrap from guest');
    await sleep(500);

    await navigateTo(guestPage, 'store');
    console.log('  Guest navigated to store');

    let convertBtn = guestPage
      .locator(
        '#btn-convert-scrap, .btn-convert-scrap, [data-action="convert-scrap"]',
      )
      .first();
    if (!(await convertBtn.isVisible().catch(() => false))) {
      const scrapSection = guestPage
        .locator('.scrap-section, .scrap-list')
        .first();
      if (!(await scrapSection.isVisible().catch(() => false))) {
        console.log('  No scrap section visible (campaign may not have scrap)');
        await hostContext.close();
        await guestContext.close();
        return;
      }
      await scrapSection.click();
      await sleep(200);
    }

    convertBtn = guestPage
      .locator(
        '#btn-convert-scrap, .btn-convert-scrap, [data-action="convert-scrap"]',
      )
      .first();
    if (!(await convertBtn.isVisible().catch(() => false))) {
      console.log('  Convert button not visible (no scrap to convert)');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    const isDisabled = await convertBtn.evaluate(
      (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
    );
    console.log(`  Convert button disabled: ${isDisabled}`);
    if (!isDisabled)
      throw new Error(
        'Convert button should be disabled without canConvertScrap permission',
      );

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Equip denied with shipEdit=none',
    fn: testEquipDeniedWithoutPermission,
  },
  {
    name: 'shipEdit=own cannot edit other ships',
    fn: testShipEditOwnEnforcement,
  },
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
  runTestSuite('Permissions UI Store Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
