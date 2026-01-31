/**
 * E2E Tests - Permission Controls
 *
 * Tests for host permission checkboxes and UI controls.
 * Total: 4 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import { setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Permission Controls (from permissions.mjs)
// =============================================================================

function testHostSeesPermissionCheckboxes() {
  return runTest('Host Sees Permission Checkboxes', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
    await guestRow.hover();
    console.log('  Host: Hovering over guest player');

    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host: Popover appeared');

    const canBuyCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canBuy"]',
    );
    const canSellCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canSell"]',
    );
    const canConvertCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canConvertScrap"]',
    );

    const canBuyEnabled = await canBuyCheckbox.isEnabled();
    const canSellEnabled = await canSellCheckbox.isEnabled();
    const canConvertEnabled = await canConvertCheckbox.isEnabled();

    console.log(
      `  Checkbox states - canBuy: ${canBuyEnabled}, canSell: ${canSellEnabled}, canConvert: ${canConvertEnabled}`,
    );
    if (!canBuyEnabled || !canSellEnabled || !canConvertEnabled) {
      throw new Error('Permission checkboxes should be enabled for host');
    }

    const canBuyChecked = await canBuyCheckbox.isChecked();
    const canSellChecked = await canSellCheckbox.isChecked();
    const canConvertChecked = await canConvertCheckbox.isChecked();

    console.log(
      `  Initial values - canBuy: ${canBuyChecked}, canSell: ${canSellChecked}, canConvert: ${canConvertChecked}`,
    );
    if (!canBuyChecked || !canSellChecked || !canConvertChecked) {
      throw new Error('Permission checkboxes should be checked by default');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestNoPopover() {
  return runTest('Guest Does Not See Host Popover', async (browser) => {
    const { hostContext, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const hostRow = guestPage
      .locator('.player-row')
      .filter({ has: guestPage.locator('.host-indicator') });
    await hostRow.hover();
    console.log('  Guest: Hovering over host player');

    await sleep(500);
    const popoverVisible = await guestPage
      .locator('.host-popover')
      .isVisible()
      .catch(() => false);

    if (popoverVisible) throw new Error('Guest should not see host popover');
    console.log('  Guest: No popover appeared (as expected)');

    await hostContext.close();
    await guestContext.close();
  });
}

function testPermissionToggle() {
  return runTest('Permission Toggle Updates Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host: Popover visible');

    const canBuyCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canBuy"]',
    );
    await canBuyCheckbox.uncheck();
    console.log('  Host: Unchecked canBuy');

    await sleep(500);

    await hostPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (m) => m.textContent?.toLowerCase().includes('permissions'),
        ),
      { timeout: 5000 },
    );
    console.log('  Host: Permission change system message appeared');

    await guestPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (m) => m.textContent?.toLowerCase().includes('permissions'),
        ),
      { timeout: 5000 },
    );
    console.log('  Guest: Permission change system message received');

    await hostContext.close();
    await guestContext.close();
  });
}

function testShipEditSelect() {
  return runTest('Ship Edit Select', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    const shipEditSelect = hostPage.locator(
      '.host-popover select[data-permission="shipEdit"]',
    );
    if (!(await shipEditSelect.isVisible()))
      throw new Error('Ship edit select should exist');

    const currentValue = await shipEditSelect.inputValue();
    console.log(`  Ship edit select value: ${currentValue}`);
    if (currentValue !== 'own')
      throw new Error(
        `Ship edit should default to 'own', got '${currentValue}'`,
      );

    await shipEditSelect.selectOption('none');
    console.log('  Changed ship edit to none');
    await sleep(500);

    await hostPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (m) => m.textContent?.toLowerCase().includes('permissions'),
        ),
      { timeout: 5000 },
    );
    console.log('  Permission change message appeared');

    await hostPage.mouse.move(0, 0);
    await sleep(300);
    await hostPage.evaluate(() => {
      for (const el of document.querySelectorAll('.host-popover')) el.remove();
    });

    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });
    const shipEditSelectAny = hostPage
      .locator('.host-popover select[data-permission="shipEdit"]')
      .first();
    await shipEditSelectAny.selectOption('any');
    console.log('  Changed ship edit to any');

    await sleep(500);
    const newValue = await shipEditSelectAny.inputValue();
    if (newValue !== 'any')
      throw new Error(`Ship edit should be 'any', got '${newValue}'`);

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Host sees permission checkboxes',
    fn: testHostSeesPermissionCheckboxes,
  },
  { name: 'Guest does not see popover', fn: testGuestNoPopover },
  { name: 'Permission toggle updates guest', fn: testPermissionToggle },
  { name: 'Ship edit select works', fn: testShipEditSelect },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Permission Controls Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
