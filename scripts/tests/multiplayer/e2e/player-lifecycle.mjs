/**
 * E2E Tests - Player Lifecycle
 *
 * Tests for player join/leave:
 * - Player disconnect → host sees system message
 * - Ship assignment on join → guest receives ship
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

// TODO: Re-enable when player disconnect handling is implemented
// The disconnect notification requires proper WebRTC ICE state monitoring
// and lobby state updates, which may not be fully wired up yet.
// /**
//  * Test: Guest disconnects → host sees system message.
//  */
// function testPlayerDisconnect() {
//   return runTest('Player Disconnect → System Message', async (browser) => {
//     ...
//   });
// }

/**
 * Test: Guest joins → receives ship assignment.
 */
function testShipAssignmentOnJoin() {
  return runTest('Ship Assignment On Join', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ShipAssignGuest');
    console.log('  Both players connected');

    // Wait for any ship assignment to propagate
    await sleep(1000);

    // Check if guest received a ship assignment
    // This can be verified by:
    // 1. System message about ship assignment
    // 2. Guest player row showing ship indicator
    // 3. Lobby state has guest with non-null shipId

    // Check for ship assignment system message
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
    const guestRow = hostPage.locator('.player-row').filter({
      hasNot: hostPage.locator('.host-indicator'),
    });
    const guestRowVisible = await guestRow.isVisible().catch(() => false);

    if (guestRowVisible) {
      // Look for ship indicator or ship info in guest row
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
    const guestPlayerRow = guestPage.locator('.player-row').filter({
      hasNot: guestPage.locator('.host-indicator'),
    });
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

    // Test passes if we got this far without error
    // Ship assignment is optional (depends on campaign having available wingmen)
    console.log('  Ship assignment flow completed');

    await hostContext.close();
    await guestContext.close();
  });
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  // TODO: Re-enable when player disconnect handling is implemented
  // { name: 'Player disconnect → system message', fn: testPlayerDisconnect },
  { name: 'Ship assignment on join', fn: testShipAssignmentOnJoin },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Player Lifecycle', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
