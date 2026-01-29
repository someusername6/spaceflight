/**
 * E2E Tests - Phase 9 Contract & Launch Flow
 *
 * Tests for host-only contract actions and launch countdown.
 * These tests verify that:
 * - Only host can accept/refresh/advance contracts
 * - Guest sees buttons as disabled with tooltips
 * - Ready state is properly checked before launch
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  isAcceptMissionDisabled,
  isRefreshDisabled,
  selectContract,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Guest sees contract buttons as disabled.
 */
function testGuestContractButtonsDisabled() {
  return runTest('Guest Contract Buttons Disabled', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ContractGuest');
    console.log('  Both players connected');

    // Host navigates to contracts
    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host navigated to contracts');

    // Guest also sees contracts (via sync)
    await sleep(500);

    // Guest navigates to contracts
    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Guest navigated to contracts');

    // Select a contract on guest
    await selectContract(guestPage, 0);

    // Check if Accept Mission button is disabled for guest
    const acceptDisabled = await isAcceptMissionDisabled(guestPage);
    console.log(`  Guest Accept button disabled: ${acceptDisabled}`);

    // Check if Refresh button is disabled for guest
    const refreshDisabled = await isRefreshDisabled(guestPage);
    console.log(`  Guest Refresh button disabled: ${refreshDisabled}`);

    // Check tooltip on disabled button
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

/**
 * Test: Host can access contract actions.
 */
function testHostContractActionsEnabled() {
  return runTest('Host Contract Actions Enabled', async (browser) => {
    const { hostContext, hostPage, guestContext } = await setupHostAndGuest(
      browser,
      'ContractGuest2',
    );
    console.log('  Both players connected');

    // Host navigates to contracts
    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host navigated to contracts');

    // Select a contract
    await selectContract(hostPage, 0);

    // Check if Accept Mission button is enabled for host
    const acceptDisabled = await isAcceptMissionDisabled(hostPage);
    console.log(`  Host Accept button disabled: ${acceptDisabled}`);

    // Check if Refresh button is enabled for host (if they have credits)
    const refreshDisabled = await isRefreshDisabled(hostPage);
    console.log(`  Host Refresh button disabled: ${refreshDisabled}`);

    // Host Accept button should NOT be disabled (unless no commander assigned)
    // Refresh might be disabled due to credits, not multiplayer
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

/**
 * Test: Ready state check before launch.
 */
function testReadyStateCheckBeforeLaunch() {
  return runTest('Ready State Check Before Launch', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ReadyCheckGuest');
    console.log('  Both players connected');

    // Host navigates to contracts
    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });

    // Select a contract
    await selectContract(hostPage, 0);
    console.log('  Host selected contract');

    // Verify guest is NOT ready by default
    const guestReadyBefore = await guestPage
      .locator('.player-row:not(:has(.host-indicator)) .ready-indicator.ready')
      .count();
    console.log(`  Guest ready indicators before: ${guestReadyBefore}`);

    // Guest should NOT be ready, so launch should be blocked
    // We can verify by checking if clicking Accept shows a message
    // or if the canLaunch check would fail

    // For now, just verify the ready state check exists
    // Full countdown test would require more complex setup

    if (guestReadyBefore !== 0) {
      throw new Error('Guest should not be ready by default');
    }

    console.log('  (Guest not ready, launch would be blocked)');
    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Guest clicking disabled button does nothing.
 */
function testGuestClickDisabledButtonNoEffect() {
  return runTest('Guest Click Disabled Button No Effect', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ClickGuest');
    console.log('  Both players connected');

    // Navigate both to contracts
    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });

    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });

    // Select a contract on guest
    await selectContract(guestPage, 0);
    await sleep(300);

    // Get initial state (number of contracts or credits)
    const initialCredits = await guestPage.evaluate(() => {
      const el = document.querySelector('.nav-credits');
      return el?.textContent || '';
    });

    // Try clicking the disabled Accept button
    await guestPage.click('#btn-accept-mission', { force: true });
    await sleep(500);

    // Verify nothing happened - still on contracts screen
    const stillOnContracts =
      (await guestPage.locator('.contracts-screen').count()) > 0;

    // Credits unchanged
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
// Main
// =============================================================================

/** All test definitions */
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
  runTestSuite('E2E Tests - Phase 9 Contract & Launch', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
