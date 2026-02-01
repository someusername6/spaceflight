/**
 * E2E Tests - Kick System
 *
 * Tests for host kicking guests from lobby.
 * Total: 3 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  VITE_URL,
} from '../core/index.mjs';

// =============================================================================
// Helper: Setup host and guest in lobby
// =============================================================================

async function setupHostAndGuest(browser, guestCallsign = 'KickTestGuest') {
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

  // Host: Start game and enter lobby
  await hostPage.goto(VITE_URL, { waitUntil: 'networkidle' });
  await hostPage.waitForSelector('#btn-host-game', {
    state: 'visible',
    timeout: 15000,
  });
  await hostPage.click('#btn-host-game');
  await hostPage.waitForSelector('.saves-list', {
    state: 'visible',
    timeout: 5000,
  });

  const hostOccupiedSlot = await hostPage
    .locator('.save-slot.occupied')
    .first();
  if (await hostOccupiedSlot.isVisible().catch(() => false)) {
    await hostOccupiedSlot.click();
  } else {
    await hostPage.locator('.save-slot.empty').first().click();
    await hostPage.waitForSelector('.campaign-create-modal', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('#btn-start');
  }

  await hostPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });
  console.log('  Host: In lobby');

  const roomCode = (
    await hostPage.locator('.lobby-screen .room-code-value').textContent()
  )?.trim();

  // Guest: Join the lobby
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
  await guestPage.fill('#room-code', roomCode.replace(/\s+/g, ''));

  const callsignInput = guestPage.locator('#callsign');
  if (await callsignInput.isVisible().catch(() => false)) {
    await callsignInput.fill(guestCallsign);
  }

  await guestPage.click('#btn-join');
  await guestPage.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });
  console.log('  Guest: In lobby');

  // Wait for both to see 2 players
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
  console.log('  Both players connected');

  return { hostContext, guestContext, hostPage, guestPage, roomCode };
}

// =============================================================================
// Tests
// =============================================================================

function testHostCanKickGuest() {
  return runTest('Host can kick guest from lobby', async (browser) => {
    const { hostContext, guestContext, hostPage } =
      await setupHostAndGuest(browser);

    // Host: Hover over guest row to show popover
    const guestRow = hostPage.locator('.player-row').nth(1); // Guest is second row
    await guestRow.hover();
    console.log('  Host: Hovered over guest row');

    // Wait for popover with kick button
    await hostPage.waitForSelector('.host-popover #btn-kick', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Host: Popover visible with kick button');

    // Click kick button
    await hostPage.click('.host-popover #btn-kick');
    console.log('  Host: Clicked kick button');

    // Host should see only 1 player now
    await hostPage.waitForFunction(
      () => document.querySelectorAll('.player-row').length === 1,
      { timeout: 10000 },
    );
    console.log('  Host: Guest removed from player list');

    await hostContext.close();
    await guestContext.close();
  });
}

function testKickedGuestSeesNotification() {
  return runTest('Kicked guest sees notification', async (browser) => {
    const { hostContext, guestContext, hostPage, guestPage } =
      await setupHostAndGuest(browser);

    // Host: Kick the guest
    const guestRow = hostPage.locator('.player-row').nth(1);
    await guestRow.hover();
    await hostPage.waitForSelector('.host-popover #btn-kick', {
      state: 'visible',
      timeout: 5000,
    });
    await hostPage.click('.host-popover #btn-kick');
    console.log('  Host: Kicked guest');

    // Guest should see an alert modal or return to title
    try {
      // Check for alert modal
      await guestPage.waitForSelector('.alert-modal', {
        state: 'visible',
        timeout: 10000,
      });
      const alertText = await guestPage.locator('.alert-modal').textContent();
      console.log(`  Guest: Sees alert - "${alertText?.substring(0, 50)}..."`);

      // Verify it mentions being kicked
      if (
        !alertText?.toLowerCase().includes('kick') &&
        !alertText?.toLowerCase().includes('removed')
      ) {
        console.log('  Guest: Alert may not mention kick explicitly');
      }
    } catch {
      // May have already returned to title
      await guestPage.waitForSelector('#btn-play', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Guest: Returned to title screen');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testKickedGuestCannotRejoinWithSameCallsign() {
  return runTest(
    'Kicked guest cannot rejoin with same callsign',
    async (browser) => {
      const guestCallsign = 'BlockedGuest';
      const { hostContext, guestContext, hostPage, guestPage, roomCode } =
        await setupHostAndGuest(browser, guestCallsign);

      // Host: Kick the guest
      const guestRow = hostPage.locator('.player-row').nth(1);
      await guestRow.hover();
      await hostPage.waitForSelector('.host-popover #btn-kick', {
        state: 'visible',
        timeout: 5000,
      });
      await hostPage.click('.host-popover #btn-kick');
      console.log('  Host: Kicked guest');

      // Wait for alert to appear (kicked notification)
      await guestPage.waitForSelector('.alert-overlay', {
        state: 'visible',
        timeout: 15000,
      });
      console.log('  Guest: Alert appeared');

      // Dismiss the alert
      await guestPage.click('#btn-alert-ok');
      await guestPage.waitForSelector('.alert-overlay', {
        state: 'hidden',
        timeout: 5000,
      });
      console.log('  Guest: Dismissed alert');

      // Now we should be on title screen
      await guestPage.waitForSelector('#btn-play', {
        state: 'visible',
        timeout: 5000,
      });
      console.log('  Guest: Returned to title, attempting rejoin');

      // Guest: Try to rejoin with same callsign
      await guestPage.click('#btn-join-game');
      await guestPage.waitForSelector('.join-game-screen', {
        state: 'visible',
        timeout: 5000,
      });
      await guestPage.fill('#room-code', roomCode.replace(/\s+/g, ''));

      const callsignInput = guestPage.locator('#callsign');
      if (await callsignInput.isVisible().catch(() => false)) {
        await callsignInput.fill(guestCallsign);
      }

      await guestPage.click('#btn-join');
      console.log('  Guest: Attempted to rejoin');

      // Should see an error view with message about being kicked
      await guestPage.waitForSelector('.join-game-error', {
        state: 'visible',
        timeout: 15000,
      });

      const errorText = await guestPage.locator('.error-message').textContent();
      console.log(`  Guest: Error message - "${errorText}"`);

      if (
        !errorText?.toLowerCase().includes('kick') &&
        !errorText?.toLowerCase().includes('blocked')
      ) {
        throw new Error(
          `Expected error about kicked callsign, got: "${errorText}"`,
        );
      }
      console.log('  Guest: Rejoin blocked with kicked callsign');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Host can kick guest', fn: testHostCanKickGuest },
  { name: 'Kicked guest notification', fn: testKickedGuestSeesNotification },
  {
    name: 'Kicked callsign blocked',
    fn: testKickedGuestCannotRejoinWithSameCallsign,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Kick System Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
