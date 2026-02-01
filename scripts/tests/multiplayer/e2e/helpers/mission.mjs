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

// =============================================================================
// Pause Helpers
// =============================================================================

/**
 * Trigger pause by pressing Escape on given page.
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function triggerPause(page, timeout = 3000) {
  await page.keyboard.press('Escape');

  // Use waitForFunction with DOM check since waitForSelector can be flaky
  // with dynamically created fixed-position overlays
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const found = await page.evaluate(() => {
      const overlay = document.querySelector('.multiplayer-pause-overlay');
      if (!overlay) return false;
      const rect = overlay.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (found) return;
    await new Promise((r) => setTimeout(r, 100));
  }

  // Final debug info before throwing
  const debugInfo = await page.evaluate(() => {
    const overlay = document.querySelector('.multiplayer-pause-overlay');
    const modal = document.querySelector('.multiplayer-pause-modal');
    const modalContainer = document.querySelector('.modal-container');
    return {
      hasOverlay: !!overlay,
      hasModal: !!modal,
      hasContainer: !!modalContainer,
      overlayRect: overlay ? overlay.getBoundingClientRect() : null,
      containerChildren: modalContainer ? modalContainer.children.length : 0,
      bodyModals: document.querySelectorAll('.modal-container').length,
    };
  });
  throw new Error(`Pause modal did not appear: ${JSON.stringify(debugInfo)}`);
}

/**
 * Wait for pause modal to appear on a page.
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function waitForPauseModal(page, timeout = 5000) {
  // Use evaluate-based check for more reliable detection
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const found = await page.evaluate(() => {
      const overlay = document.querySelector('.multiplayer-pause-overlay');
      if (!overlay) return false;
      const rect = overlay.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (found) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Pause modal did not appear in time');
}

/**
 * Click ready-to-resume button.
 * @param {import('playwright').Page} page
 */
export async function clickReadyToResume(page) {
  await page.click('#btn-pause-ready');
}

/**
 * Wait for countdown to complete and game to resume.
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function waitForResume(page, timeout = 10000) {
  await page.waitForSelector(
    '.multiplayer-pause-modal, .multiplayer-pause-overlay',
    {
      state: 'hidden',
      timeout,
    },
  );
}

/**
 * Check if the ready button shows ready state.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function isReadyToResume(page) {
  const btn = page.locator('#btn-pause-ready');
  const hasClass = await btn.evaluate((el) =>
    el.classList.contains('ready-active'),
  );
  return hasClass;
}

/**
 * Get the pause reason text from the modal.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
export async function getPauseReason(page) {
  const reason = await page.locator('.pause-reason').textContent();
  return reason?.trim() ?? '';
}

/**
 * Check if countdown is visible.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function isCountdownVisible(page) {
  return page
    .locator('.pause-countdown')
    .isVisible()
    .catch(() => false);
}

/**
 * Get current countdown number.
 * @param {import('playwright').Page} page
 * @returns {Promise<number|null>}
 */
export async function getCountdownNumber(page) {
  const text = await page.locator('.pause-countdown-number').textContent();
  if (!text) return null;
  const num = parseInt(text, 10);
  return Number.isNaN(num) ? null : num;
}

// =============================================================================
// Input Helpers
// =============================================================================

/**
 * Hold a key for a specified duration.
 * @param {import('playwright').Page} page
 * @param {string} key
 * @param {number} holdMs
 */
export async function holdKey(page, key, holdMs = 100) {
  await page.keyboard.down(key);
  await new Promise((r) => setTimeout(r, holdMs));
  await page.keyboard.up(key);
}

/**
 * Get ship speed from the HUD speedometer.
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
export async function getShipSpeed(page) {
  const speed = await page.evaluate(() => {
    const speedEl = document.querySelector('.speed-value, .speedometer-value');
    if (!speedEl) return 0;
    const text = speedEl.textContent?.replace(/[^\d.-]/g, '') ?? '0';
    return parseFloat(text) || 0;
  });
  return speed;
}

// =============================================================================
// Test Utilities (for accessing game internals)
// =============================================================================

/**
 * Simulate a lag report triggering auto-pause.
 * Uses the test utilities exposed on window.__TEST__.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>} true if pause was triggered
 */
export async function simulateLagReport(page) {
  return page.evaluate(() => {
    if (typeof window.__TEST__?.simulateLagReport === 'function') {
      return window.__TEST__.simulateLagReport();
    }
    return false;
  });
}

/**
 * Check if test utilities are available.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasTestUtilities(page) {
  return page.evaluate(() => typeof window.__TEST__ !== 'undefined');
}

/**
 * Get current pause state from test utilities.
 * @param {import('playwright').Page} page
 * @returns {Promise<{isPaused: boolean, reason: string|null, playerCount: number}|null>}
 */
export async function getTestPauseState(page) {
  return page.evaluate(() => {
    if (typeof window.__TEST__?.getPauseState === 'function') {
      return window.__TEST__.getPauseState();
    }
    return null;
  });
}

/**
 * Force the local player's ship to die.
 * Sets hull to 0, triggering spectator mode on the next frame.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>} true if death was forced
 */
export async function forceLocalPlayerDeath(page) {
  return page.evaluate(() => {
    if (typeof window.__TEST__?.forceLocalPlayerDeath === 'function') {
      return window.__TEST__.forceLocalPlayerDeath();
    }
    return false;
  });
}

/**
 * Check if the page is currently in spectator mode (via test utilities).
 * This uses the game's internal spectator state, not UI detection.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function isInSpectatorModeInternal(page) {
  return page.evaluate(() => {
    if (typeof window.__TEST__?.isInSpectatorMode === 'function') {
      return window.__TEST__.isInSpectatorMode();
    }
    return false;
  });
}
