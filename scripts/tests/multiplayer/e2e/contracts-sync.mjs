/**
 * E2E Tests - Contract Sync
 *
 * Tests for host contract actions syncing to guests:
 * - Host advances sector → Guest sees updated sector indicator
 * - Host refreshes contracts → Guest sees new contract list
 * - Guest click on Advance Sector button does nothing
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  getDisplayedCredits,
  isButtonDisabled,
  navigateTo,
  waitForCreditsToEqual,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the displayed sector from nav bar.
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
async function getDisplayedSector(page) {
  const sectorText = await page.locator('.nav-sector-name').textContent();
  const match = sectorText?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Wait for sector display to equal expected value.
 * @param {import('playwright').Page} page
 * @param {number} expected
 * @param {number} timeout
 */
async function waitForSectorToEqual(page, expected, timeout = 10000) {
  await page.waitForFunction(
    (exp) => {
      const el = document.querySelector('.nav-sector-name');
      const text = el?.textContent || '';
      const match = text.match(/(\d+)/);
      return match && parseInt(match[1], 10) === exp;
    },
    expected,
    { timeout },
  );
}

/**
 * Get contract IDs from the contracts list.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
async function getContractIds(page) {
  return page.evaluate(() => {
    const items = document.querySelectorAll('.contract-list-item');
    return Array.from(items).map(
      (el) => el.getAttribute('data-contract-id') || '',
    );
  });
}

/**
 * Check if Advance Sector button is disabled.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function isAdvanceSectorDisabled(page) {
  return isButtonDisabled(page, '#btn-advance-sector');
}

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Host advances sector → Guest sees updated sector indicator.
 */
