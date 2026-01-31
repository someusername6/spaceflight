/**
 * E2E Tests - Mission Helpers
 *
 * Helper functions for mission tests including wingman display, spectator mode.
 */

import { TIMEOUTS } from '../core/config.mjs';

import { acceptFirstContract, readyBothPlayers } from './navigation.mjs';

/**
 * Wait for mission to be fully running (HUD visible + key elements present).
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function waitForMissionScreen(
  page,
  timeout = TIMEOUTS.missionStart,
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const ready = await page.evaluate(() => {
      const hud = document.getElementById('hud');
      return hud && hud.offsetWidth > 0;
    });

    if (ready) {
      return;
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error('Mission screen did not load in time');
}

/**
 * Get wingman callsigns from the allied HUD display.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
export async function getWingmanCallsigns(page) {
  const callsigns = await page
    .locator('.allied-display .ally-callsign')
    .allTextContents();
  return callsigns.map((c) => c.trim()).filter((c) => c && c !== '---');
}

/**
 * Get the callsign displayed in a player row.
 * @param {import('playwright').Page} page
 * @param {boolean} isSelf - Whether to get self or other player's callsign
 * @returns {Promise<string|null>}
 */
export async function getPlayerCallsign(page, isSelf) {
  const selector = isSelf
    ? '.player-row.self .player-callsign'
    : '.player-row:not(.self) .player-callsign';
  const callsign = await page.locator(selector).first().textContent();
  return callsign?.trim() || null;
}

/**
 * Check if a player has a ship assigned in the lobby.
 * Players with ships show ship info, spectators show "Spectating".
 * @param {import('playwright').Page} page
 * @param {boolean} isSelf
 * @returns {Promise<boolean>}
 */
export async function playerHasShipAssigned(page, isSelf) {
  const selector = isSelf ? '.player-row.self' : '.player-row:not(.self)';
  const row = page.locator(selector).first();

  // Check for ship-related info or lack of "Spectating" text
  const rowText = await row.textContent();
  return !rowText?.includes('Spectating');
}

/**
 * Launch mission and wait for both players to enter.
 * @param {import('playwright').Page} hostPage
 * @param {import('playwright').Page} guestPage
 */
export async function launchMissionAndWait(hostPage, guestPage) {
  // Ready both players
  await readyBothPlayers(hostPage, guestPage);

  // Verify host can see guest (connection working)
  await hostPage.waitForFunction(
    () => document.querySelectorAll('.player-row').length >= 2,
    null,
    { timeout: TIMEOUTS.sync },
  );

  // Host accepts first contract
  await acceptFirstContract(hostPage);

  // Wait for countdown OR mission start
  await Promise.race([
    guestPage.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.chat-message.system');
        return Array.from(messages).some(
          (m) =>
            m.textContent?.includes('Launching in') ||
            m.textContent?.includes('Mission starting'),
        );
      },
      null,
      { timeout: TIMEOUTS.missionStart },
    ),
    guestPage.waitForSelector('#hud', {
      state: 'visible',
      timeout: TIMEOUTS.missionStart,
    }),
  ]);

  // Wait for mission screen on both
  await Promise.all([
    waitForMissionScreen(hostPage),
    waitForMissionScreen(guestPage),
  ]);
}

/**
 * Check if a page is showing spectator mode.
 * Spectators have no weapon display and different camera controls.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function isSpectatorMode(page) {
  // Spectators don't have weapon display
  const hasWeaponDisplay = await page
    .locator('.weapon-display')
    .isVisible()
    .catch(() => false);

  // Spectators have spectator controls info
  const hasSpectatorInfo = await page
    .locator('.spectator-info, .viewer-controls')
    .isVisible()
    .catch(() => false);

  return !hasWeaponDisplay || hasSpectatorInfo;
}
