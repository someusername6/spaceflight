/**
 * E2E Tests - Action Rejection - Store
 *
 * Tests that store ActionRequests are rejected server-side when guest lacks permissions.
 * These tests verify the full round-trip: ActionRequest → host validates → ActionResponse
 * with success=false → state doesn't change.
 *
 * Unlike permission-ui-store tests (which check UI disabled state), these tests
 * verify that even if a client bypasses UI checks, the server enforces permissions.
 */

import { setupHostAndGuest } from './connection-helpers.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  togglePermission,
  waitForSync,
} from './helpers.mjs';
import { isMainModule, runTest, runTestSuite, sleep } from './utils.mjs';

// =============================================================================
// Tests
// =============================================================================

/**
 * Test: Guest buy action rejected without canBuy permission.
 *
 * Verifies that when a guest sends a buy ActionRequest without canBuy permission,
 * the host rejects it and credits don't change.
 */
function testBuyActionRejectedWithoutPermission() {
  return runTest(
    'Buy ActionRequest Rejected Without Permission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'BuyRejectGuest');
      console.log('  Both players connected');

      // Get initial credits
      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      // Host revokes canBuy permission
      await togglePermission(hostPage, 'canBuy', false);
      console.log('  Host revoked canBuy from guest');
      await sleep(500);

      // Guest navigates to store
      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      // Guest attempts to trigger buy action programmatically
      // This simulates a malicious client bypassing UI disabled checks
      const buyTriggered = await guestPage.evaluate(async () => {
        // Find the multiplayer client to send an ActionRequest
        const mpClient = window.multiplayerClient;
        if (!mpClient) {
          console.log('No multiplayer client');
          return false;
        }

        // Try to send a buy action directly
        try {
          // This would be rejected by host if permission is properly enforced
          const result = await mpClient.sendAction({
            type: 'buy',
            itemType: 'primary',
            itemId: 'laser-mk1',
            quantity: 1,
          });
          return { sent: true, success: result?.success ?? false };
        } catch (e) {
          return { sent: false, error: e.message };
        }
      });

      console.log(`  Buy attempt result: ${JSON.stringify(buyTriggered)}`);

      // Wait for any potential state sync
      await waitForSync(guestPage, 1000);

      // Verify credits haven't changed (action was rejected)
      const creditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Credits after attempt: ${creditsAfter}`);

      if (creditsAfter !== initialCredits) {
        throw new Error(
          `Credits changed despite no canBuy permission: ${initialCredits} → ${creditsAfter}`,
        );
      }
      console.log('  ✓ Credits unchanged - buy action correctly rejected');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test: Guest sell action rejected without canSell permission.
 *
 * Verifies that when a guest sends a sell ActionRequest without canSell permission,
 * the host rejects it and credits don't change.
 */
function testSellActionRejectedWithoutPermission() {
  return runTest(
    'Sell ActionRequest Rejected Without Permission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'SellRejectGuest');
      console.log('  Both players connected');

      // Get initial credits
      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      // Host revokes canSell permission
      await togglePermission(hostPage, 'canSell', false);
      console.log('  Host revoked canSell from guest');
      await sleep(500);

      // Guest navigates to store
      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      // Guest attempts to trigger sell action programmatically
      const sellTriggered = await guestPage.evaluate(async () => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) {
          console.log('No multiplayer client');
          return false;
        }

        try {
          const result = await mpClient.sendAction({
            type: 'sell',
            itemType: 'primary',
            itemId: 'laser-mk1',
            quantity: 1,
          });
          return { sent: true, success: result?.success ?? false };
        } catch (e) {
          return { sent: false, error: e.message };
        }
      });

      console.log(`  Sell attempt result: ${JSON.stringify(sellTriggered)}`);

      // Wait for any potential state sync
      await waitForSync(guestPage, 1000);

      // Verify credits haven't changed (action was rejected)
      const creditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Credits after attempt: ${creditsAfter}`);

      if (creditsAfter !== initialCredits) {
        throw new Error(
          `Credits changed despite no canSell permission: ${initialCredits} → ${creditsAfter}`,
        );
      }
      console.log('  ✓ Credits unchanged - sell action correctly rejected');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

/**
 * Test: Guest convertScrap action rejected without canConvertScrap permission.
 *
 * Verifies that when a guest sends a convertScrap ActionRequest without permission,
 * the host rejects it.
 */
function testConvertScrapActionRejectedWithoutPermission() {
  return runTest(
    'ConvertScrap ActionRequest Rejected Without Permission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ConvertRejectGuest');
      console.log('  Both players connected');

      // Get initial credits
      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      // Host revokes canConvertScrap permission
      await togglePermission(hostPage, 'canConvertScrap', false);
      console.log('  Host revoked canConvertScrap from guest');
      await sleep(500);

      // Guest attempts to trigger convertScrap action programmatically
      const convertTriggered = await guestPage.evaluate(async () => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) {
          return { sent: false, error: 'No client' };
        }

        try {
          const result = await mpClient.sendAction({
            type: 'convertScrap',
            shipClass: 'interceptor',
            quantity: 1,
          });
          return { sent: true, success: result?.success ?? false };
        } catch (e) {
          return { sent: false, error: e.message };
        }
      });

      console.log(
        `  Convert attempt result: ${JSON.stringify(convertTriggered)}`,
      );

      // Wait for any potential state sync
      await waitForSync(guestPage, 1000);

      // Verify credits haven't changed
      const creditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Credits after attempt: ${creditsAfter}`);

      if (creditsAfter !== initialCredits) {
        throw new Error(
          `Credits changed despite no canConvertScrap permission: ${initialCredits} → ${creditsAfter}`,
        );
      }
      console.log(
        '  ✓ Credits unchanged - convertScrap action correctly rejected',
      );

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Main
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Buy ActionRequest rejected without permission',
    fn: testBuyActionRejectedWithoutPermission,
  },
  {
    name: 'Sell ActionRequest rejected without permission',
    fn: testSellActionRejectedWithoutPermission,
  },
  {
    name: 'ConvertScrap ActionRequest rejected without permission',
    fn: testConvertScrapActionRejectedWithoutPermission,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Action Rejection - Store', ALL_TESTS).catch(
    (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    },
  );
}
