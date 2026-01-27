/**
 * Lobby E2E UI Tests - Permissions
 *
 * Tests for permission controls in the host popover.
 */

import { chromium } from 'playwright';
import {
  printResults,
  sleep,
  startServers,
  stopServers,
} from './e2e-test-utils.mjs';
import { setupHostAndGuest } from './e2e-tests-connection-helpers.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Host sees enabled permission checkboxes in popover.
 */
async function testHostSeesPermissionCheckboxes() {
  console.log('\n=== Test: Host Sees Permission Checkboxes ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
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

    console.log('\n  Host sees permission checkboxes test PASSED\n');
    await hostContext.close();
    await guestContext.close();
    return true;
  } catch (error) {
    console.error(
      '\n  Host sees permission checkboxes test FAILED:',
      error.message,
      '\n',
    );
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Guest does not see permission popover on other players.
 */
async function testGuestNoPopover() {
  console.log('\n=== Test: Guest Does Not See Host Popover ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
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

    console.log('\n  Guest no popover test PASSED\n');
    await hostContext.close();
    await guestContext.close();
    return true;
  } catch (error) {
    console.error('\n  Guest no popover test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Toggling permission checkbox updates guest permissions.
 */
async function testPermissionToggle() {
  console.log('\n=== Test: Permission Toggle Updates Guest ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
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

    console.log('\n  Permission toggle test PASSED\n');
    await hostContext.close();
    await guestContext.close();
    return true;
  } catch (error) {
    console.error('\n  Permission toggle test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Test: Ship edit permission checkbox works.
 */
async function testShipEditCheckbox() {
  console.log('\n=== Test: Ship Edit Checkbox ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'ShipEditGuest',
    );
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

    // Check ship edit checkbox exists and is enabled
    const shipEditCheckbox = hostPage.locator(
      '.host-popover input[data-permission="shipEdit"]',
    );
    const isEnabled = await shipEditCheckbox.isEnabled();

    if (!isEnabled) {
      throw new Error('Ship edit checkbox should be enabled');
    }

    // Check current value (should be checked by default)
    const isChecked = await shipEditCheckbox.isChecked();
    console.log(`  Ship edit checkbox checked: ${isChecked}`);

    if (!isChecked) {
      throw new Error('Ship edit checkbox should be checked by default');
    }

    // Uncheck to disable loadout editing
    await shipEditCheckbox.uncheck();
    console.log('  Unchecked ship edit permission');

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

    console.log('\n  Ship edit checkbox test PASSED\n');
    await hostContext.close();
    await guestContext.close();
    return true;
  } catch (error) {
    console.error('\n  Ship edit checkbox test FAILED:', error.message, '\n');
    return false;
  } finally {
    await browser.close();
  }
}

// Permission sync tests moved to e2e-tests-permission-sync.mjs
// Re-export for use by e2e-tests-state-sync.mjs
export {
  testMultiplePermissionChangesSync,
  testPermissionChangeSync,
} from './e2e-tests-permission-sync.mjs';

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n============================================');
  console.log('   Lobby E2E Tests - Permissions');
  console.log('============================================\n');

  try {
    await startServers();
  } catch (error) {
    console.error('Failed to start servers:', error.message);
    process.exit(1);
  }

  const results = [];

  try {
    // UI tests
    results.push({
      name: 'Host sees permission checkboxes',
      passed: await testHostSeesPermissionCheckboxes(),
    });

    results.push({
      name: 'Guest does not see popover',
      passed: await testGuestNoPopover(),
    });

    results.push({
      name: 'Permission toggle updates guest',
      passed: await testPermissionToggle(),
    });

    results.push({
      name: 'Ship edit checkbox works',
      passed: await testShipEditCheckbox(),
    });

    // Note: Sync tests are in e2e-tests-permission-sync.mjs
    // and called from e2e-tests-state-sync.mjs
  } finally {
    await stopServers();
  }

  const { failed } = printResults(results);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
