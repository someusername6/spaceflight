/**
 * Connection Test Helpers
 *
 * Shared helpers for setting up host/guest connections in E2E tests.
 */

import { VITE_URL } from './e2e-test-utils.mjs';

/**
 * Helper: Setup host in lobby and return room code.
 * Used by other tests that need an established lobby.
 */
export async function setupHostInLobby(browser) {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();

  hostPage.on('pageerror', (err) => {
    console.log(`  [Host Error] ${err.message}`);
  });

  await hostPage.goto(VITE_URL, { waitUntil: 'networkidle' });

  // Host: Click Host Game
  await hostPage.waitForSelector('#btn-host-game', {
    state: 'visible',
    timeout: 15000,
  });
  await hostPage.click('#btn-host-game');

  // Host: Select campaign
  await hostPage.waitForSelector('.saves-list', {
    state: 'visible',
    timeout: 5000,
  });
  const hostOccupiedSlot = await hostPage
    .locator('.save-slot.occupied')
    .first();
  const hostHasOccupied = await hostOccupiedSlot.isVisible().catch(() => false);

  if (hostHasOccupied) {
    await hostOccupiedSlot.click();
  } else {
    await hostPage.locator('.save-slot.empty').first().click();
    await hostPage.waitForSelector('.campaign-create-modal', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('#btn-start');
  }

  // Host: Wait for lobby
  await hostPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });

  // Host: Get room code
  await hostPage.waitForFunction(
    () => {
      const lobbyScreen = document.querySelector('.lobby-screen');
      const el = lobbyScreen?.querySelector('.room-code-value');
      return el?.textContent && el.textContent.trim().length >= 4;
    },
    { timeout: 15000 },
  );

  const roomCode = (
    await hostPage.locator('.lobby-screen .room-code-value').textContent()
  )?.trim();

  return { hostContext, hostPage, roomCode };
}

/**
 * Helper: Join guest to lobby.
 */
export async function joinGuestToLobby(browser, roomCode) {
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  guestPage.on('pageerror', (err) => {
    console.log(`  [Guest Error] ${err.message}`);
  });

  await guestPage.goto(VITE_URL, { waitUntil: 'networkidle' });

  // Guest: Click Join Game
  await guestPage.waitForSelector('#btn-join-game', {
    state: 'visible',
    timeout: 15000,
  });
  await guestPage.click('#btn-join-game');

  // Guest: Enter room code
  await guestPage.waitForSelector('.join-game-screen', {
    state: 'visible',
    timeout: 5000,
  });
  const roomCodeWithoutSpace = roomCode.replace(/\s+/g, '');
  await guestPage.fill('input', roomCodeWithoutSpace);

  // Guest: Enter callsign if there's a callsign input
  const callsignInput = guestPage.locator(
    'input[placeholder*="callsign" i], input#callsign',
  );
  if (await callsignInput.isVisible().catch(() => false)) {
    await callsignInput.fill('TestGuest');
  }

  // Guest: Click Join button
  await guestPage.click('#btn-join');

  // Guest: Wait for lobby
  await guestPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });

  return { guestContext, guestPage };
}

/**
 * Helper: Setup both host and guest in lobby.
 */
export async function setupHostAndGuest(browser, guestCallsign = 'TestGuest') {
  const { hostContext, hostPage, roomCode } = await setupHostInLobby(browser);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  guestPage.on('pageerror', (err) => {
    console.log(`  [Guest Error] ${err.message}`);
  });

  await guestPage.goto(VITE_URL, { waitUntil: 'networkidle' });

  await guestPage.waitForSelector('#btn-join-game', {
    state: 'visible',
    timeout: 15000,
  });
  await guestPage.click('#btn-join-game');

  await guestPage.waitForSelector('.join-game-screen', {
    state: 'visible',
    timeout: 5000,
  });
  const roomCodeWithoutSpace = roomCode.replace(/\s+/g, '');
  await guestPage.fill('#room-code', roomCodeWithoutSpace);

  const callsignInput = guestPage.locator('#callsign');
  if (await callsignInput.isVisible().catch(() => false)) {
    await callsignInput.fill(guestCallsign);
  }

  await guestPage.click('#btn-join');

  await guestPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });

  // Wait for both to see each other
  await Promise.all([
    hostPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      { timeout: 15000 },
    ),
    guestPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      { timeout: 15000 },
    ),
  ]);

  return { hostContext, hostPage, guestContext, guestPage, roomCode };
}
