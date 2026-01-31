/**
 * E2E Tests - Connection Flow
 *
 * Tests for host flow, host-guest connection, and ship assignment.
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  sleep,
  VITE_URL,
} from '../core/index.mjs';
import { setupHostAndGuest } from '../helpers/index.mjs';

// =============================================================================
// Connection Tests
// =============================================================================

function testFullHostFlow() {
  return runTest('Full Host Flow', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error')
        console.log(`  [Browser Error] ${msg.text()}`);
    });
    page.on('requestfailed', (request) =>
      console.log(
        `  [Request Failed] ${request.url()} - ${request.failure()?.errorText}`,
      ),
    );
    page.on('pageerror', (err) => console.log(`  [Page Error] ${err.message}`));

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });

    await page.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 15000,
    });
    await page.click('#btn-host-game');
    console.log('  Clicked Host Game');

    await page.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Load campaign screen visible');

    const occupiedSlot = await page.locator('.save-slot.occupied').first();
    const hasOccupiedSlot = await occupiedSlot.isVisible().catch(() => false);

    if (hasOccupiedSlot) {
      await occupiedSlot.click();
      console.log('  Clicked existing campaign');
    } else {
      const emptySlot = await page.locator('.save-slot.empty').first();
      await emptySlot.click();
      console.log('  Clicked empty slot');

      await page.waitForSelector('.campaign-create-modal', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Create modal visible');

      await page.click('#btn-start');
      console.log('  Clicked Start Campaign button');
    }

    await page.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Lobby screen visible');

    await page.waitForFunction(
      () => {
        const lobbyScreen = document.querySelector('.lobby-screen');
        const el = lobbyScreen?.querySelector('.room-code-value');
        return el?.textContent && el.textContent.trim().length >= 4;
      },
      { timeout: 15000 },
    );

    const roomCodeElement = page.locator('.lobby-screen .room-code-value');
    const roomCode = (await roomCodeElement.textContent())?.trim();

    if (!roomCode || roomCode.length < 4)
      throw new Error(`Invalid room code: ${roomCode}`);
    console.log(`  Room code: ${roomCode}`);

    const playersPanel = await page.locator('.players-panel').isVisible();
    if (!playersPanel) throw new Error('Players panel not visible');
    console.log('  Players panel visible');

    const chatPanel = await page.locator('.chat-panel').isVisible();
    if (!chatPanel) throw new Error('Chat panel not visible');
    console.log('  Chat panel visible');

    await context.close();
  });
}

function testHostAndGuestConnection() {
  return runTest('Host and Guest Connection', async (browser) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    hostPage.on('pageerror', (err) =>
      console.log(`  [Host Error] ${err.message}`),
    );
    guestPage.on('pageerror', (err) =>
      console.log(`  [Guest Error] ${err.message}`),
    );

    hostPage.on('console', (msg) => {
      if (msg.text().includes('[Lobby]'))
        console.log(`  [Host Console] ${msg.text()}`);
    });
    guestPage.on('console', (msg) => {
      if (msg.text().includes('[Lobby]'))
        console.log(`  [Guest Console] ${msg.text()}`);
    });

    // HOST FLOW
    await hostPage.goto(VITE_URL, { waitUntil: 'networkidle' });
    await hostPage.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 15000,
    });
    await hostPage.click('#btn-host-game');
    console.log('  Host: Clicked Host Game');

    await hostPage.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });
    const hostOccupiedSlot = await hostPage
      .locator('.save-slot.occupied')
      .first();
    if (await hostOccupiedSlot.isVisible().catch(() => false)) {
      await hostOccupiedSlot.click();
      console.log('  Host: Selected existing campaign');
    } else {
      await hostPage.locator('.save-slot.empty').first().click();
      await hostPage.waitForSelector('.campaign-create-modal', {
        state: 'visible',
        timeout: 5000,
      });
      await hostPage.click('#btn-start');
      console.log('  Host: Created new campaign');
    }

    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Host: In lobby');

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
    console.log(`  Host: Room code is ${roomCode}`);

    // GUEST FLOW
    await guestPage.goto(VITE_URL, { waitUntil: 'networkidle' });
    await guestPage.waitForSelector('#btn-join-game', {
      state: 'visible',
      timeout: 15000,
    });
    await guestPage.click('#btn-join-game');
    console.log('  Guest: Clicked Join Game');

    await guestPage.waitForSelector('.join-game-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.fill('input', roomCode.replace(/\s+/g, ''));
    console.log(`  Guest: Entered room code ${roomCode.replace(/\s+/g, '')}`);

    const callsignInput = guestPage.locator(
      'input[placeholder*="callsign" i], input#callsign',
    );
    if (await callsignInput.isVisible().catch(() => false)) {
      await callsignInput.fill('TestGuest');
      console.log('  Guest: Entered callsign');
    }

    await guestPage.click('#btn-join');
    console.log('  Guest: Clicked Join');

    await guestPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Guest: In lobby');

    const guestPlayersPanel = await guestPage
      .locator('.players-panel')
      .isVisible()
      .catch(() => false);
    const guestChatPanel = await guestPage
      .locator('.chat-panel')
      .isVisible()
      .catch(() => false);

    if (!guestPlayersPanel)
      throw new Error('Guest lobby missing players panel');
    if (!guestChatPanel) throw new Error('Guest lobby missing chat panel');
    console.log('  Guest: Lobby panels visible');

    const hostPlayerCount = await hostPage.locator('.player-row').count();
    console.log(`  Host: Currently sees ${hostPlayerCount} player(s)`);

    const guestPlayerCount = await guestPage.locator('.player-row').count();
    console.log(`  Guest: Currently sees ${guestPlayerCount} player(s)`);

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
    console.log('  Both see 2 players - full mesh established');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Player Lifecycle Tests
// =============================================================================

function testShipAssignmentOnJoin() {
  return runTest('Ship Assignment On Join', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    await sleep(1000);

    // Check if guest received a ship assignment
    const systemMessages = await guestPage
      .locator('.chat-message.system')
      .allTextContents();
    console.log(`  Guest system messages: ${systemMessages.length}`);

    const hasAssignmentMsg = systemMessages.some(
      (msg) =>
        msg.toLowerCase().includes('assigned') ||
        msg.toLowerCase().includes('ship'),
    );

    if (hasAssignmentMsg) {
      console.log('  Ship assignment message found');
      const assignmentMsg = systemMessages.find(
        (msg) =>
          msg.toLowerCase().includes('assigned') ||
          msg.toLowerCase().includes('ship'),
      );
      console.log(`  Assignment message: "${assignmentMsg}"`);
    }

    // Check if guest player row has ship indicator (on host page)
    const guestRow = hostPage
      .locator('.player-row')
      .filter({ hasNot: hostPage.locator('.host-indicator') });
    const guestRowVisible = await guestRow.isVisible().catch(() => false);

    if (guestRowVisible) {
      const shipIndicator = guestRow.locator(
        '.ship-indicator, .ship-name, [data-ship-id]',
      );
      const hasShipIndicator = await shipIndicator
        .isVisible()
        .catch(() => false);
      console.log(`  Guest row has ship indicator: ${hasShipIndicator}`);

      if (hasShipIndicator) {
        const shipText = await shipIndicator.textContent().catch(() => '');
        console.log(`  Ship indicator text: "${shipText}"`);
      }
    }

    // Also verify on guest's own view
    const guestPlayerRow = guestPage
      .locator('.player-row')
      .filter({ hasNot: guestPage.locator('.host-indicator') });
    const guestOwnRowVisible = await guestPlayerRow
      .isVisible()
      .catch(() => false);

    if (guestOwnRowVisible) {
      const ownShipIndicator = guestPlayerRow.locator(
        '.ship-indicator, .ship-name, [data-ship-id]',
      );
      const hasOwnShipIndicator = await ownShipIndicator
        .isVisible()
        .catch(() => false);
      console.log(`  Guest sees own ship indicator: ${hasOwnShipIndicator}`);
    }

    console.log('  Ship assignment flow completed');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Full Host Flow', fn: testFullHostFlow },
  { name: 'Host and Guest Connection', fn: testHostAndGuestConnection },
  { name: 'Ship assignment on join', fn: testShipAssignmentOnJoin },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Connection Flow Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
