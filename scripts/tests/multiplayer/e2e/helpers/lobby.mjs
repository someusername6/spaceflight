/**
 * E2E Test Helpers - Lobby Specific
 *
 * Helpers specific to lobby testing (permissions, popovers, callsigns).
 */

/**
 * Open the host popover for a guest player.
 * @param {import('playwright').Page} hostPage
 * @returns {Promise<import('playwright').Locator>} The popover element
 */
export async function openHostPopover(hostPage) {
  // Ensure any existing popover is closed first
  await hostPage.mouse.move(0, 0);
  await hostPage
    .waitForFunction(
      () => document.querySelectorAll('.host-popover').length === 0,
      null,
      { timeout: 2000 },
    )
    .catch(() => {
      // Force remove if still present
      hostPage.evaluate(() => {
        for (const el of document.querySelectorAll('.host-popover')) {
          el.remove();
        }
      });
    });

  // Hover on guest row to trigger popover
  const guestRow = hostPage
    .locator('.player-row:not(:has(.host-indicator))')
    .first();
  await guestRow.hover();

  // Wait for popover to appear
  const popover = hostPage.locator('.host-popover').first();
  await popover.waitFor({ state: 'visible', timeout: 3000 });
  return popover;
}

/**
 * Close the host popover by moving mouse away.
 * @param {import('playwright').Page} hostPage
 */
export async function closeHostPopover(hostPage) {
  await hostPage.mouse.move(0, 0);
  // Wait for popover to disappear
  await hostPage
    .waitForFunction(
      () => document.querySelectorAll('.host-popover').length === 0,
      null,
      { timeout: 2000 },
    )
    .catch(() => {}); // Ignore if already gone
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
    // Wait for checkbox state to update
    await hostPage.waitForFunction(
      ({ sel, expected }) => {
        const el = document.querySelector(sel);
        return el?.checked === expected;
      },
      {
        sel: `input[data-permission="${permissionType}"]`,
        expected: targetState,
      },
      { timeout: 2000 },
    );
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
  // Wait for select value to update
  await hostPage.waitForFunction(
    ({ sel, expected }) => {
      const el = document.querySelector(sel);
      return el?.value === expected;
    },
    { sel: 'select[data-permission="shipEdit"]', expected: value },
    { timeout: 2000 },
  );

  await closeHostPopover(hostPage);
}

/**
 * Change the local player's callsign via the callsign popover.
 * Clicks the self row, enters new callsign, and saves.
 * @param {import('playwright').Page} page
 * @param {string} newCallsign
 * @returns {Promise<boolean>} Whether the change was successful
 */
export async function changeCallsign(page, newCallsign) {
  // Click on self row to open callsign popover
  const selfRow = page.locator('.player-row.self');
  await selfRow.click();

  // Wait for popover to appear
  const popover = page.locator('.callsign-popover');
  await popover.waitFor({ state: 'visible', timeout: 3000 });

  // Clear and fill input
  const input = page.locator('#callsign-input');
  await input.fill(newCallsign);

  // Click save
  await page.click('#btn-callsign-save');

  // Wait for popover to close (success) or error to appear
  const result = await Promise.race([
    popover.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true),
    page
      .waitForSelector('#callsign-error:not(:empty)', { timeout: 3000 })
      .then(() => false),
  ]).catch(() => false);

  return result;
}

/**
 * Get the callsign error message from the popover.
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
export async function getCallsignError(page) {
  const errorEl = page.locator('#callsign-error');
  const isVisible = await errorEl.isVisible().catch(() => false);
  if (!isVisible) return null;
  const text = await errorEl.textContent();
  return text?.trim() || null;
}

/**
 * Close the callsign popover by clicking cancel or outside.
 * @param {import('playwright').Page} page
 */
export async function closeCallsignPopover(page) {
  const cancelBtn = page.locator('#btn-callsign-cancel');
  if (await cancelBtn.isVisible().catch(() => false)) {
    await cancelBtn.click();
    // Wait for popover to close
    await page
      .locator('.callsign-popover')
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {});
  }
}

/**
 * Get all player callsigns from the lobby.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
export async function getPlayerCallsigns(page) {
  const callsigns = await page
    .locator('.player-row .player-callsign')
    .allTextContents();
  return callsigns.map((c) => c.trim());
}
