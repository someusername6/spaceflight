/**
 * E2E Test Helpers
 *
 * Shared utilities for multiplayer E2E tests.
 * Uses condition-based waiting instead of arbitrary sleeps.
 */

import { TIMEOUTS } from './test-config.mjs';

// Re-export lobby-specific helpers
export {
  changeCallsign,
  closeCallsignPopover,
  closeHostPopover,
  getCallsignError,
  getPlayerCallsigns,
  openHostPopover,
  setShipEditPermission,
  togglePermission,
} from './lobby-helpers.mjs';

/**
 * Navigate a page to a specific campaign tab.
 * Waits for the screen content to be visible.
 * @param {import('playwright').Page} page
 * @param {'store' | 'squadron' | 'contracts' | 'lobby'} tab
 */
export async function navigateTo(page, tab) {
  await page.click(`#nav-${tab}`);
  await page.waitForSelector(`.${tab}-screen`, {
    state: 'visible',
    timeout: 5000,
  });
}

/**
 * Wait for state sync between host and guest.
 * Waits for a specific condition to be true on the guest page.
 * @param {import('playwright').Page} guestPage
 * @param {Function} conditionFn - Function to evaluate in page context
 * @param {any} arg - Argument to pass to function
 * @param {number} timeout
 */
export async function waitForSync(
  guestPage,
  conditionFn,
  arg = null,
  timeout = 5000,
) {
  if (typeof conditionFn === 'number') {
    // Legacy usage: waitForSync(page, timeout) - still works but deprecated
    await new Promise((r) => setTimeout(r, conditionFn));
    return;
  }
  await guestPage.waitForFunction(conditionFn, arg, { timeout, polling: 50 });
}

/**
 * Check if a button is disabled on a page.
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
export async function isButtonDisabled(page, selector) {
  const button = page.locator(selector);
  const isDisabled = await button.evaluate((el) => {
    return el.hasAttribute('disabled') || el.classList.contains('disabled');
  });
  return isDisabled;
}

/**
 * Get credits displayed in nav bar.
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
export async function getDisplayedCredits(page) {
  const creditsText = await page.locator('.nav-credits').textContent();
  const match = creditsText?.match(/[\d,]+/);
  return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
}

/**
 * Wait for the nav bar credits display to equal an expected value.
 * @param {import('playwright').Page} page
 * @param {number} expected - Expected credit amount
 * @param {number} timeout
 */
export async function waitForCreditsToEqual(page, expected, timeout = 10000) {
  await page.waitForFunction(
    (exp) => {
      const el = document.querySelector('.nav-credits');
      const text = el?.textContent || '';
      const match = text.match(/[\d,]+/);
      return match && parseInt(match[0].replace(/,/g, ''), 10) === exp;
    },
    expected,
    { timeout, polling: 50 },
  );
}

/**
 * Check ready status indicator for a player.
 * @param {import('playwright').Page} page
 * @param {boolean} isHost - Whether to check host or guest row
 * @returns {Promise<boolean>}
 */
export async function isPlayerReady(page, isHost) {
  const selector = isHost
    ? '.player-row:has(.host-indicator) .ready-indicator.ready'
    : '.player-row:not(:has(.host-indicator)) .ready-indicator.ready';
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Navigate host to contracts screen from lobby.
 * @param {import('playwright').Page} hostPage
 */
export async function goToContractsFromLobby(hostPage) {
  const contractsTab = hostPage.locator('#nav-contracts, .tab-contracts');
  if (await contractsTab.isVisible().catch(() => false)) {
    await contractsTab.click();
    await hostPage.waitForSelector('.contracts-screen', {
      state: 'visible',
      timeout: 5000,
    });
  }
}

/**
 * Select a contract from the list.
 * @param {import('playwright').Page} page
 * @param {number} index - 0-based index
 */
export async function selectContract(page, index = 0) {
  const contracts = page.locator('.contract-list-item');
  const count = await contracts.count();
  if (count > index) {
    const contract = contracts.nth(index);
    await contract.click();
    // Wait for selection to be reflected (selected class or visual change)
    await page
      .waitForFunction(
        (idx) => {
          const items = document.querySelectorAll('.contract-list-item');
          const item = items[idx];
          return (
            item?.classList.contains('selected') ||
            item?.getAttribute('aria-selected') === 'true'
          );
        },
        index,
        { timeout: 2000 },
      )
      .catch(() => {}); // Selection indicator may vary
  }
}

/**
 * Check if Accept Mission button is disabled.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function isAcceptMissionDisabled(page) {
  return isButtonDisabled(page, '#btn-accept-mission');
}

/**
 * Check if Refresh button is disabled.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function isRefreshDisabled(page) {
  return isButtonDisabled(page, '#btn-refresh-contracts');
}

/**
 * Get chat messages from the lobby.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
export async function getChatMessages(page) {
  const messages = await page.locator('.chat-message').allTextContents();
  return messages;
}

/**
 * Wait for a system message containing specific text.
 * @param {import('playwright').Page} page
 * @param {string} text
 * @param {number} timeout
 */
export async function waitForSystemMessage(page, text, timeout = 15000) {
  await page.waitForFunction(
    (searchText) => {
      const messages = document.querySelectorAll('.chat-message.system');
      return Array.from(messages).some((m) =>
        m.textContent?.includes(searchText),
      );
    },
    text,
    { timeout, polling: 50 },
  );
}

/**
 * Make both players ready and wait for both indicators.
 * @param {import('playwright').Page} hostPage
 * @param {import('playwright').Page} guestPage
 */
export async function readyBothPlayers(hostPage, guestPage) {
  // Click ready on host
  await hostPage.click('#btn-ready');

  // Wait for at least one ready indicator to appear on host page
  await hostPage.waitForFunction(
    () => document.querySelectorAll('.ready-indicator.ready').length >= 1,
    null,
    { timeout: TIMEOUTS.ui, polling: 50 },
  );

  // Click ready on guest
  await guestPage.click('#btn-ready');

  // Wait for both players to see both ready indicators (sync confirmation)
  await Promise.all([
    hostPage.waitForFunction(
      () => document.querySelectorAll('.ready-indicator.ready').length >= 2,
      null,
      { timeout: TIMEOUTS.sync, polling: 50 },
    ),
    guestPage.waitForFunction(
      () => document.querySelectorAll('.ready-indicator.ready').length >= 2,
      null,
      { timeout: TIMEOUTS.sync, polling: 50 },
    ),
  ]);
}

/**
 * Navigate host to contracts, select first contract, and click Accept.
 * @param {import('playwright').Page} hostPage
 */
export async function acceptFirstContract(hostPage) {
  await hostPage.click('#nav-contracts');
  await hostPage.waitForSelector('.contracts-screen', {
    state: 'visible',
    timeout: 5000,
  });

  await selectContract(hostPage, 0);

  // Click accept - countdown will start automatically
  // The calling test should wait for mission to actually start
  await hostPage.click('#btn-accept-mission');
}
