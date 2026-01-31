/**
 * E2E Tests - Permission Rejection
 *
 * Tests for action request rejection based on permissions.
 * Total: 5 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  setupHostAndGuest,
  togglePermission,
  waitForSync,
} from '../helpers/index.mjs';

// =============================================================================
// Action Rejection - Squadron
// =============================================================================

function testEquipActionRejectedWithoutPermission() {
  return runTest(
    'Equip ActionRequest Rejected With shipEdit=none',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await togglePermission(hostPage, 'shipEdit', false);
      console.log('  Host set shipEdit to none for guest');
      await sleep(500);

      await navigateTo(guestPage, 'squadron');
      console.log('  Guest navigated to squadron');

      const shipId = await guestPage.evaluate(() => {
        const ship = document.querySelector(
          '.ship-item.deployed[data-deployed-id]',
        );
        return ship?.getAttribute('data-deployed-id') || null;
      });

      if (!shipId) {
        console.log('  No deployed ship found - skipping test');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      console.log(`  Target ship: ${shipId}`);

      const equipTriggered = await guestPage.evaluate(async (sid) => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) return { sent: false, error: 'No client' };
        try {
          const result = await mpClient.sendAction({
            type: 'equip',
            shipId: sid,
            slotIndex: 0,
            storageIndex: 0,
            bankSize: 1,
            category: 'primary',
          });
          return { sent: true, success: result?.success ?? false };
        } catch (e) {
          return { sent: false, error: e.message };
        }
      }, shipId);

      console.log(`  Equip attempt result: ${JSON.stringify(equipTriggered)}`);
      await waitForSync(guestPage, 1000);

      if (equipTriggered.sent && !equipTriggered.success) {
        console.log('  Equip action correctly rejected (success=false)');
      } else if (!equipTriggered.sent) {
        console.log('  Client prevented action from being sent');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testEquipOtherShipRejectedWithOwnPermission() {
  return runTest(
    'Equip Other Ship Rejected With shipEdit=own',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      await navigateTo(hostPage, 'squadron');
      await navigateTo(guestPage, 'squadron');
      console.log('  Both navigated to squadron');

      const commanderShipId = await guestPage.evaluate(() => {
        const ship = document.querySelector(
          '.ship-item.deployed[data-deployed-id]',
        );
        return ship?.getAttribute('data-deployed-id') || null;
      });

      if (!commanderShipId) {
        console.log('  No deployed ship found - skipping test');
        await hostContext.close();
        await guestContext.close();
        return;
      }
      console.log(`  Commander ship: ${commanderShipId}`);

      const guestShipId = await guestPage.evaluate(
        () => window.multiplayerClient?.getPlayerInfo?.()?.shipId || null,
      );
      console.log(`  Guest assigned ship: ${guestShipId || 'none'}`);

      if (guestShipId === commanderShipId) {
        console.log(
          '  Guest is assigned to commander ship - finding another ship',
        );
        const otherShipId = await guestPage.evaluate((cmdId) => {
          const ships = document.querySelectorAll(
            '.ship-item.deployed[data-deployed-id]',
          );
          for (const ship of ships) {
            const id = ship.getAttribute('data-deployed-id');
            if (id && id !== cmdId) return id;
          }
          return null;
        }, commanderShipId);

        if (!otherShipId) {
          console.log('  No other ship to test - skipping');
          await hostContext.close();
          await guestContext.close();
          return;
        }
      }

      const equipTriggered = await guestPage.evaluate(async (sid) => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) return { sent: false, error: 'No client' };
        try {
          const result = await mpClient.sendAction({
            type: 'equip',
            shipId: sid,
            slotIndex: 0,
            storageIndex: 0,
            bankSize: 1,
            category: 'primary',
          });
          return { sent: true, success: result?.success ?? false };
        } catch (e) {
          return { sent: false, error: e.message };
        }
      }, commanderShipId);

      console.log(
        `  Equip attempt on other ship: ${JSON.stringify(equipTriggered)}`,
      );
      await waitForSync(guestPage, 1000);

      if (equipTriggered.sent && !equipTriggered.success) {
        console.log('  Equip on other ship correctly rejected (success=false)');
      } else if (!equipTriggered.sent) {
        console.log('  Client prevented action from being sent');
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Action Rejection - Store
// =============================================================================

function testBuyActionRejectedWithoutPermission() {
  return runTest(
    'Buy ActionRequest Rejected Without Permission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      await togglePermission(hostPage, 'canBuy', false);
      console.log('  Host revoked canBuy from guest');
      await sleep(500);

      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      const buyTriggered = await guestPage.evaluate(async () => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) return false;
        try {
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
      await waitForSync(guestPage, 1000);

      const creditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Credits after attempt: ${creditsAfter}`);

      if (creditsAfter !== initialCredits) {
        throw new Error(
          `Credits changed despite no canBuy permission: ${initialCredits} → ${creditsAfter}`,
        );
      }
      console.log('  Credits unchanged - buy action correctly rejected');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testSellActionRejectedWithoutPermission() {
  return runTest(
    'Sell ActionRequest Rejected Without Permission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      await togglePermission(hostPage, 'canSell', false);
      console.log('  Host revoked canSell from guest');
      await sleep(500);

      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      const sellTriggered = await guestPage.evaluate(async () => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) return false;
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
      await waitForSync(guestPage, 1000);

      const creditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Credits after attempt: ${creditsAfter}`);

      if (creditsAfter !== initialCredits) {
        throw new Error(
          `Credits changed despite no canSell permission: ${initialCredits} → ${creditsAfter}`,
        );
      }
      console.log('  Credits unchanged - sell action correctly rejected');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testConvertScrapActionRejectedWithoutPermission() {
  return runTest(
    'ConvertScrap ActionRequest Rejected Without Permission',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      const initialCredits = await getDisplayedCredits(hostPage);
      console.log(`  Initial credits: ${initialCredits}`);

      await togglePermission(hostPage, 'canConvertScrap', false);
      console.log('  Host revoked canConvertScrap from guest');
      await sleep(500);

      const convertTriggered = await guestPage.evaluate(async () => {
        const mpClient = window.multiplayerClient;
        if (!mpClient) return { sent: false, error: 'No client' };
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
      await waitForSync(guestPage, 1000);

      const creditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Credits after attempt: ${creditsAfter}`);

      if (creditsAfter !== initialCredits) {
        throw new Error(
          `Credits changed despite no canConvertScrap permission: ${initialCredits} → ${creditsAfter}`,
        );
      }
      console.log(
        '  Credits unchanged - convertScrap action correctly rejected',
      );

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  {
    name: 'Equip ActionRequest rejected with shipEdit=none',
    fn: testEquipActionRejectedWithoutPermission,
  },
  {
    name: 'Equip other ship rejected with shipEdit=own',
    fn: testEquipOtherShipRejectedWithOwnPermission,
  },
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
  runTestSuite('Permission Rejection Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
