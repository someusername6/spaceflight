/**
 * E2E Tests - Ship Edit Permissions
 *
 * Tests for the three ship edit permission levels: none, own, any.
 * Verifies:
 * - Default permission is 'own'
 * - All three options are selectable in the UI
 * - Permission changes propagate to guest
 * - Enforcement on squadron screen
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { navigateTo, setShipEditPermission, waitForSync } from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the current ship edit permission value from the popover.
 * @param {import('playwright').Page} hostPage
 * @returns {Promise<string>}
 */
async function getShipEditPermission(hostPage) {
  // Clean up any existing popovers first
  await hostPage.mouse.move(0, 0);
  await sleep(200);
  await hostPage.evaluate(() => {
    for (const el of document.querySelectorAll('.host-popover')) {
      el.remove();
    }
  });
  await sleep(100);

  // Open popover
  const guestRow = hostPage
    .locator('.player-row:not(:has(.host-indicator))')
    .first();
  await guestRow.hover();
  await hostPage.waitForSelector('.host-popover', {
    state: 'visible',
    timeout: 3000,
  });

  const select = hostPage
    .locator('.host-popover select[data-permission="shipEdit"]')
    .first();
  const value = await select.inputValue();

  // Close popover
  await hostPage.mouse.move(0, 0);
  await sleep(200);

  return value;
}

/**
 * Check if Change Ship button is enabled on squadron screen.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function isChangeShipEnabled(page) {
  const btn = page.locator('#btn-change-ship, .btn-change-ship').first();
  if (!(await btn.isVisible().catch(() => false))) {
    return false;
  }
  const disabled =
    (await btn.getAttribute('disabled')) !== null ||
    (await btn.evaluate((el) => el.classList.contains('disabled')));
  return !disabled;
}

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Default ship edit permission is 'own'.
 */
function testDefaultPermissionIsOwn() {
  return runTest('Default Ship Edit Permission Is Own', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const permission = await getShipEditPermission(hostPage);
    console.log(`  Default ship edit permission: ${permission}`);

    if (permission !== 'own') {
      throw new Error(`Expected default 'own', got '${permission}'`);
    }

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Host can set ship edit to 'none'.
 */
function testSetShipEditNone() {
  return runTest('Host Can Set Ship Edit To None', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Set to 'none'
    await setShipEditPermission(hostPage, 'none');
    console.log('  Host set ship edit to none');

    // Verify it stuck
    const permission = await getShipEditPermission(hostPage);
    if (permission !== 'none') {
      throw new Error(`Expected 'none', got '${permission}'`);
    }

    // Wait for sync
    await waitForSync(guestPage, 500);

    // Guest should see system message
    await guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.toLowerCase().includes('permissions'),
        );
      },
      { timeout: 5000 },
    );
    console.log('  Guest received permission change notification');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Host can set ship edit to 'any'.
 */
function testSetShipEditAny() {
  return runTest('Host Can Set Ship Edit To Any', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Set to 'any'
    await setShipEditPermission(hostPage, 'any');
    console.log('  Host set ship edit to any');

    // Verify it stuck
    const permission = await getShipEditPermission(hostPage);
    if (permission !== 'any') {
      throw new Error(`Expected 'any', got '${permission}'`);
    }

    // Wait for sync
    await waitForSync(guestPage, 500);

    // Guest should see system message
    await guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some((m) =>
          m.textContent?.toLowerCase().includes('permissions'),
        );
      },
      { timeout: 5000 },
    );
    console.log('  Guest received permission change notification');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Host can cycle through all three options.
 */
function testCycleAllOptions() {
  return runTest('Host Can Cycle All Ship Edit Options', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Initial: should be 'own'
    let permission = await getShipEditPermission(hostPage);
    console.log(`  Initial: ${permission}`);
    if (permission !== 'own') {
      throw new Error(`Expected initial 'own', got '${permission}'`);
    }

    // Set to 'none'
    await setShipEditPermission(hostPage, 'none');
    permission = await getShipEditPermission(hostPage);
    console.log(`  After set to none: ${permission}`);
    if (permission !== 'none') {
      throw new Error(`Expected 'none', got '${permission}'`);
    }

    // Set to 'any'
    await setShipEditPermission(hostPage, 'any');
    permission = await getShipEditPermission(hostPage);
    console.log(`  After set to any: ${permission}`);
    if (permission !== 'any') {
      throw new Error(`Expected 'any', got '${permission}'`);
    }

    // Set back to 'own'
    await setShipEditPermission(hostPage, 'own');
    permission = await getShipEditPermission(hostPage);
    console.log(`  After set back to own: ${permission}`);
    if (permission !== 'own') {
      throw new Error(`Expected 'own', got '${permission}'`);
    }

    console.log('  ✓ All three options cycle correctly');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Ship edit 'none' disables squadron buttons for guest.
 */
function testShipEditNoneDisablesButtons() {
  return runTest(
    'Ship Edit None Disables Squadron Buttons',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      // Set to 'none'
      await setShipEditPermission(hostPage, 'none');
      console.log('  Host set ship edit to none');

      // Wait for sync
      await waitForSync(guestPage, 500);

      // Guest navigates to squadron
      await navigateTo(guestPage, 'squadron');
      console.log('  Guest navigated to squadron');

      // Check if ship list shows disabled state or no edit options
      const changeShipEnabled = await isChangeShipEnabled(guestPage);
      console.log(`  Change Ship button enabled: ${changeShipEnabled}`);

      // With 'none', guest should not be able to edit
      if (changeShipEnabled) {
        throw new Error('Change Ship should be disabled with shipEdit=none');
      }

      console.log('  ✓ Squadron buttons disabled for shipEdit=none');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test: Ship edit 'any' enables squadron buttons for guest.
 */
function testShipEditAnyEnablesButtons() {
  return runTest('Ship Edit Any Enables Squadron Buttons', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Set to 'any'
    await setShipEditPermission(hostPage, 'any');
    console.log('  Host set ship edit to any');

    // Wait for sync
    await waitForSync(guestPage, 500);

    // Guest navigates to squadron
    await navigateTo(guestPage, 'squadron');
    console.log('  Guest navigated to squadron');

    // Select a ship
    const shipItem = guestPage.locator('.ship-item.deployed').first();
    if (await shipItem.isVisible()) {
      await shipItem.click();
      await sleep(300);
    }

    // Check if Change Ship button is enabled
    const changeShipEnabled = await isChangeShipEnabled(guestPage);
    console.log(`  Change Ship button enabled: ${changeShipEnabled}`);

    // With 'any', guest should be able to edit
    if (!changeShipEnabled) {
      throw new Error('Change Ship should be enabled with shipEdit=any');
    }

    console.log('  ✓ Squadron buttons enabled for shipEdit=any');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

/** All test definitions */
export const ALL_TESTS = [
  { name: 'Default permission is own', fn: testDefaultPermissionIsOwn },
  { name: 'Host can set ship edit to none', fn: testSetShipEditNone },
  { name: 'Host can set ship edit to any', fn: testSetShipEditAny },
  { name: 'Host can cycle all options', fn: testCycleAllOptions },
  {
    name: 'Ship edit none disables buttons',
    fn: testShipEditNoneDisablesButtons,
  },
  { name: 'Ship edit any enables buttons', fn: testShipEditAnyEnablesButtons },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Ship Edit Permissions', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
