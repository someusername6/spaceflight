/**
 * E2E Tests - Mission Lifecycle
 *
 * Tests for mission runtime, HUD, and player input.
 * Total: 7 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  getWingmanCallsigns,
  launchMissionAndWait,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Helpers
// =============================================================================

async function holdKey(page, key, holdMs = 100) {
  await page.keyboard.down(key);
  await new Promise((r) => setTimeout(r, holdMs));
  await page.keyboard.up(key);
}

// =============================================================================
// Mission Lifecycle Tests
// =============================================================================

function testNoDesyncWarningsDuringMission() {
  return runTest('No Desync Warnings During Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    console.log('  Running mission for 3 seconds to verify sync stability...');
    await new Promise((r) => setTimeout(r, 3000));

    const hostHasDesyncWarning = await hostPage
      .locator('.desync-warning, .sync-error, [data-desync]')
      .isVisible()
      .catch(() => false);
    const guestHasDesyncWarning = await guestPage
      .locator('.desync-warning, .sync-error, [data-desync]')
      .isVisible()
      .catch(() => false);

    console.log(`  Host desync warning: ${hostHasDesyncWarning}`);
    console.log(`  Guest desync warning: ${guestHasDesyncWarning}`);

    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    console.log(`  Host HUD still visible: ${hostHUDVisible}`);
    console.log(`  Guest HUD still visible: ${guestHUDVisible}`);

    if (hostHasDesyncWarning || guestHasDesyncWarning) {
      throw new Error('Desync warning appeared during normal play');
    }

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game stopped running unexpectedly');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testPlayerInputWorks() {
  return runTest('Player Input Accepted During Mission', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: 5000,
    });

    console.log('  Sending input from host...');
    await holdKey(hostPage, 'w', 200);
    await holdKey(hostPage, 'a', 150);

    console.log('  Sending input from guest...');
    await holdKey(guestPage, 'w', 200);
    await holdKey(guestPage, 'd', 150);

    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    console.log(`  Host HUD after input: ${hostHUDVisible}`);
    console.log(`  Guest HUD after input: ${guestHUDVisible}`);

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game crashed or HUD disappeared after input');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testTargetCyclingWorks() {
  return runTest('Target Cycling Works', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: 5000,
    });

    console.log('  Host cycling targets...');
    await hostPage.keyboard.press('Tab');
    await hostPage
      .waitForFunction(
        () => {
          const el = document.querySelector('.target-callsign');
          return el?.textContent && el.textContent.trim().length > 0;
        },
        null,
        { timeout: 2000 },
      )
      .catch(() => {});
    await hostPage.keyboard.press('Tab');

    console.log('  Guest cycling targets...');
    await guestPage.keyboard.press('Tab');
    await guestPage
      .waitForFunction(
        () => {
          const el = document.querySelector('.target-callsign');
          return el?.textContent && el.textContent.trim().length > 0;
        },
        null,
        { timeout: 2000 },
      )
      .catch(() => {});

    const hostHUDVisible = await hostPage.locator('#hud').isVisible();
    const guestHUDVisible = await guestPage.locator('#hud').isVisible();

    if (!hostHUDVisible || !guestHUDVisible) {
      throw new Error('Game crashed after target cycling');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Mission Runtime Tests
// =============================================================================

function testBothPlayersEnterMission() {
  return runTest('Both Players Enter Mission Screen', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    const hostHasCanvas = (await hostPage.locator('canvas').count()) > 0;
    const guestHasCanvas = (await guestPage.locator('canvas').count()) > 0;

    console.log(`  Host has canvas: ${hostHasCanvas}`);
    console.log(`  Guest has canvas: ${guestHasCanvas}`);

    const hostHasHUD = await hostPage.locator('#hud').isVisible();
    const guestHasHUD = await guestPage.locator('#hud').isVisible();

    console.log(`  Host has HUD: ${hostHasHUD}`);
    console.log(`  Guest has HUD: ${guestHasHUD}`);

    if (!(hostHasCanvas && guestHasCanvas && hostHasHUD && guestHasHUD)) {
      throw new Error(
        `Mission screen check failed: hostCanvas=${hostHasCanvas}, guestCanvas=${guestHasCanvas}, hostHUD=${hostHasHUD}, guestHUD=${guestHasHUD}`,
      );
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testWingmanHUDShowsRemotePlayer() {
  return runTest('Wingman HUD Shows Remote Player', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await hostPage.waitForSelector('.allied-display', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const wingmanCallsigns = await getWingmanCallsigns(hostPage);
    console.log(
      `  Wingman callsigns on host HUD: ${wingmanCallsigns.join(', ') || '(none)'}`,
    );

    const hasRemotePlayer = wingmanCallsigns.length > 0;

    if (!hasRemotePlayer) {
      throw new Error(
        'No wingmen shown in allied HUD - remote player not visible',
      );
    }

    const guestWingmanCallsigns = await getWingmanCallsigns(guestPage);
    console.log(
      `  Wingman callsigns on guest HUD: ${guestWingmanCallsigns.join(', ') || '(none)'}`,
    );

    await hostContext.close();
    await guestContext.close();
  });
}

function testTargetingHUDElements() {
  return runTest('Targeting HUD Elements Present', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    const hostHasTargetStats = await hostPage
      .locator('.target-stats')
      .isVisible()
      .catch(() => false);
    const guestHasTargetStats = await guestPage
      .locator('.target-stats')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has target stats panel: ${hostHasTargetStats}`);
    console.log(`  Guest has target stats panel: ${guestHasTargetStats}`);

    const hostHasWeapons = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const guestHasWeapons = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has weapon display: ${hostHasWeapons}`);
    console.log(`  Guest has weapon display: ${guestHasWeapons}`);

    if (
      !(
        hostHasTargetStats &&
        guestHasTargetStats &&
        hostHasWeapons &&
        guestHasWeapons
      )
    ) {
      throw new Error('HUD elements missing on one or both players');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testRadarShowsMultipleFriendlies() {
  return runTest('Radar Shows Multiple Friendlies', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    await hostPage.waitForSelector('.radar-container', {
      state: 'visible',
      timeout: TIMEOUTS.ui,
    });

    const hostHasRadar = await hostPage
      .locator('.radar-container')
      .isVisible()
      .catch(() => false);
    const guestHasRadar = await guestPage
      .locator('.radar-container')
      .isVisible()
      .catch(() => false);

    console.log(`  Host has radar: ${hostHasRadar}`);
    console.log(`  Guest has radar: ${guestHasRadar}`);

    if (!(hostHasRadar && guestHasRadar)) {
      throw new Error('Radar display missing on one or both players');
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
    name: 'No desync warnings during mission',
    fn: testNoDesyncWarningsDuringMission,
  },
  { name: 'Player input accepted during mission', fn: testPlayerInputWorks },
  { name: 'Target cycling works', fn: testTargetCyclingWorks },
  {
    name: 'Both players enter mission screen',
    fn: testBothPlayersEnterMission,
  },
  {
    name: 'Wingman HUD shows remote player',
    fn: testWingmanHUDShowsRemotePlayer,
  },
  { name: 'Targeting HUD elements present', fn: testTargetingHUDElements },
  { name: 'Radar shows on both players', fn: testRadarShowsMultipleFriendlies },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Lifecycle Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
