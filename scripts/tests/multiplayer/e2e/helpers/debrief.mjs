/**
 * Debrief Test Helpers
 *
 * Shared helper functions for debrief/results screen E2E tests.
 */

import { TIMEOUTS } from '../core/index.mjs';

// =============================================================================
// Results Screen Helpers
// =============================================================================

/**
 * Wait for results screen to appear.
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function waitForResultsScreen(
  page,
  timeout = TIMEOUTS.missionStart,
) {
  await page.waitForSelector('.results-screen', {
    state: 'visible',
    timeout,
  });
}

/**
 * Check if results screen is showing multiplayer footer.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasMultiplayerFooter(page) {
  return page
    .locator('.results-footer-multiplayer')
    .isVisible()
    .catch(() => false);
}

/**
 * Check if results screen has chat footer.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasChatFooter(page) {
  return page
    .locator('.chat-footer')
    .isVisible()
    .catch(() => false);
}

/**
 * Check if "Waiting for host" message is visible.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasWaitingMessage(page) {
  return page
    .locator('.results-waiting')
    .isVisible()
    .catch(() => false);
}

/**
 * Check if Continue button is visible.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasContinueButton(page) {
  return page
    .locator('#btn-continue')
    .isVisible()
    .catch(() => false);
}

/**
 * Send a chat message in the debrief footer.
 * @param {import('playwright').Page} page
 * @param {string} message
 */
export async function sendDebriefChat(page, message) {
  const input = page.locator('#chat-footer-input');
  await input.fill(message);
  await page.click('#btn-chat-send');
}

/**
 * Get chat messages from debrief footer.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
export async function getDebriefChatMessages(page) {
  const messages = await page
    .locator('.chat-footer-messages .chat-message')
    .allTextContents();
  return messages.map((m) => m.trim());
}

/**
 * Click the Continue button.
 * @param {import('playwright').Page} page
 */
export async function clickContinue(page) {
  await page.click('#btn-continue');
}

/**
 * Wait for lobby screen to appear.
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function waitForLobbyScreen(page, timeout = TIMEOUTS.navigation) {
  await page.waitForSelector('.lobby-screen, .player-list', {
    state: 'visible',
    timeout,
  });
}

// =============================================================================
// Mission Control Helpers
// =============================================================================

/**
 * Force mission victory.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function forceVictory(page) {
  const success = await page.evaluate(() => {
    if (typeof window.__TEST__?.forceVictory === 'function') {
      return window.__TEST__.forceVictory();
    }
    return false;
  });

  if (!success) {
    console.log('  forceVictory not available, waiting for natural end...');
  }

  return success;
}

/**
 * Force mission defeat without killing commander.
 * This ends the mission as a loss but commander survives.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function forceDefeat(page) {
  const success = await page.evaluate(() => {
    if (typeof window.__TEST__?.forceDefeat === 'function') {
      return window.__TEST__.forceDefeat();
    }
    return false;
  });

  if (!success) {
    console.log('  forceDefeat not available');
  }

  return success;
}

/**
 * Force commander death.
 * This triggers game over in ironman mode.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function forceCommanderDeath(page) {
  const success = await page.evaluate(() => {
    if (typeof window.__TEST__?.forceCommanderDeath === 'function') {
      return window.__TEST__.forceCommanderDeath();
    }
    return false;
  });

  if (!success) {
    console.log('  forceCommanderDeath not available');
  }

  return success;
}

/**
 * Force ALL human player deaths in multiplayer.
 * This kills both the commander (host) and all guest players' ships.
 * Use this to trigger defeat in multiplayer where all humans must die.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function forceAllHumanPlayersDeath(page) {
  const success = await page.evaluate(() => {
    if (typeof window.__TEST__?.forceAllHumanPlayersDeath === 'function') {
      return window.__TEST__.forceAllHumanPlayersDeath();
    }
    return false;
  });

  if (!success) {
    console.log('  forceAllHumanPlayersDeath not available');
  }

  return success;
}

/**
 * Wait for mission to end (results screen or game over).
 * @param {import('playwright').Page} page
 * @param {number} timeout
 */
export async function waitForMissionEnd(page, timeout = 60000) {
  await page.waitForSelector('.results-screen, .game-over-screen', {
    state: 'visible',
    timeout,
  });
}

// =============================================================================
// Campaign Setup Helpers
// =============================================================================

/**
 * Setup host in lobby with an IRONMAN campaign.
 * Creates a new ironman campaign for the test.
 * @param {import('playwright').Browser} browser
 */
export async function setupHostWithIronmanCampaign(browser) {
  const { injectTestConfig, TIMEOUTS } = await import('../core/config.mjs');
  const { VITE_URL } = await import('../core/servers.mjs');

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();

  hostPage.on('pageerror', (err) => {
    console.log(`  [Host Error] ${err.message}`);
    if (err.stack) {
      console.log(
        `  [Host Stack] ${err.stack.split('\n').slice(0, 10).join('\n  ')}`,
      );
    }
  });

  await hostPage.goto(VITE_URL, { waitUntil: 'networkidle' });
  await injectTestConfig(hostPage);

  // Host: Click Host Game
  await hostPage.waitForSelector('#btn-host-game', {
    state: 'visible',
    timeout: TIMEOUTS.navigation,
  });
  await hostPage.click('#btn-host-game');

  // Host: Wait for saves list
  await hostPage.waitForSelector('.saves-list', {
    state: 'visible',
    timeout: TIMEOUTS.ui,
  });

  // Always create a new campaign for ironman test (click empty slot)
  await hostPage.locator('.save-slot.empty').first().click();

  // Wait for campaign creation modal
  await hostPage.waitForSelector('.campaign-create-modal', {
    state: 'visible',
    timeout: TIMEOUTS.ui,
  });

  // Click Ironman button to enable ironman mode
  await hostPage.click('#btn-ironman');

  // Wait a moment for UI to update
  await new Promise((r) => setTimeout(r, 100));

  // Click Start to create the campaign
  await hostPage.click('#btn-start');

  // Wait for lobby
  await hostPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: TIMEOUTS.connection,
  });

  // Get room code
  await hostPage.waitForFunction(
    () => {
      const lobbyScreen = document.querySelector('.lobby-screen');
      const el = lobbyScreen?.querySelector('.room-code-value');
      return el?.textContent && el.textContent.trim().length >= 4;
    },
    null,
    { timeout: TIMEOUTS.connection },
  );

  const roomCode = (
    await hostPage.locator('.lobby-screen .room-code-value').textContent()
  )?.trim();

  return { hostContext, hostPage, roomCode };
}
