/**
 * E2E Tests - Partial Death Scenarios
 *
 * Tests for the new multiplayer defeat condition where ALL human players
 * must die for defeat, not just the host/commander.
 *
 * Test scenarios:
 * - Host dies, guest alive → mission continues (host enters spectator)
 * - Guest dies, host alive → mission continues (guest enters spectator)
 * - Both die → mission ends with defeat
 *
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import { forceAllHumanPlayersDeath } from '../helpers/debrief.mjs';
import {
  forceLocalPlayerDeath,
  isInSpectatorModeInternal,
  launchMissionAndWait,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Partial Death Scenario Tests
// =============================================================================

function testHostDeathAloneDoesNotEndMission() {
  return runTest('Host Death Alone Does Not End Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Verify both players start with weapons (not spectating)
    const [hostHasWeapons, guestHasWeapons] = await Promise.all([
      hostPage
        .locator('.weapon-display')
        .isVisible()
        .catch(() => false),
      guestPage
        .locator('.weapon-display')
        .isVisible()
        .catch(() => false),
    ]);
    console.log(
      `  Starting weapons: host=${hostHasWeapons}, guest=${guestHasWeapons}`,
    );

    if (!hostHasWeapons || !guestHasWeapons) {
      throw new Error('Both players should start with weapons display');
    }

    // Force host death only
    const hostDeathForced = await forceLocalPlayerDeath(hostPage);
    console.log(`  Host death forced: ${hostDeathForced}`);

    if (!hostDeathForced) {
      throw new Error('Failed to force host death');
    }

    // Wait for host to enter spectator mode
    await hostPage.waitForFunction(
      () => window.__TEST__?.isInSpectatorMode?.() === true,
      null,
      { timeout: TIMEOUTS.ui },
    );
    console.log('  Host entered spectator mode');

    // Small delay to let mission system process
    await new Promise((r) => setTimeout(r, 500));

    // Verify mission is still running (guest still has HUD and weapons)
    const guestStillHasHud = await guestPage
      .locator('#hud')
      .isVisible()
      .catch(() => false);
    const guestStillHasWeapons = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    console.log(
      `  Guest still has HUD: ${guestStillHasHud}, weapons: ${guestStillHasWeapons}`,
    );

    if (!guestStillHasHud || !guestStillHasWeapons) {
      throw new Error(
        'Mission ended prematurely - guest lost controls when only host died',
      );
    }

    // Verify host is spectating but guest is NOT
    const guestIsSpectating = await isInSpectatorModeInternal(guestPage);
    console.log(`  Guest spectating: ${guestIsSpectating}`);

    if (guestIsSpectating) {
      throw new Error('Guest should not be spectating when only host died');
    }

    // Verify no results screen appeared (mission still in progress)
    const hasResultsScreen = await hostPage
      .locator('.results-screen')
      .isVisible()
      .catch(() => false);
    console.log(`  Results screen visible: ${hasResultsScreen}`);

    if (hasResultsScreen) {
      throw new Error(
        'Results screen should not appear when only host died - mission should continue',
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestDeathAloneDoesNotEndMission() {
  return runTest('Guest Death Alone Does Not End Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Force guest death only
    const guestDeathForced = await forceLocalPlayerDeath(guestPage);
    console.log(`  Guest death forced: ${guestDeathForced}`);

    if (!guestDeathForced) {
      throw new Error('Failed to force guest death');
    }

    // Wait for guest to enter spectator mode
    await guestPage.waitForFunction(
      () => window.__TEST__?.isInSpectatorMode?.() === true,
      null,
      { timeout: TIMEOUTS.ui },
    );
    console.log('  Guest entered spectator mode');

    // Small delay to let mission system process
    await new Promise((r) => setTimeout(r, 500));

    // Verify mission is still running (host still has HUD and weapons)
    const hostStillHasHud = await hostPage
      .locator('#hud')
      .isVisible()
      .catch(() => false);
    const hostStillHasWeapons = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    console.log(
      `  Host still has HUD: ${hostStillHasHud}, weapons: ${hostStillHasWeapons}`,
    );

    if (!hostStillHasHud || !hostStillHasWeapons) {
      throw new Error(
        'Mission ended prematurely - host lost controls when only guest died',
      );
    }

    // Verify host is NOT spectating
    const hostIsSpectating = await isInSpectatorModeInternal(hostPage);
    console.log(`  Host spectating: ${hostIsSpectating}`);

    if (hostIsSpectating) {
      throw new Error('Host should not be spectating when only guest died');
    }

    // Verify no results screen appeared (mission still in progress)
    const hasResultsScreen = await guestPage
      .locator('.results-screen')
      .isVisible()
      .catch(() => false);
    console.log(`  Results screen visible: ${hasResultsScreen}`);

    if (hasResultsScreen) {
      throw new Error(
        'Results screen should not appear when only guest died - mission should continue',
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testAllHumanDeathEndsMission() {
  return runTest(
    'All Human Deaths End Mission with Defeat',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Force ALL human player deaths on both clients
      const [hostForced, guestForced] = await Promise.all([
        forceAllHumanPlayersDeath(hostPage),
        forceAllHumanPlayersDeath(guestPage),
      ]);
      console.log(
        `  All human deaths forced: host=${hostForced}, guest=${guestForced}`,
      );

      if (!hostForced && !guestForced) {
        throw new Error('Failed to force deaths on either client');
      }

      // Wait for results screen on both (defeat)
      await Promise.all([
        hostPage.waitForSelector('.results-screen, .game-over-screen', {
          state: 'visible',
          timeout: 60000,
        }),
        guestPage.waitForSelector('.results-screen, .game-over-screen', {
          state: 'visible',
          timeout: 60000,
        }),
      ]);
      console.log('  Both players see end screen');

      // Get what type of end screen each sees
      const [hostHasResults, guestHasResults] = await Promise.all([
        hostPage
          .locator('.results-screen')
          .isVisible()
          .catch(() => false),
        guestPage
          .locator('.results-screen')
          .isVisible()
          .catch(() => false),
      ]);
      const [hostHasGameOver, guestHasGameOver] = await Promise.all([
        hostPage
          .locator('.game-over-screen')
          .isVisible()
          .catch(() => false),
        guestPage
          .locator('.game-over-screen')
          .isVisible()
          .catch(() => false),
      ]);
      console.log(
        `  Results screen: host=${hostHasResults}, guest=${guestHasResults}`,
      );
      console.log(
        `  Game over screen: host=${hostHasGameOver}, guest=${guestHasGameOver}`,
      );

      // HUD might still be visible behind results, so check for end screens instead
      if (!hostHasResults && !hostHasGameOver) {
        throw new Error(
          'Host should see results or game over screen after all humans died',
        );
      }
      if (!guestHasResults && !guestHasGameOver) {
        throw new Error(
          'Guest should see results or game over screen after all humans died',
        );
      }

      console.log('  Mission ended correctly with defeat');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Host death alone does not end mission',
    fn: testHostDeathAloneDoesNotEndMission,
  },
  {
    name: 'Guest death alone does not end mission',
    fn: testGuestDeathAloneDoesNotEndMission,
  },
  {
    name: 'All human deaths end mission',
    fn: testAllHumanDeathEndsMission,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Partial Death Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
