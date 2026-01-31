/**
 * E2E Loadout Test Helpers
 *
 * Shared utilities for loadout sync tests (weapon equip/unequip/resupply).
 */

import { sleep } from '../core/runner.mjs';

/**
 * Select a deployed wingman ship (second deployed) and return its ship ID.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
export async function selectWingman(page) {
  const wingman = page.locator('.ship-item.deployed').nth(1);
  await wingman.click();
  await sleep(500);

  const shipId = await page.evaluate(() => {
    const items = document.querySelectorAll('.ship-item.deployed');
    const selected = Array.from(items).find((el) =>
      el.classList.contains('selected'),
    );
    return selected?.dataset.deployedId;
  });

  if (!shipId) throw new Error('Could not get wingman ship ID');
  return shipId;
}

/**
 * Unequip a primary weapon from a ship via popover interaction.
 * Hovers slot → clicks to pin → clicks Unequip.
 * @param {import('playwright').Page} page
 * @param {string} shipId
 * @param {number} slotIndex
 */
export async function unequipPrimarySlot(page, shipId, slotIndex = 0) {
  const slotSel = `.schematic-slot.primary.filled[data-ship="${shipId}"][data-index="${slotIndex}"]`;

  await page.hover(slotSel);
  await sleep(300);
  await page.click(slotSel);
  await sleep(300);

  await page.waitForSelector('.btn-unequip', {
    state: 'visible',
    timeout: 3000,
  });
  await page.click('.btn-unequip');
  await sleep(500);
}

/**
 * Equip a primary weapon to an empty slot via popover picker.
 * Clicks empty slot → selects first picker item.
 * @param {import('playwright').Page} page
 * @param {string} shipId
 * @param {number} slotIndex
 */
export async function equipPrimarySlot(page, shipId, slotIndex = 0) {
  const slotSel = `.schematic-slot.primary.empty[data-ship="${shipId}"][data-index="${slotIndex}"]`;

  await page.hover(slotSel);
  await sleep(300);
  await page.click(slotSel);
  await sleep(300);

  await page.waitForSelector('.picker-item', {
    state: 'visible',
    timeout: 3000,
  });
  await page.click('.picker-item');
  await sleep(500);
}

/**
 * Wait for a schematic slot to become empty.
 * @param {import('playwright').Page} page
 * @param {string} shipId
 * @param {'primary' | 'secondary'} slotType
 * @param {number} slotIndex
 * @param {number} timeout
 */
export async function waitForSlotEmpty(
  page,
  shipId,
  slotType,
  slotIndex,
  timeout = 10000,
) {
  await page.waitForFunction(
    ({ sid, type, idx }) => {
      const slot = document.querySelector(
        `.schematic-slot.${type}[data-ship="${sid}"][data-index="${idx}"]`,
      );
      return slot?.classList.contains('empty') ?? false;
    },
    { sid: shipId, type: slotType, idx: slotIndex },
    { timeout },
  );
}

/**
 * Wait for a schematic slot to become filled.
 * @param {import('playwright').Page} page
 * @param {string} shipId
 * @param {'primary' | 'secondary'} slotType
 * @param {number} slotIndex
 * @param {number} timeout
 */
export async function waitForSlotFilled(
  page,
  shipId,
  slotType,
  slotIndex,
  timeout = 10000,
) {
  await page.waitForFunction(
    ({ sid, type, idx }) => {
      const slot = document.querySelector(
        `.schematic-slot.${type}[data-ship="${sid}"][data-index="${idx}"]`,
      );
      return slot?.classList.contains('filled') ?? false;
    },
    { sid: shipId, type: slotType, idx: slotIndex },
    { timeout },
  );
}

/**
 * Select a specific wingman on a page by its ship ID.
 * @param {import('playwright').Page} page
 * @param {string} shipId
 */
export async function selectWingmanById(page, shipId) {
  await page.evaluate((sid) => {
    const item = document.querySelector(
      `.ship-item[data-deployed-id="${sid}"]`,
    );
    if (item) item.click();
  }, shipId);
  await sleep(500);
}
