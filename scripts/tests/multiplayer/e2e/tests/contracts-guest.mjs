/**
 * E2E Tests - Contracts Guest
 *
 * Tests for guest contract restrictions and UI behavior.
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
  isAcceptMissionDisabled,
  isRefreshDisabled,
  selectContract,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Guest Contract Tests
// =============================================================================

function testGuestContractButtonsDisabled() {
  return runTest('Guest Contract Buttons Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ContractGuest');
    console.log('  Both players connected');

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host navigated to contracts');

    await sleep(500);

    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Guest navigated to contracts');

    await selectContract(guestPage, 0);

    const acceptDisabled = await isAcceptMissionDisabled(guestPage);
    console.log(`  Guest Accept button disabled: ${acceptDisabled}`);

    const refreshDisabled = await isRefreshDisabled(guestPage);
    console.log(`  Guest Refresh button disabled: ${refreshDisabled}`);

    const tooltip = await guestPage
      .locator('#btn-accept-mission')
      .getAttribute('title');
    const hasHostOnlyTooltip = tooltip?.includes('host');
    console.log(`  Has host-only tooltip: ${hasHostOnlyTooltip}`);

    if (!(acceptDisabled && refreshDisabled && hasHostOnlyTooltip)) {
      throw new Error('Guest buttons not properly disabled');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostContractActionsEnabled() {
  return runTest('Host Contract Actions Enabled', async (browser) => {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'ContractGuest2',
    );
    console.log('  Both players connected');

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host navigated to contracts');

    await selectContract(hostPage, 0);

    const acceptDisabled = await isAcceptMissionDisabled(hostPage);
    console.log(`  Host Accept button disabled: ${acceptDisabled}`);

    const tooltip = await hostPage
      .locator('#btn-accept-mission')
      .getAttribute('title');
    const hasHostOnlyTooltip = tooltip?.includes('Only the host');

    if (hasHostOnlyTooltip) {
      throw new Error('Host seeing guest restrictions');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testReadyStateCheckBeforeLaunch() {
  return runTest('Ready State Check Before Launch', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ReadyCheckGuest');
    console.log('  Both players connected');

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });

    await selectContract(hostPage, 0);
    console.log('  Host selected contract');

    const guestReadyBefore = await guestPage
      .locator('.player-row:not(:has(.host-indicator)) .ready-indicator.ready')
      .count();
    console.log(`  Guest ready indicators before: ${guestReadyBefore}`);

    if (guestReadyBefore !== 0) {
      throw new Error('Guest should not be ready by default');
    }

    console.log('  (Guest not ready, launch would be blocked)');
    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestClickDisabledButtonNoEffect() {
  return runTest('Guest Click Disabled Button No Effect', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ClickGuest');
    console.log('  Both players connected');

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    await selectContract(guestPage, 0);
    await sleep(300);

    const initialCredits = await guestPage.evaluate(() => {
      const el = document.querySelector('.nav-credits');
      return el?.textContent || '';
    });

    await guestPage.click('#btn-accept-mission', { force: true });
    await sleep(500);

    const stillOnContracts =
      (await guestPage.locator('.contracts-screen').count()) > 0;

    const finalCredits = await guestPage.evaluate(() => {
      const el = document.querySelector('.nav-credits');
      return el?.textContent || '';
    });

    console.log(`  Still on contracts: ${stillOnContracts}`);
    console.log(`  Credits unchanged: ${initialCredits === finalCredits}`);

    if (!(stillOnContracts && initialCredits === finalCredits)) {
      throw new Error('Disabled button click had unexpected effect');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Guest contract buttons disabled',
    fn: testGuestContractButtonsDisabled,
  },
  { name: 'Host contract actions enabled', fn: testHostContractActionsEnabled },
  {
    name: 'Ready state check before launch',
    fn: testReadyStateCheckBeforeLaunch,
  },
  {
    name: 'Guest click disabled button no effect',
    fn: testGuestClickDisabledButtonNoEffect,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Contracts Guest Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
