/**
 * E2E Tests - Mission Spectator Death Transition
 *
 * Tests for the death → spectator mode transition in multiplayer.
 * When a guest's ship is destroyed, they should enter spectator mode
 * and be able to watch the rest of the mission.
 *
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  TIMEOUTS,
} from '../core/index.mjs';
import {
  forceLocalPlayerDeath,
  isInSpectatorModeInternal,
  isSpectatorMode,
  launchMissionAndWait,
  setupHostAndGuest,
} from '../helpers/index.mjs';

// =============================================================================
// Spectator Death Transition Tests
// =============================================================================

function testGuestDeathEntersSpectatorMode() {
  return runTest(
    'Guest Ship Death Triggers Spectator Mode',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Verify guest starts as pilot (not spectator)
      const guestStartsAsPilot = !(await isSpectatorMode(guestPage));
      console.log(`  Guest starts as pilot: ${guestStartsAsPilot}`);
      if (!guestStartsAsPilot) {
        throw new Error('Guest should start as pilot, not spectator');
      }

      // Verify weapon display is visible before death
      const hasWeaponsBefore = await guestPage
        .locator('.weapon-display')
        .isVisible()
        .catch(() => false);
      console.log(
        `  Guest has weapon display before death: ${hasWeaponsBefore}`,
      );

      // Force guest's ship to die
      const deathForced = await forceLocalPlayerDeath(guestPage);
      console.log(`  Death forced on guest: ${deathForced}`);
      if (!deathForced) {
        throw new Error('Failed to force guest death via test utility');
      }

      // Wait for spectator mode to activate (checked each frame)
      await guestPage.waitForFunction(
        () => window.__TEST__?.isInSpectatorMode?.() === true,
        null,
        { timeout: TIMEOUTS.ui },
      );
      console.log('  Guest entered spectator mode');

      // Verify internal spectator state
      const isSpectatorInternal = await isInSpectatorModeInternal(guestPage);
      console.log(`  Guest spectator state (internal): ${isSpectatorInternal}`);

      // Verify weapon display is gone
      const hasWeaponsAfter = await guestPage
        .locator('.weapon-display')
        .isVisible()
        .catch(() => false);
      console.log(`  Guest has weapon display after death: ${hasWeaponsAfter}`);

      if (hasWeaponsAfter) {
        throw new Error(
          'Guest should not have weapon display after entering spectator mode',
        );
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testHostContinuesAfterGuestDeath() {
  return runTest(
    'Host Continues Playing After Guest Death',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await launchMissionAndWait(hostPage, guestPage);
      console.log('  Mission launched');

      // Verify host has weapon display before
      const hostHasWeaponsBefore = await hostPage
        .locator('.weapon-display')
        .isVisible()
        .catch(() => false);
      console.log(`  Host has weapon display: ${hostHasWeaponsBefore}`);

      // Force guest's ship to die
      const deathForced = await forceLocalPlayerDeath(guestPage);
      console.log(`  Death forced on guest: ${deathForced}`);

      // Wait for guest to enter spectator mode
      await guestPage.waitForFunction(
        () => window.__TEST__?.isInSpectatorMode?.() === true,
        null,
        { timeout: TIMEOUTS.ui },
      );
      console.log('  Guest entered spectator mode');

      // Verify host still has pilot controls
      const hostHasWeaponsAfter = await hostPage
        .locator('.weapon-display')
        .isVisible()
        .catch(() => false);
      console.log(`  Host still has weapon display: ${hostHasWeaponsAfter}`);

      // Verify host is NOT in spectator mode
      const hostIsSpectator = await isInSpectatorModeInternal(hostPage);
      console.log(`  Host spectator state: ${hostIsSpectator}`);

      if (!hostHasWeaponsAfter) {
        throw new Error(
          'Host should still have weapon display after guest death',
        );
      }

      if (hostIsSpectator) {
        throw new Error('Host should not be in spectator mode');
      }

      // Verify host HUD is still functional
      const hostHudVisible = await hostPage
        .locator('#hud')
        .isVisible()
        .catch(() => false);
      console.log(`  Host HUD visible: ${hostHudVisible}`);

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testSpectatorCanWatchBattle() {
  return runTest('Spectator Can Watch Ongoing Battle', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Verify canvas exists before death
    const canvasBeforeDeath = await guestPage.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas
        ? { exists: true, width: canvas.width, height: canvas.height }
        : { exists: false };
    });
    console.log(`  Canvas before death: ${JSON.stringify(canvasBeforeDeath)}`);

    // Force guest death
    await forceLocalPlayerDeath(guestPage);
    await guestPage.waitForFunction(
      () => window.__TEST__?.isInSpectatorMode?.() === true,
      null,
      { timeout: TIMEOUTS.ui },
    );
    console.log('  Guest in spectator mode');

    // Small delay to let spectator rendering initialize
    await new Promise((r) => setTimeout(r, 200));

    // Check canvas state after death using evaluate (more reliable than locator)
    const canvasAfterDeath = await guestPage.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { exists: false, inDOM: false };
      const rect = canvas.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      return {
        exists: true,
        inDOM: document.body.contains(canvas),
        width: rect.width,
        height: rect.height,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
      };
    });
    console.log(`  Canvas after death: ${JSON.stringify(canvasAfterDeath)}`);

    // Check if spectator HUD was created
    const spectatorHudInfo = await guestPage.evaluate(() => {
      const specHud = document.querySelector('.spectator-hud');
      const normalHud = document.querySelector('#hud');
      return {
        spectatorHudExists: !!specHud,
        normalHudVisible: normalHud
          ? normalHud.style.display !== 'none'
          : false,
      };
    });
    console.log(`  Spectator HUD info: ${JSON.stringify(spectatorHudInfo)}`);

    // The key check: spectator mode is active and rendering continues
    if (!canvasAfterDeath.exists || !canvasAfterDeath.inDOM) {
      throw new Error(
        'Canvas should still exist in DOM after entering spectator mode',
      );
    }

    // Verify game hasn't crashed by checking that some time can pass
    await new Promise((r) => setTimeout(r, 500));
    const stillSpectating = await isInSpectatorModeInternal(guestPage);
    console.log(`  Still spectating after 500ms: ${stillSpectating}`);

    if (!stillSpectating) {
      throw new Error('Spectator mode should remain active');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Test Suite Export
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Guest death enters spectator mode',
    fn: testGuestDeathEntersSpectatorMode,
  },
  {
    name: 'Host continues after guest death',
    fn: testHostContinuesAfterGuestDeath,
  },
  { name: 'Spectator can watch battle', fn: testSpectatorCanWatchBattle },
];

// Run directly if this is the main module
if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Spectator Death', ALL_TESTS);
}
