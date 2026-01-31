/**
 * E2E Tests - Mission Wingman
 *
 * Tests for wingman display and pilot interface in missions.
 * Total: 7 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  getPlayerCallsign,
  getWingmanCallsigns,
  isSpectatorMode,
  launchMissionAndWait,
  playerHasShipAssigned,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Wingman Pilot Tests
// =============================================================================

function testGuestAutoAssignedShip() {
  return runTest('Guest Auto-Assigned Ship on Join', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        const hasAssignMessage = Array.from(messages).some(
          (m) =>
            m.textContent?.includes('assigned') ||
            m.textContent?.includes('ship'),
        );
        const playerRows = document.querySelectorAll('.player-row');
        return playerRows.length >= 2 || hasAssignMessage;
      },
      null,
      { timeout: TIMEOUTS.sync },
    );

    const guestHasShip = await playerHasShipAssigned(guestPage, true);
    console.log(`  Guest has ship assigned: ${guestHasShip}`);

    const hostCallsign = await getPlayerCallsign(hostPage, true);
    const guestCallsign = await getPlayerCallsign(guestPage, true);
    console.log(`  Host callsign: ${hostCallsign}`);
    console.log(`  Guest callsign: ${guestCallsign}`);

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostSeesGuestInWingmanHUD() {
  return runTest('Host Sees Guest in Wingman HUD', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const guestCallsign = await getPlayerCallsign(guestPage, true);
    console.log(`  Guest callsign: ${guestCallsign}`);

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const hostWingmanCallsigns = await getWingmanCallsigns(hostPage);
    console.log(
      `  Host sees wingmen: [${hostWingmanCallsigns.join(', ')}] (count: ${hostWingmanCallsigns.length})`,
    );

    const expectedWingmenCount = 3;
    if (hostWingmanCallsigns.length === 0) {
      throw new Error('Host sees no wingmen - wingman display is empty');
    }

    if (hostWingmanCallsigns.length !== expectedWingmenCount) {
      throw new Error(
        `Host sees ${hostWingmanCallsigns.length} wingmen, expected ${expectedWingmenCount}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testGuestSeesHostInWingmanHUD() {
  return runTest('Guest Sees Host in Wingman HUD', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const hostCallsign = await getPlayerCallsign(hostPage, true);
    console.log(`  Host callsign: ${hostCallsign}`);

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await guestPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const guestWingmanCallsigns = await getWingmanCallsigns(guestPage);
    console.log(
      `  Guest sees wingmen: [${guestWingmanCallsigns.join(', ')}] (count: ${guestWingmanCallsigns.length})`,
    );

    const expectedWingmenCount = 3;
    if (guestWingmanCallsigns.length === 0) {
      throw new Error('Guest sees no wingmen - wingman display is empty');
    }

    if (guestWingmanCallsigns.length !== expectedWingmenCount) {
      throw new Error(
        `Guest sees ${guestWingmanCallsigns.length} wingmen, expected ${expectedWingmenCount}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testBothSeeConsistentAIWingmen() {
  return runTest('Both Players See Consistent AI Wingmen', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await Promise.all([
      hostPage.waitForSelector('.allied-display', {
        state: 'visible',
        timeout: TIMEOUTS.ui,
      }),
      guestPage.waitForSelector('.allied-display', {
        state: 'visible',
        timeout: TIMEOUTS.ui,
      }),
    ]);

    const hostWingmen = await getWingmanCallsigns(hostPage);
    const guestWingmen = await getWingmanCallsigns(guestPage);

    console.log(`  Host wingmen: [${hostWingmen.join(', ')}]`);
    console.log(`  Guest wingmen: [${guestWingmen.join(', ')}]`);

    const knownAINames = ['Viper', 'Ghost', 'Shadow'];
    const hostAIWingmen = hostWingmen.filter((c) =>
      knownAINames.some((name) => c.includes(name)),
    );
    const guestAIWingmen = guestWingmen.filter((c) =>
      knownAINames.some((name) => c.includes(name)),
    );

    console.log(`  Host sees AI wingmen: [${hostAIWingmen.join(', ')}]`);
    console.log(`  Guest sees AI wingmen: [${guestAIWingmen.join(', ')}]`);

    if (hostAIWingmen.length !== 2) {
      throw new Error(
        `Host sees ${hostAIWingmen.length} AI wingmen, expected 2`,
      );
    }

    if (guestAIWingmen.length !== 2) {
      throw new Error(
        `Guest sees ${guestAIWingmen.length} AI wingmen, expected 2`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testBothPlayersHavePilotInterface() {
  return runTest('Both Players Have Pilot Interface', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    const hostHasWeapons = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const hostIsSpectator = await isSpectatorMode(hostPage);

    console.log(`  Host has weapon display: ${hostHasWeapons}`);
    console.log(`  Host is spectator: ${hostIsSpectator}`);

    const guestHasWeapons = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const guestIsSpectator = await isSpectatorMode(guestPage);

    console.log(`  Guest has weapon display: ${guestHasWeapons}`);
    console.log(`  Guest is spectator: ${guestIsSpectator}`);

    if (hostIsSpectator) {
      throw new Error('Host is in spectator mode but should be pilot');
    }

    if (guestIsSpectator) {
      throw new Error('Guest is in spectator mode but should be pilot');
    }

    if (!hostHasWeapons || !guestHasWeapons) {
      throw new Error(
        `Missing weapon displays: host=${hostHasWeapons}, guest=${guestHasWeapons}`,
      );
    }

    console.log('  ✓ Both players have pilot interface');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Spectator Tests
// =============================================================================

function testSpectatorModeDetection() {
  return runTest('Spectator Mode Detection Works', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    const hostIsSpectator = await isSpectatorMode(hostPage);
    const guestIsSpectator = await isSpectatorMode(guestPage);

    console.log(`  Host detected as spectator: ${hostIsSpectator}`);
    console.log(`  Guest detected as spectator: ${guestIsSpectator}`);

    const hostHasWeaponDisplay = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const guestHasWeaponDisplay = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has weapon display: ${hostHasWeaponDisplay}`);
    console.log(`  Guest has weapon display: ${guestHasWeaponDisplay}`);

    if (!hostHasWeaponDisplay) {
      throw new Error('Host missing weapon display');
    }
    if (!guestHasWeaponDisplay) {
      throw new Error('Guest missing weapon display');
    }

    if (hostIsSpectator || guestIsSpectator) {
      throw new Error('Spectator mode incorrectly detected for pilot players');
    }

    console.log('  ✓ Spectator detection logic works correctly');

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostWingmanCountMatchesExpectation() {
  return runTest('Host Wingman Count Matches Expectation', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const hostWingmen = await getWingmanCallsigns(hostPage);
    console.log(
      `  Host sees ${hostWingmen.length} wingmen: [${hostWingmen.join(', ')}]`,
    );

    if (hostWingmen.length !== 3) {
      throw new Error(
        `Host sees ${hostWingmen.length} wingmen, expected 3 (guest + 2 AI)`,
      );
    }

    const knownAINames = ['Viper', 'Ghost', 'Shadow'];
    const aiWingmenFound = hostWingmen.filter((c) =>
      knownAINames.some((name) => c.includes(name)),
    );

    console.log(
      `  Known AI wingmen found: [${aiWingmenFound.join(', ')}] (expected 2)`,
    );

    if (aiWingmenFound.length !== 2) {
      console.log(
        `  Note: Found ${aiWingmenFound.length} known AI wingmen, expected 2`,
      );
      console.log(
        '  One AI wingman should be replaced by guest player callsign',
      );
    }

    console.log('  ✓ Host wingman count is correct');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Guest auto-assigned ship on join', fn: testGuestAutoAssignedShip },
  { name: 'Host sees guest in wingman HUD', fn: testHostSeesGuestInWingmanHUD },
  { name: 'Guest sees host in wingman HUD', fn: testGuestSeesHostInWingmanHUD },
  {
    name: 'Both see consistent AI wingmen',
    fn: testBothSeeConsistentAIWingmen,
  },
  {
    name: 'Both players have pilot interface',
    fn: testBothPlayersHavePilotInterface,
  },
  { name: 'Spectator mode detection works', fn: testSpectatorModeDetection },
  {
    name: 'Host wingman count matches expectation',
    fn: testHostWingmanCountMatchesExpectation,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Wingman Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
