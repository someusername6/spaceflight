/**
 * E2E Test - Contract Synchronization
 *
 * Verifies that contracts generated on guest match those on host.
 * This is a focused test to diagnose the flaky "Contract not found" issue.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { TIMEOUTS } from './test-config.mjs';
import { isMainModule, runTest, runTestSuite } from './utils.mjs';

/**
 * Get the contract IDs from the contracts screen.
 */
async function getContractIds(page) {
  // Navigate to contracts
  await page.click('#nav-contracts');
  await page.waitForSelector('.contracts-screen', {
    state: 'visible',
    timeout: TIMEOUTS.ui,
  });

  // Get contract IDs from the DOM
  const contractIds = await page.evaluate(() => {
    const items = document.querySelectorAll('.contract-list-item');
    return Array.from(items).map(
      (item) => item.getAttribute('data-contract-id') || item.id || 'unknown',
    );
  });

  return contractIds;
}

/**
 * Test: Contracts match between host and guest.
 */
function testContractsMatch() {
  return runTest('Contracts Match Between Host and Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    // Get contracts from host
    const hostContracts = await getContractIds(hostPage);
    console.log(`  Host contracts: ${JSON.stringify(hostContracts)}`);

    // Navigate guest to contracts
    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    // Get contracts from guest
    const guestContracts = await getContractIds(guestPage);
    console.log(`  Guest contracts: ${JSON.stringify(guestContracts)}`);

    // Compare
    const hostSet = new Set(hostContracts);
    const guestSet = new Set(guestContracts);

    const missing = hostContracts.filter((c) => !guestSet.has(c));
    const extra = guestContracts.filter((c) => !hostSet.has(c));

    if (missing.length > 0 || extra.length > 0) {
      console.log(`  Missing on guest: ${JSON.stringify(missing)}`);
      console.log(`  Extra on guest: ${JSON.stringify(extra)}`);
      throw new Error(
        `Contract mismatch: missing=${missing.length}, extra=${extra.length}`,
      );
    }

    console.log('  Contracts match!');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Run multiple times to check for flakiness.
 */
function testContractsMatchMultiple() {
  return runTest('Contracts Match (5 iterations)', async (browser) => {
    for (let i = 1; i <= 5; i++) {
      console.log(`  --- Iteration ${i} ---`);

      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);

      // Get contracts from host
      await hostPage.click('#nav-contracts');
      await hostPage.waitForSelector('.contracts-screen', {
        state: 'visible',
        timeout: TIMEOUTS.ui,
      });

      const hostContracts = await hostPage.evaluate(() => {
        const items = document.querySelectorAll('.contract-list-item');
        return Array.from(items).map((item) => {
          const id = item.getAttribute('data-contract-id');
          const nameEl = item.querySelector('.contract-list-name');
          const name = nameEl?.textContent?.trim() || 'no-name';
          return `${id}:${name}`;
        });
      });
      console.log(`  Host: ${hostContracts.join(', ')}`);

      // Get contracts from guest
      await guestPage.click('#nav-contracts');
      await guestPage.waitForSelector('.contracts-screen', {
        state: 'visible',
        timeout: TIMEOUTS.ui,
      });

      const guestContracts = await guestPage.evaluate(() => {
        const items = document.querySelectorAll('.contract-list-item');
        return Array.from(items).map((item) => {
          const id = item.getAttribute('data-contract-id');
          const nameEl = item.querySelector('.contract-list-name');
          const name = nameEl?.textContent?.trim() || 'no-name';
          return `${id}:${name}`;
        });
      });
      console.log(`  Guest: ${guestContracts.join(', ')}`);

      // Compare
      const match =
        JSON.stringify(hostContracts) === JSON.stringify(guestContracts);
      if (!match) {
        throw new Error(
          `Iteration ${i}: Contract mismatch!\n  Host: ${hostContracts.join(', ')}\n  Guest: ${guestContracts.join(', ')}`,
        );
      }

      await hostContext.close();
      await guestContext.close();
    }

    console.log('  All 5 iterations matched!');
  });
}

/**
 * Test: Launch mission and verify contract is found on guest.
 * This exercises the exact code path that's failing.
 */
function testMissionLaunchContractFound() {
  return runTest(
    'Mission Launch - Contract Found on Guest (5 iterations)',
    async (browser) => {
      for (let i = 1; i <= 5; i++) {
        console.log(`  --- Iteration ${i} ---`);

        const { hostContext, hostPage, guestContext, guestPage } =
          await setupHostAndGuest(browser);

        // Capture console for debugging
        let contractError = null;
        hostPage.on('console', (msg) => {
          const text = msg.text();
          if (text.includes('lobby-launch')) {
            console.log(`    [Host] ${text}`);
          }
        });
        guestPage.on('console', (msg) => {
          const text = msg.text();
          if (text.includes('CONTRACT MISMATCH')) {
            contractError = text;
            console.log(`    [Guest] ${text}`);
          }
          if (text.includes('lobby-routing')) {
            console.log(`    [Guest] ${text}`);
          }
        });

        // Both players ready
        await hostPage.click('#btn-ready');
        await guestPage.click('#btn-ready');

        // Wait for both ready indicators
        await Promise.all([
          hostPage.waitForFunction(
            () =>
              document.querySelectorAll('.ready-indicator.ready').length >= 2,
            null,
            { timeout: TIMEOUTS.sync },
          ),
          guestPage.waitForFunction(
            () =>
              document.querySelectorAll('.ready-indicator.ready').length >= 2,
            null,
            { timeout: TIMEOUTS.sync },
          ),
        ]);

        // Host navigates to contracts and accepts first one
        await hostPage.click('#nav-contracts');
        await hostPage.waitForSelector('.contracts-screen', {
          state: 'visible',
          timeout: TIMEOUTS.ui,
        });

        // Get the contract ID that will be accepted
        const contractId = await hostPage.evaluate(() => {
          const item = document.querySelector('.contract-list-item');
          return item?.getAttribute('data-contract-id');
        });
        console.log(`    Host accepting: ${contractId}`);

        // Click the first contract to select it
        await hostPage.click('.contract-list-item');

        // Accept the contract
        await hostPage.click('#btn-accept-mission');

        // Wait for mission to start (HUD appears) or timeout
        const missionStarted = await Promise.race([
          guestPage
            .waitForFunction(
              () => {
                const hud = document.getElementById('hud');
                return hud && hud.offsetWidth > 0;
              },
              null,
              { timeout: TIMEOUTS.missionStart },
            )
            .then(() => true),
          new Promise((resolve) =>
            setTimeout(() => resolve(false), TIMEOUTS.missionStart),
          ),
        ]);

        if (contractError) {
          throw new Error(`Iteration ${i}: ${contractError}`);
        }

        if (!missionStarted) {
          throw new Error(`Iteration ${i}: Mission did not start on guest`);
        }

        console.log(`    Mission started successfully`);

        await hostContext.close();
        await guestContext.close();
      }

      console.log('  All 5 iterations succeeded!');
    },
  );
}

export const ALL_TESTS = [
  { name: 'Contracts match between host and guest', fn: testContractsMatch },
  { name: 'Contracts match (5 iterations)', fn: testContractsMatchMultiple },
  {
    name: 'Mission launch - contract found (5 iterations)',
    fn: testMissionLaunchContractFound,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Contract Sync', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
