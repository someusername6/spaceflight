/**
 * E2E Tests - Contracts Match
 *
 * Tests for contract matching between host and guest.
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import { setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Contract Match Tests
// =============================================================================

function testContractsMatch() {
  return runTest('Contracts Match Between Host and Guest', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await hostPage.click('#nav-contracts');
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const hostContracts = await hostPage.evaluate(() => {
      const items = document.querySelectorAll('.contract-list-item');
      return Array.from(items).map(
        (item) => item.getAttribute('data-contract-id') || item.id || 'unknown',
      );
    });
    console.log(`  Host contracts: ${JSON.stringify(hostContracts)}`);

    await guestPage.click('#nav-contracts');
    await guestPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const guestContracts = await guestPage.evaluate(() => {
      const items = document.querySelectorAll('.contract-list-item');
      return Array.from(items).map(
        (item) => item.getAttribute('data-contract-id') || item.id || 'unknown',
      );
    });
    console.log(`  Guest contracts: ${JSON.stringify(guestContracts)}`);

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

function testContractsMatchMultiple() {
  return runTest('Contracts Match (5 iterations)', async (browser) => {
    for (let i = 1; i <= 5; i++) {
      console.log(`  --- Iteration ${i} ---`);

      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);

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

      const match =
        JSON.stringify(hostContracts) === JSON.stringify(guestContracts);
      if (!match) {
        throw new Error(`Iteration ${i}: Contract mismatch!`);
      }

      await hostContext.close();
      await guestContext.close();
    }

    console.log('  All 5 iterations matched!');
  });
}

function testMissionLaunchContractFound() {
  return runTest(
    'Mission Launch - Contract Found on Guest (5 iterations)',
    async (browser) => {
      for (let i = 1; i <= 5; i++) {
        console.log(`  --- Iteration ${i} ---`);

        const { hostContext, hostPage, guestContext, guestPage } =
          await setupHostAndGuest(browser);

        let contractError = null;
        guestPage.on('console', (msg) => {
          const text = msg.text();
          if (text.includes('CONTRACT MISMATCH')) {
            contractError = text;
            console.log(`    [Guest] ${text}`);
          }
        });

        await hostPage.click('#btn-ready');
        await guestPage.click('#btn-ready');

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

        await hostPage.click('#nav-contracts');
        await hostPage.waitForSelector('.contracts-screen', {
          state: 'visible',
          timeout: TIMEOUTS.ui,
        });

        const contractId = await hostPage.evaluate(() => {
          const item = document.querySelector('.contract-list-item');
          return item?.getAttribute('data-contract-id');
        });
        console.log(`    Host accepting: ${contractId}`);

        await hostPage.click('.contract-list-item');
        await hostPage.click('#btn-accept-mission');

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

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Contracts match between host and guest', fn: testContractsMatch },
  { name: 'Contracts match (5 iterations)', fn: testContractsMatchMultiple },
  {
    name: 'Mission launch - contract found (5 iterations)',
    fn: testMissionLaunchContractFound,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Contracts Match Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
