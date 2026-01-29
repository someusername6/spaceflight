/**
 * Lobby E2E UI Tests - Permissions
 *
 * Tests for permission controls in the host popover.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Host sees enabled permission checkboxes in popover.
 */
function testHostSeesPermissionCheckboxes() {
  return runTest('Host Sees Permission Checkboxes', async (browser) => {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'PermGuest',
    );
    console.log('  Both players connected');

    // Find guest player row (the one that's not the host)
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });

    // Hover over guest to show popover
    await guestRow.hover();
    console.log('  Host: Hovering over guest player');

    // Wait for popover to appear
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host: Popover appeared');

    // Check that permission checkboxes exist and are enabled
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

    // Check that checkboxes are initially checked (default permissions)
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

/**
 * Test: Guest does not see permission popover on other players.
 */
function testGuestNoPopover() {
  return runTest('Guest Does Not See Host Popover', async (browser) => {
    const { hostContext, guestContext, guestPage } = await setupHostAndGuest(
      browser,
      'NoPopGuest',
    );
    console.log('  Both players connected');

    // Find host player row (the one with host indicator)
    const hostRow = guestPage.locator('.player-row').filter({
      has: guestPage.locator('.host-indicator'),
    });

    // Hover over host
    await hostRow.hover();
    console.log('  Guest: Hovering over host player');

    // Wait a bit and check popover does NOT appear
    await sleep(500);

    const popoverVisible = await guestPage
      .locator('.host-popover')
      .isVisible()
      .catch(() => false);

    if (popoverVisible) {
      throw new Error('Guest should not see host popover');
    }

    console.log('  Guest: No popover appeared (as expected)');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Toggling permission checkbox updates guest permissions.
 */
function testPermissionToggle() {
  return runTest('Permission Toggle Updates Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ToggleGuest');
    console.log('  Both players connected');

    // Find guest player row
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });

    // Hover to show popover
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host: Popover visible');

    // Uncheck canBuy
    const canBuyCheckbox = hostPage.locator(
      '.host-popover input[data-permission="canBuy"]',
    );
    await canBuyCheckbox.uncheck();
    console.log('  Host: Unchecked canBuy');

    // Wait for permission change to propagate
    await sleep(500);

    // Check that system message appeared
    await hostPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.toLowerCase().includes('permissions'),
        );
      },
      { timeout: 5000 },
    );
    console.log('  Host: Permission change system message appeared');

    // Verify guest sees the system message too
    await guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.toLowerCase().includes('permissions'),
        );
      },
      { timeout: 5000 },
    );
    console.log('  Guest: Permission change system message received');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Ship edit permission select works.
 */
function testShipEditSelect() {
  return runTest('Ship Edit Select', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Find guest player row
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });

    // Hover to show popover
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover', {
      state: 'visible',
      timeout: 5000,
    });

    // Check ship edit select exists
    const shipEditSelect = hostPage.locator(
      '.host-popover select[data-permission="shipEdit"]',
    );
    const selectExists = await shipEditSelect.isVisible();

    if (!selectExists) {
      throw new Error('Ship edit select should exist');
    }

    // Check current value (should be 'own' by default)
    const currentValue = await shipEditSelect.inputValue();
    console.log(`  Ship edit select value: ${currentValue}`);

    if (currentValue !== 'own') {
      throw new Error(
        `Ship edit should default to 'own', got '${currentValue}'`,
      );
    }

    // Change to 'none' to disable loadout editing
    await shipEditSelect.selectOption('none');
    console.log('  Changed ship edit to none');

    // Wait for propagation
    await sleep(500);

    // Verify system message
    await hostPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.toLowerCase().includes('permissions'),
        );
      },
      { timeout: 5000 },
    );
    console.log('  Permission change message appeared');

    // Move mouse away to close popover
    await hostPage.mouse.move(0, 0);
    await sleep(300);

    // Clear any existing popovers
    await hostPage.evaluate(() => {
      for (const el of document.querySelectorAll('.host-popover')) {
        el.remove();
      }
    });

    // Change to 'any' to enable all ship editing
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

    // Verify value changed
    const newValue = await shipEditSelectAny.inputValue();
    if (newValue !== 'any') {
      throw new Error(`Ship edit should be 'any', got '${newValue}'`);
    }

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
    name: 'Host sees permission checkboxes',
    fn: testHostSeesPermissionCheckboxes,
  },
  { name: 'Guest does not see popover', fn: testGuestNoPopover },
  { name: 'Permission toggle updates guest', fn: testPermissionToggle },
  { name: 'Ship edit select works', fn: testShipEditSelect },
  // Note: Permission sync tests are in permission-sync.mjs
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Lobby E2E Tests - Permissions', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
