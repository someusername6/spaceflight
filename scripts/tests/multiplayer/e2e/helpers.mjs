/**
 * E2E Test Helpers
 *
 * Shared utilities for multiplayer E2E tests.
 */

import { sleep } from './utils.mjs';

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
  await sleep(200);
}

/**
 * Open the host popover for a guest player.
 * @param {import('playwright').Page} hostPage
 * @returns {Promise<import('playwright').Locator>} The popover element
 */
async function openHostPopover(hostPage) {
  await hostPage.mouse.move(0, 0);
  await sleep(200);
  await hostPage.evaluate(() => {
    for (const el of document.querySelectorAll('.host-popover')) {
      el.remove();
    }
  });
  await sleep(100);

  const guestRow = hostPage
    .locator('.player-row:not(:has(.host-indicator))')
    .first();
  await guestRow.hover();
  await sleep(400);

  const popover = hostPage.locator('.host-popover').first();
  await popover.waitFor({ state: 'visible', timeout: 3000 });
  return popover;
}

/**
 * Close the host popover by moving mouse away.
 * @param {import('playwright').Page} hostPage
 */
async function closeHostPopover(hostPage) {
  await hostPage.mouse.move(0, 0);
  await sleep(300);
}

/**
 * Toggle a permission checkbox for a guest player.
 * Opens the host popover by hovering over the guest row, then clicks the checkbox.
 * Note: For shipEdit, use setShipEditPermission instead.
 * @param {import('playwright').Page} hostPage
 * @param {string} permissionType - 'canBuy' | 'canSell' | 'canConvertScrap'
 * @param {boolean} targetState - desired checked state
 */
export async function togglePermission(hostPage, permissionType, targetState) {
  // For shipEdit, delegate to setShipEditPermission with appropriate value
  if (permissionType === 'shipEdit') {
    await setShipEditPermission(hostPage, targetState ? 'any' : 'none');
    return;
  }

  const popover = await openHostPopover(hostPage);

  const checkbox = popover.locator(
    `input[data-permission="${permissionType}"]`,
  );
  const isChecked = await checkbox.isChecked();

  if (isChecked !== targetState) {
    await checkbox.click();
    await sleep(300);
  }

  await closeHostPopover(hostPage);
}

/**
 * Set the shipEdit permission to a specific value.
 * Opens the host popover and selects the value from the dropdown.
 * @param {import('playwright').Page} hostPage
 * @param {'none' | 'own' | 'any'} value - The ship edit permission level
 */
export async function setShipEditPermission(hostPage, value) {
  const popover = await openHostPopover(hostPage);

  const select = popover.locator('select[data-permission="shipEdit"]');
  await select.selectOption(value);
  await sleep(300);

  await closeHostPopover(hostPage);
}

/**
 * Wait for sync after an action.
 * Simple sleep wrapper that waits for network propagation.
 * @param {import('playwright').Page} _guestPage - Page to wait on (reserved for future use)
 * @param {number} timeout
 */
export async function waitForSync(_guestPage, timeout = 1000) {
  await sleep(timeout);
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
    { timeout },
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
  // Click on Contracts tab if in lobby
  const contractsTab = hostPage.locator('#nav-contracts, .tab-contracts');
  if (await contractsTab.isVisible().catch(() => false)) {
    await contractsTab.click();
    await sleep(500);
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
    await contracts.nth(index).click();
    await sleep(200);
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
export async function waitForSystemMessage(page, text, timeout = 5000) {
  await page.waitForFunction(
    (searchText) => {
      const messages = document.querySelectorAll('.chat-message.system');
      return Array.from(messages).some((m) =>
        m.textContent?.includes(searchText),
      );
    },
    text,
    { timeout },
  );
}

/**
 * Make both players ready and wait for both indicators.
 * @param {import('playwright').Page} hostPage
 * @param {import('playwright').Page} guestPage
 */
export async function readyBothPlayers(hostPage, guestPage) {
  await hostPage.click('#btn-ready');
  await sleep(300);
  await guestPage.click('#btn-ready');
  await sleep(500);

  await hostPage.waitForFunction(
    () => document.querySelectorAll('.ready-indicator.ready').length >= 2,
    { timeout: 5000 },
  );
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
  await sleep(200);

  await hostPage.click('#btn-accept-mission');
}
