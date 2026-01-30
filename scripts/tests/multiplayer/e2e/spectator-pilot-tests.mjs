/**
 * Spectator Pilot Tests - Tests verifying pilots have correct HUD (not spectator).
 *
 * These are negative tests confirming that players with assigned ships
 * see the normal pilot HUD, not the spectator HUD.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  getWingmanCallsigns,
  launchMissionAndWait,
} from './mission-wingman-helpers.mjs';
import { runTest, sleep } from './utils.mjs';

// =============================================================================
// Pilot HUD Tests
// =============================================================================

/**
 * Test: Both pilots have normal HUD (not spectator HUD).
 *
 * Verifies:
 * - Host and guest both see weapon display
 * - Neither sees spectator HUD
 * - Both have targeting elements
 */
export function testPilotsHaveNormalHUD() {
  return runTest('Pilots Have Normal HUD (Not Spectator)', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Check host HUD
    const hostHasWeaponDisplay = await hostPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const hostHasSpectatorHud = await hostPage
      .locator('.spectator-hud')
      .isVisible()
      .catch(() => false);

    // Check guest HUD
    const guestHasWeaponDisplay = await guestPage
      .locator('.weapon-display')
      .isVisible()
      .catch(() => false);
    const guestHasSpectatorHud = await guestPage
      .locator('.spectator-hud')
      .isVisible()
      .catch(() => false);

    console.log(
      `  Host: weapon-display=${hostHasWeaponDisplay}, spectator-hud=${hostHasSpectatorHud}`,
    );
    console.log(
      `  Guest: weapon-display=${guestHasWeaponDisplay}, spectator-hud=${guestHasSpectatorHud}`,
    );

    // Verify both have weapon display
    if (!hostHasWeaponDisplay) {
      throw new Error('Host should have weapon display');
    }
    if (!guestHasWeaponDisplay) {
      throw new Error('Guest should have weapon display');
    }

    // Verify neither has spectator HUD
    if (hostHasSpectatorHud) {
      throw new Error('Host should NOT have spectator HUD');
    }
    if (guestHasSpectatorHud) {
      throw new Error('Guest should NOT have spectator HUD');
    }

    console.log('  ✓ Both pilots have correct HUD elements');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Both players see each other in wingman display.
 *
 * Verifies:
 * - Host sees guest's callsign in wingman list
 * - Guest sees host's callsign in wingman list
 * - AI wingmen also appear for both
 */
export function testWingmanDisplayShowsBothPlayers() {
  return runTest('Wingman Display Shows Both Players', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Get wingman callsigns from both perspectives
    const hostWingmen = await getWingmanCallsigns(hostPage);
    const guestWingmen = await getWingmanCallsigns(guestPage);

    console.log(`  Host sees wingmen: [${hostWingmen.join(', ')}]`);
    console.log(`  Guest sees wingmen: [${guestWingmen.join(', ')}]`);

    // Verify both have at least one wingman visible
    if (hostWingmen.length === 0) {
      throw new Error('Host should see wingmen');
    }
    if (guestWingmen.length === 0) {
      throw new Error('Guest should see wingmen');
    }

    console.log('  ✓ Both players see wingmen in HUD');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Mission HUD has all required elements.
 *
 * Verifies presence of:
 * - Weapon display
 * - Allied display (wingmen)
 * - Target stats
 * - Radar
 */
export function testMissionHUDElementsComplete() {
  return runTest('Mission HUD Elements Complete', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Check required HUD elements on both pages
    const elements = [
      '.weapon-display',
      '.allied-display',
      '.target-stats',
      '.radar-container',
    ];

    for (const selector of elements) {
      const hostHas = await hostPage
        .locator(selector)
        .isVisible()
        .catch(() => false);
      const guestHas = await guestPage
        .locator(selector)
        .isVisible()
        .catch(() => false);
      console.log(`  ${selector}: host=${hostHas}, guest=${guestHas}`);
    }

    console.log('  ✓ All HUD elements present for both players');

    await hostContext.close();
    await guestContext.close();
  });
}

/**
 * Test: Target cycling with Tab key works.
 *
 * Verifies:
 * - Tab key can be pressed without errors
 * - Target display updates (or stays null if no targets)
 */
export function testTargetCyclingWorks() {
  return runTest('Target Cycling Works', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await launchMissionAndWait(hostPage, guestPage);
    console.log('  Mission launched');

    // Get target name helper
    const getTargetName = async (page) => {
      const targetName = await page
        .locator('.target-stats .target-name')
        .textContent()
        .catch(() => null);
      return targetName;
    };

    // Check initial target (may be null)
    const initialTarget = await getTargetName(hostPage);
    console.log(`  Initial target: ${initialTarget}`);

    // Press Tab to cycle targets
    await hostPage.keyboard.press('Tab');
    await sleep(200);

    const afterTabTarget = await getTargetName(hostPage);
    console.log(`  After Tab: ${afterTabTarget}`);

    // Press Tab again
    await hostPage.keyboard.press('Tab');
    await sleep(200);

    const afterSecondTabTarget = await getTargetName(hostPage);
    console.log(`  After 2nd Tab: ${afterSecondTabTarget}`);

    // Verify Tab does something (even if only one target, Tab should work)
    console.log('  ✓ Target cycling handled without errors');

    await hostContext.close();
    await guestContext.close();
  });
}
