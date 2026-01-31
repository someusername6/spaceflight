/**
 * E2E Tests - Permissions UI (Ship Edit)
 *
 * Tests for ship edit permission levels and UI enforcement.
 * Total: 6 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  navigateTo,
  setShipEditPermission,
  setupHostAndGuest,
  waitForSync,
} from '../helpers/index.mjs';

// =============================================================================
// Helpers
// =============================================================================

async function getShipEditPermission(hostPage) {
  await hostPage.mouse.move(0, 0);
  await sleep(200);
  await hostPage.evaluate(() => {
    for (const el of document.querySelectorAll('.host-popover')) el.remove();
  });
  await sleep(100);

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

  await hostPage.mouse.move(0, 0);
  await sleep(200);

  return value;
}

async function isChangeShipEnabled(page) {
  const btn = page.locator('#btn-change-ship, .btn-change-ship').first();
  if (!(await btn.isVisible().catch(() => false))) return false;
  const disabled =
    (await btn.getAttribute('disabled')) !== null ||
    (await btn.evaluate((el) => el.classList.contains('disabled')));
  return !disabled;
}

// =============================================================================
// Ship Edit Permission Tests
// =============================================================================

function testDefaultPermissionIsOwn() {
  return runTest('Default Ship Edit Permission Is Own', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const permission = await getShipEditPermission(hostPage);
    console.log(`  Default ship edit permission: ${permission}`);
    if (permission !== 'own')
      throw new Error(`Expected default 'own', got '${permission}'`);

    await hostContext.close();
    await guestContext.close();
  });
}

function testSetShipEditNone() {
  return runTest('Host Can Set Ship Edit To None', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await setShipEditPermission(hostPage, 'none');
    console.log('  Host set ship edit to none');

    const permission = await getShipEditPermission(hostPage);
    if (permission !== 'none')
      throw new Error(`Expected 'none', got '${permission}'`);

    await waitForSync(guestPage, 500);

    await guestPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (m) => m.textContent?.toLowerCase().includes('permissions'),
        ),
      { timeout: 5000 },
    );
    console.log('  Guest received permission change notification');

    await hostContext.close();
    await guestContext.close();
  });
}

function testSetShipEditAny() {
  return runTest('Host Can Set Ship Edit To Any', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await setShipEditPermission(hostPage, 'any');
    console.log('  Host set ship edit to any');

    const permission = await getShipEditPermission(hostPage);
    if (permission !== 'any')
      throw new Error(`Expected 'any', got '${permission}'`);

    await waitForSync(guestPage, 500);

    await guestPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.chat-message.system')).some(
          (m) => m.textContent?.toLowerCase().includes('permissions'),
        ),
      { timeout: 5000 },
    );
    console.log('  Guest received permission change notification');

    await hostContext.close();
    await guestContext.close();
  });
}

function testCycleAllOptions() {
  return runTest('Host Can Cycle All Ship Edit Options', async (browser) => {
    const { hostContext, hostPage, guestContext } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    let permission = await getShipEditPermission(hostPage);
    console.log(`  Initial: ${permission}`);
    if (permission !== 'own')
      throw new Error(`Expected initial 'own', got '${permission}'`);

    await setShipEditPermission(hostPage, 'none');
    permission = await getShipEditPermission(hostPage);
    console.log(`  After set to none: ${permission}`);
    if (permission !== 'none')
      throw new Error(`Expected 'none', got '${permission}'`);

    await setShipEditPermission(hostPage, 'any');
    permission = await getShipEditPermission(hostPage);
    console.log(`  After set to any: ${permission}`);
    if (permission !== 'any')
      throw new Error(`Expected 'any', got '${permission}'`);

    await setShipEditPermission(hostPage, 'own');
    permission = await getShipEditPermission(hostPage);
    console.log(`  After set back to own: ${permission}`);
    if (permission !== 'own')
      throw new Error(`Expected 'own', got '${permission}'`);

    await hostContext.close();
    await guestContext.close();
  });
}

function testShipEditNoneDisablesButtons() {
  return runTest(
    'Ship Edit None Disables Squadron Buttons',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await setShipEditPermission(hostPage, 'none');
      console.log('  Host set ship edit to none');
      await waitForSync(guestPage, 500);

      await navigateTo(guestPage, 'squadron');
      console.log('  Guest navigated to squadron');

      const changeShipEnabled = await isChangeShipEnabled(guestPage);
      console.log(`  Change Ship button enabled: ${changeShipEnabled}`);
      if (changeShipEnabled)
        throw new Error('Change Ship should be disabled with shipEdit=none');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testShipEditAnyEnablesButtons() {
  return runTest('Ship Edit Any Enables Squadron Buttons', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await setShipEditPermission(hostPage, 'any');
    console.log('  Host set ship edit to any');
    await waitForSync(guestPage, 500);

    await navigateTo(guestPage, 'squadron');
    console.log('  Guest navigated to squadron');

    const shipItem = guestPage.locator('.ship-item.deployed').first();
    if (await shipItem.isVisible()) {
      await shipItem.click();
      await sleep(300);
    }

    const changeShipEnabled = await isChangeShipEnabled(guestPage);
    console.log(`  Change Ship button enabled: ${changeShipEnabled}`);
    if (!changeShipEnabled)
      throw new Error('Change Ship should be enabled with shipEdit=any');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

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
  runTestSuite('Permissions UI Ship Edit Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
