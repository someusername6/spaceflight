/**
 * E2E Tests - Contracts Sector
 *
 * Tests for sector advance and refresh contract synchronization.
 * Total: 4 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  sleep,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  setupHostAndGuest,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Helpers
// =============================================================================

async function getContractIds(page) {
  await page.click('#nav-contracts');
  await page.waitForSelector('.contracts-screen', {
    state: 'visible',
    timeout: TIMEOUTS.ui,
  });

  return page.evaluate(() => {
    const items = document.querySelectorAll('.contract-list-item');
    return Array.from(items).map(
      (item) => item.getAttribute('data-contract-id') || item.id || 'unknown',
    );
  });
}

async function getDisplayedSector(page) {
  const sectorText = await page.locator('.nav-sector-name').textContent();
  const match = sectorText?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

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

// =============================================================================
// Sector and Refresh Sync Tests
// =============================================================================

function testHostAdvanceSectorSyncsToGuest() {
  return runTest('Host Advance Sector Syncs to Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const hostSectorBefore = await getDisplayedSector(hostPage);
    const guestSectorBefore = await getDisplayedSector(guestPage);
    console.log(
      `  Initial sector - Host: ${hostSectorBefore}, Guest: ${guestSectorBefore}`,
    );

    if (hostSectorBefore !== 1 || guestSectorBefore !== 1) {
      throw new Error('Expected initial sector to be 1');
    }

    await navigateTo(hostPage, 'contracts');
    console.log('  Host navigated to contracts');

    const hostCredits = await getDisplayedCredits(hostPage);
    console.log(`  Host credits: ${hostCredits}`);
    if (hostCredits < 1000) {
      throw new Error(`Not enough credits to advance sector: ${hostCredits}`);
    }

    await hostPage.click('#btn-advance-sector');

    await hostPage.waitForSelector('.sector-advance-modal', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('#btn-advance-confirm');
    console.log('  Host confirmed sector advance');

    await hostPage.waitForSelector('.sector-advance-modal', {
      state: 'hidden',
      timeout: 5000,
    });

    await waitForSectorToEqual(hostPage, 2);
    const hostSectorAfter = await getDisplayedSector(hostPage);
    console.log(`  Host sector after advance: ${hostSectorAfter}`);

    await waitForSectorToEqual(guestPage, 2);
    const guestSectorAfter = await getDisplayedSector(guestPage);
    console.log(`  Guest sector after sync: ${guestSectorAfter}`);

    if (hostSectorAfter !== 2 || guestSectorAfter !== 2) {
      throw new Error(
        `Sector mismatch: Host=${hostSectorAfter}, Guest=${guestSectorAfter}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostRefreshContractsSyncsToGuest() {
  return runTest('Host Refresh Contracts Syncs to Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await navigateTo(hostPage, 'contracts');
    await navigateTo(guestPage, 'contracts');
    console.log('  Both players on contracts screen');

    const hostContractsBefore = await getContractIds(hostPage);
    const guestContractsBefore = await getContractIds(guestPage);
    console.log(
      `  Initial contracts - Host: ${hostContractsBefore.length}, Guest: ${guestContractsBefore.length}`,
    );

    const initialMatch =
      hostContractsBefore.join(',') === guestContractsBefore.join(',');
    if (!initialMatch) {
      throw new Error('Initial contract lists do not match');
    }

    const creditsBefore = await getDisplayedCredits(hostPage);
    console.log(`  Credits before refresh: ${creditsBefore}`);

    await hostPage.click('#btn-refresh-contracts');
    await sleep(500);
    console.log('  Host clicked refresh');

    const expectedCredits = creditsBefore - 50;
    await waitForCreditsToEqual(hostPage, expectedCredits);
    console.log(`  Host credits after refresh: ${expectedCredits}`);

    const hostContractsAfter = await getContractIds(hostPage);
    console.log(`  Host contracts after refresh: ${hostContractsAfter.length}`);

    await waitForCreditsToEqual(guestPage, expectedCredits);
    console.log('  Guest credits synced');

    await navigateTo(guestPage, 'lobby');
    await navigateTo(guestPage, 'contracts');

    const guestContractsAfter = await getContractIds(guestPage);
    console.log(`  Guest contracts after sync: ${guestContractsAfter.length}`);

    const finalMatch =
      hostContractsAfter.join(',') === guestContractsAfter.join(',');
    if (!finalMatch) {
      throw new Error('Contract lists do not match after refresh');
    }

    console.log('  ✓ Contract lists match after refresh');

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestAdvanceSectorButtonDisabled() {
  return runTest('Guest Advance Sector Button Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await navigateTo(hostPage, 'contracts');
    await navigateTo(guestPage, 'contracts');
    console.log('  Both players on contracts screen');

    const isDisabled = await guestPage.evaluate(() => {
      const btn = document.querySelector('#btn-advance-sector');
      return btn?.hasAttribute('disabled') ?? false;
    });
    console.log(`  Guest Advance Sector button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error('Advance Sector button should be disabled for guest');
    }

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

    const sectorBefore = await getDisplayedSector(guestPage);
    const creditsBefore = await getDisplayedCredits(guestPage);
    console.log(
      `  Before click - Sector: ${sectorBefore}, Credits: ${creditsBefore}`,
    );

    await guestPage.click('#btn-advance-sector', { force: true });
    await sleep(500);

    const sectorAfter = await getDisplayedSector(guestPage);
    const creditsAfter = await getDisplayedCredits(guestPage);
    console.log(
      `  After click - Sector: ${sectorAfter}, Credits: ${creditsAfter}`,
    );

    if (sectorAfter !== sectorBefore || creditsAfter !== creditsBefore) {
      throw new Error('Guest click on disabled button should have no effect');
    }

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

function testGuestRefreshButtonDisabled() {
  return runTest('Guest Refresh Button Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await navigateTo(hostPage, 'contracts');
    await navigateTo(guestPage, 'contracts');
    console.log('  Both players on contracts screen');

    const isDisabled = await guestPage.evaluate(() => {
      const btn = document.querySelector('#btn-refresh-contracts');
      return btn?.hasAttribute('disabled') ?? false;
    });
    console.log(`  Guest Refresh button disabled: ${isDisabled}`);

    if (!isDisabled) {
      throw new Error('Refresh button should be disabled for guest');
    }

    const contractsBefore = await getContractIds(guestPage);
    const creditsBefore = await getDisplayedCredits(guestPage);
    console.log(
      `  Before click - Contracts: ${contractsBefore.length}, Credits: ${creditsBefore}`,
    );

    await guestPage.click('#btn-refresh-contracts', { force: true });
    await sleep(500);

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
// Exports
// =============================================================================

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
  runTestSuite('Contracts Sector Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
