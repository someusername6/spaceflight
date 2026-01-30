/**
 * Spectator Test Helpers - Shared functions for spectator E2E tests.
 */

import { navigateTo } from './helpers.mjs';
import { TIMEOUTS } from './test-config.mjs';
import { sleep } from './utils.mjs';

// =============================================================================
// Spectator Detection Helpers
// =============================================================================

/**
 * Wait for mission screen to load - handles both pilot and spectator HUDs.
 * Pilots have #hud visible, spectators have .spectator-hud visible (but #hud is hidden).
 */
export async function waitForMissionOrSpectatorScreen(
  page,
  timeout = TIMEOUTS.missionStart,
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const ready = await page.evaluate(() => {
      // Check for visible normal HUD (pilots)
      const hud = document.getElementById('hud');
      if (hud && hud.offsetWidth > 0) return true;

      // Check for spectator HUD (spectators)
      const spectatorHud = document.querySelector('.spectator-hud');
      if (spectatorHud && spectatorHud.offsetWidth > 0) return true;

      return false;
    });

    if (ready) return;
    await sleep(100);
  }

  throw new Error('Mission screen did not load in time');
}

// =============================================================================
// Squadron Manipulation Helpers
// =============================================================================

/**
 * Unassign the guest's ship by unassigning the first wingman (Viper).
 * Guest is automatically assigned to the first available wingman ship when joining.
 * Squadron screen shows AI pilot names, not player callsigns.
 * Returns to lobby after unassigning.
 *
 * @param {import('playwright').Page} hostPage
 */
export async function unassignGuestShip(hostPage) {
  // Navigate to squadron
  await navigateTo(hostPage, 'squadron');
  await sleep(300);

  // Find the ship with Viper as pilot (first non-commander wingman = guest's ship)
  // The guest is assigned to this ship, but squadron shows AI pilot name "Viper"
  const shipItems = hostPage.locator('.ship-item.deployed');
  const count = await shipItems.count();

  let viperShipFound = false;
  for (let i = 0; i < count; i++) {
    const ship = shipItems.nth(i);

    // Check the pilot name in the ship list item
    const pilotNameEl = ship.locator('.ship-item-pilot');
    const pilotName = await pilotNameEl.textContent().catch(() => '');

    // Look for Viper - the first wingman (not Commander)
    if (pilotName?.toLowerCase().includes('viper')) {
      viperShipFound = true;

      // Click on this ship to select it
      await ship.click();
      await sleep(300);

      // Click on Pilot tab to access the Unassign button
      const pilotTab = hostPage.locator('.viewer-tab[data-tab="pilot"]');
      const hasPilotTab = await pilotTab.isVisible().catch(() => false);

      if (hasPilotTab) {
        await pilotTab.click();
        await sleep(300);
      }

      // Click unassign button
      const unassignBtn = hostPage.locator('.btn-unassign-pilot');
      const hasUnassign = await unassignBtn.isVisible().catch(() => false);

      if (hasUnassign) {
        await unassignBtn.click();
        await sleep(500);
        console.log('  Unassigned Viper ship (guest becomes spectator)');
      } else {
        throw new Error('Unassign button not found');
      }
      break;
    }
  }

  if (!viperShipFound) {
    // Debug: print all pilot names found
    const allPilotNames = [];
    for (let i = 0; i < count; i++) {
      const ship = shipItems.nth(i);
      const name = await ship
        .locator('.ship-item-pilot')
        .textContent()
        .catch(() => '(none)');
      allPilotNames.push(name);
    }
    throw new Error(
      `Could not find Viper's ship to unassign. Found pilots: [${allPilotNames.join(', ')}]`,
    );
  }

  // Return to lobby
  await navigateTo(hostPage, 'lobby');
  await sleep(300);
}