function testHostAdvanceSectorSyncsToGuest() {
  return runTest('Host Advance Sector Syncs to Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Verify initial sector is 1
    const hostSectorBefore = await getDisplayedSector(hostPage);
    const guestSectorBefore = await getDisplayedSector(guestPage);
    console.log(
      `  Initial sector - Host: ${hostSectorBefore}, Guest: ${guestSectorBefore}`,
    );

    if (hostSectorBefore !== 1 || guestSectorBefore !== 1) {
      throw new Error('Expected initial sector to be 1');
    }

    // Host navigates to contracts
    await navigateTo(hostPage, 'contracts');
    console.log('  Host navigated to contracts');

    // Check host has enough credits (need 1000 for sector 1→2)
    const hostCredits = await getDisplayedCredits(hostPage);
    console.log(`  Host credits: ${hostCredits}`);
    if (hostCredits < 1000) {
      throw new Error(`Not enough credits to advance sector: ${hostCredits}`);
    }

    // Host clicks Advance Sector button
    await hostPage.click('#btn-advance-sector');

    // Wait for modal and confirm
    await hostPage.waitForSelector('.sector-advance-modal', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('#btn-advance-confirm');
    console.log('  Host confirmed sector advance');

    // Wait for modal to close
    await hostPage.waitForSelector('.sector-advance-modal', {
      state: 'hidden',
      timeout: 5000,
    });

    // Verify host sees sector 2
    await waitForSectorToEqual(hostPage, 2);
    const hostSectorAfter = await getDisplayedSector(hostPage);
    console.log(`  Host sector after advance: ${hostSectorAfter}`);

    // Wait for guest to sync
    await waitForSectorToEqual(guestPage, 2);
    const guestSectorAfter = await getDisplayedSector(guestPage);
    console.log(`  Guest sector after sync: ${guestSectorAfter}`);

    if (hostSectorAfter !== 2 || guestSectorAfter !== 2) {
      throw new Error(
        `Sector mismatch: Host=${hostSectorAfter}, Guest=${guestSectorAfter}`,
      );
    }

    // Verify credits were deducted on both (should be 0 after 1000 - 1000)
    const hostCreditsAfter = await getDisplayedCredits(hostPage);
    await waitForCreditsToEqual(guestPage, hostCreditsAfter);
    const guestCreditsAfter = await getDisplayedCredits(guestPage);
    console.log(
      `  Credits after - Host: ${hostCreditsAfter}, Guest: ${guestCreditsAfter}`,
    );

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Host refreshes contracts → Guest sees new contract list.
 */
function testHostRefreshContractsSyncsToGuest() {
  return runTest('Host Refresh Contracts Syncs to Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Both navigate to contracts
    await navigateTo(hostPage, 'contracts');
    await navigateTo(guestPage, 'contracts');
    console.log('  Both players on contracts screen');

    // Get initial contract IDs
    const hostContractsBefore = await getContractIds(hostPage);
    const guestContractsBefore = await getContractIds(guestPage);
    console.log(
      `  Initial contracts - Host: ${hostContractsBefore.length}, Guest: ${guestContractsBefore.length}`,
    );

    // Verify they match initially
    const initialMatch =
      hostContractsBefore.join(',') === guestContractsBefore.join(',');
    if (!initialMatch) {
      throw new Error('Initial contract lists do not match');
    }

    // Get initial credits
    const creditsBefore = await getDisplayedCredits(hostPage);
    console.log(`  Credits before refresh: ${creditsBefore}`);

    // Host clicks Refresh button
    await hostPage.click('#btn-refresh-contracts');
    await sleep(500);
    console.log('  Host clicked refresh');

    // Wait for credits to be deducted (50 cr at sector 1)
    const expectedCredits = creditsBefore - 50;
    await waitForCreditsToEqual(hostPage, expectedCredits);
    console.log(`  Host credits after refresh: ${expectedCredits}`);

    // Get new contract IDs on host
    const hostContractsAfter = await getContractIds(hostPage);
    console.log(`  Host contracts after refresh: ${hostContractsAfter.length}`);

    // Verify contracts changed (refresh should give different contracts)
    const contractsChanged =
      hostContractsBefore.join(',') !== hostContractsAfter.join(',');
    console.log(`  Contracts changed on host: ${contractsChanged}`);

    // Wait for guest to receive synced state
    await waitForCreditsToEqual(guestPage, expectedCredits);
    console.log('  Guest credits synced');

    // Guest needs to re-render to see new contracts - navigate away and back
    await navigateTo(guestPage, 'lobby');
    await navigateTo(guestPage, 'contracts');

    // Get guest contract IDs after sync
    const guestContractsAfter = await getContractIds(guestPage);
    console.log(`  Guest contracts after sync: ${guestContractsAfter.length}`);

    // Verify guest has same contracts as host
    const finalMatch =
      hostContractsAfter.join(',') === guestContractsAfter.join(',');
    if (!finalMatch) {
      console.log(`  Host contracts: ${hostContractsAfter.join(', ')}`);
      console.log(`  Guest contracts: ${guestContractsAfter.join(', ')}`);
      throw new Error('Contract lists do not match after refresh');
    }

    console.log('  ✓ Contract lists match after refresh');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Guest click on Advance Sector button does nothing.
 */
function testGuestAdvanceSectorButtonDisabled() {
  return runTest('Guest Advance Sector Button Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Both navigate to contracts
    await navigateTo(hostPage, 'contracts');
    await navigateTo(guestPage, 'contracts');
    console.log('  Both players on contracts screen');

    // Check if Advance Sector button is disabled for guest
    const isDisabled = await isAdvanceSectorDisabled(guestPage);
    console.log(`  Guest Advance Sector button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error('Advance Sector button should be disabled for guest');
    }

    // Check tooltip mentions host-only
    const tooltip = await guestPage
      .locator('#btn-advance-sector')
      .getAttribute('title');
    const hasHostOnlyTooltip = tooltip?.toLowerCase().includes('host');
    console.log(
      `  Has host-only tooltip: ${hasHostOnlyTooltip} ("${tooltip}")`,
    );

    if (!hasHostOnlyTooltip) {
      throw new Error('Advance Sector button should have host-only tooltip');
    }

    // Get initial sector and credits
    const sectorBefore = await getDisplayedSector(guestPage);
    const creditsBefore = await getDisplayedCredits(guestPage);
    console.log(
      `  Before click - Sector: ${sectorBefore}, Credits: ${creditsBefore}`,
    );

    // Force click the disabled button
    await guestPage.click('#btn-advance-sector', { force: true });
    await sleep(500);

    // Verify nothing changed
    const sectorAfter = await getDisplayedSector(guestPage);
    const creditsAfter = await getDisplayedCredits(guestPage);
    console.log(
      `  After click - Sector: ${sectorAfter}, Credits: ${creditsAfter}`,
    );

    if (sectorAfter !== sectorBefore || creditsAfter !== creditsBefore) {
      throw new Error('Guest click on disabled button should have no effect');
    }

    // Verify no modal appeared
    const modalVisible = await guestPage
      .locator('.sector-advance-modal')
      .isVisible()
      .catch(() => false);
    if (modalVisible) {
      throw new Error('Modal should not appear for guest');
    }

    console.log('  ✓ Guest Advance Sector button click had no effect');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Guest click on Refresh button does nothing.
 */
function testGuestRefreshButtonDisabled() {
  return runTest('Guest Refresh Button Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Both navigate to contracts
    await navigateTo(hostPage, 'contracts');
    await navigateTo(guestPage, 'contracts');
    console.log('  Both players on contracts screen');

    // Check if Refresh button is disabled for guest
    const isDisabled = await isButtonDisabled(
      guestPage,
      '#btn-refresh-contracts',
    );
    console.log(`  Guest Refresh button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error('Refresh button should be disabled for guest');
    }

    // Get initial state
    const contractsBefore = await getContractIds(guestPage);
    const creditsBefore = await getDisplayedCredits(guestPage);
    console.log(
      `  Before click - Contracts: ${contractsBefore.length}, Credits: ${creditsBefore}`,
    );

    // Force click the disabled button
    await guestPage.click('#btn-refresh-contracts', { force: true });
    await sleep(500);

    // Verify nothing changed
    const contractsAfter = await getContractIds(guestPage);
    const creditsAfter = await getDisplayedCredits(guestPage);
    console.log(
      `  After click - Contracts: ${contractsAfter.length}, Credits: ${creditsAfter}`,
    );

    const contractsUnchanged =
      contractsBefore.join(',') === contractsAfter.join(',');
    if (!contractsUnchanged || creditsAfter !== creditsBefore) {
      throw new Error(
        'Guest click on disabled Refresh button should have no effect',
      );
    }

    console.log('  ✓ Guest Refresh button click had no effect');

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
    name: 'Host advance sector syncs to guest',
    fn: testHostAdvanceSectorSyncsToGuest,
  },
  {
    name: 'Host refresh contracts syncs to guest',
    fn: testHostRefreshContractsSyncsToGuest,
  },
  {
    name: 'Guest advance sector button disabled',
    fn: testGuestAdvanceSectorButtonDisabled,
  },
  { name: 'Guest refresh button disabled', fn: testGuestRefreshButtonDisabled },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Contract Sync', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
