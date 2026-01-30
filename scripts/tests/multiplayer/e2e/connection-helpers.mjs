/**
 * Connection Test Helpers
 *
 * Shared helpers for setting up host/guest connections in E2E tests.
 */

import { injectTestConfig, TIMEOUTS } from './test-config.mjs';
import { VITE_URL } from './utils.mjs';

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
  await injectTestConfig(hostPage);

  // Host: Click Host Game
  await hostPage.waitForSelector('#btn-host-game', {
    state: 'visible',
    timeout: TIMEOUTS.navigation,
  });
  await hostPage.click('#btn-host-game');

  // Host: Select campaign
  await hostPage.waitForSelector('.saves-list', {
    state: 'visible',
    timeout: TIMEOUTS.ui,
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
      timeout: TIMEOUTS.ui,
    });
    await hostPage.click('#btn-start');
  }

  // Host: Wait for lobby
  await hostPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: TIMEOUTS.connection,
  });

  // Host: Get room code
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

/**
 * Helper: Join guest to lobby.
 */
export async function joinGuestToLobby(browser, roomCode) {
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  guestPage.on('pageerror', (err) => {
    console.log(`  [Guest Error] ${err.message}`);
  });

  // Capture lobby-routing logs
  guestPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('lobby-routing')) {
      console.log(`  [Guest] ${text}`);
    }
  });

  await guestPage.goto(VITE_URL, { waitUntil: 'networkidle' });
  await injectTestConfig(guestPage);

  // Guest: Click Join Game
  await guestPage.waitForSelector('#btn-join-game', {
    state: 'visible',
    timeout: TIMEOUTS.navigation,
  });
  await guestPage.click('#btn-join-game');

  // Guest: Enter room code
  await guestPage.waitForSelector('.join-game-screen', {
    state: 'visible',
    timeout: TIMEOUTS.ui,
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
    timeout: TIMEOUTS.connection,
  });

  return { guestContext, guestPage };
}

/**
 * Helper: Setup both host and guest in lobby.
 * Uses joinGuestToLobby internally to avoid code duplication.
 */
export async function setupHostAndGuest(browser) {
  const { hostContext, hostPage, roomCode } = await setupHostInLobby(browser);

  // Fill callsign before join (joinGuestToLobby uses generic selectors)
  const { guestContext, guestPage } = await joinGuestToLobby(browser, roomCode);

  // If a custom callsign is needed, it would have been set via the general input
  // in joinGuestToLobby. For specific callsign input, we override after join.
  // Note: The callsign is set during join, so this is handled by joinGuestToLobby.

  // Wait for both to see each other in the player list
  await Promise.all([
    hostPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      null,
      { timeout: TIMEOUTS.connection },
    ),
    guestPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length >= 2,
      null,
      { timeout: TIMEOUTS.connection },
    ),
  ]);

  // Wait for the "joined" system message on host - this confirms WebRTC data channel is active
  // The message format is "${callsign} joined"
  await hostPage.waitForFunction(
    () => {
      const messages = document.querySelectorAll('.chat-message.system');
      return Array.from(messages).some((m) =>
        m.textContent?.includes('joined'),
      );
    },
    null,
    { timeout: TIMEOUTS.sync },
  );

  return { hostContext, hostPage, guestContext, guestPage, roomCode };
}
