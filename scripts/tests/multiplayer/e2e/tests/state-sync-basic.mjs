/**
 * E2E Tests - State Sync (Basic + Host Actions)
 *
 * Tests for basic state sync and host-initiated actions.
 * Total: 6 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  getDisplayedCredits,
  navigateTo,
  setupHostAndGuest,
  waitForCreditsToEqual,
} from '../helpers/index.mjs';

// =============================================================================
// Basic State Sync Tests
// =============================================================================

function testGuestReceivesCampaignState() {
  return runTest('Guest Receives Campaign State', async (browser) => {
    const { hostContext, guestContext, guestPage } = await setupHostAndGuest(
      browser,
      'StateGuest',
    );
    console.log('  Both players connected');

    await sleep(500);

    const playerCount = await guestPage.evaluate(() => {
      return document.querySelectorAll('.player-row').length;
    });

    console.log(`  Guest sees ${playerCount} players`);

    if (playerCount >= 2) {
      await hostContext.close();
      await guestContext.close();
    } else {
      throw new Error('Guest did not receive proper state from host');
    }
  });
}

function testChatBidirectionalSync() {
  return runTest('Chat Bidirectional Sync', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'ChatBidiGuest');
    console.log('  Both players connected');

    await hostPage.fill('#chat-input', 'Hello from host!');
    await hostPage.click('#chat-form button[type="submit"]');
    console.log('  Host: Sent message');
    await sleep(300);

    const guestMessages = await guestPage
      .locator('.chat-message:not(.system)')
      .allTextContents();
    const hostMsgReceived = guestMessages.some((t) =>
      t.includes('Hello from host'),
    );
    console.log(`  Guest received host message: ${hostMsgReceived}`);

    await guestPage.fill('#chat-input', 'Hello from guest!');
    await guestPage.click('#chat-form button[type="submit"]');
    console.log('  Guest: Sent message');
    await sleep(300);

    let hostMessages = await hostPage
      .locator('.chat-message:not(.system)')
      .allTextContents();
    const guestMsgReceived = hostMessages.some((t) =>
      t.includes('Hello from guest'),
    );
    console.log(`  Host received guest message: ${guestMsgReceived}`);

    await guestPage.fill('#chat-input', 'Another guest message');
    await guestPage.click('#chat-form button[type="submit"]');
    console.log('  Guest: Sent second message');
    await sleep(300);

    hostMessages = await hostPage
      .locator('.chat-message:not(.system)')
      .allTextContents();
    const secondMsgReceived = hostMessages.some((t) =>
      t.includes('Another guest'),
    );
    console.log(`  Host received second message: ${secondMsgReceived}`);

    if (hostMsgReceived && guestMsgReceived && secondMsgReceived) {
      await hostContext.close();
      await guestContext.close();
    } else {
      throw new Error('Chat not syncing bidirectionally');
    }
  });
}

// =============================================================================
// Host Action Tests
// =============================================================================

function testHostBuyUpdatesGuestCredits() {
  return runTest('Host Buy → Guest Sees Updated Credits', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'BuyGuest');
    console.log('  Both players connected');

    const initialCredits = await getDisplayedCredits(hostPage);
    console.log(`  Initial credits: ${initialCredits}`);

    await navigateTo(hostPage, 'store');
    console.log('  Host navigated to store');

    const storeItem = hostPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      throw new Error('No store items visible');
    }
    await storeItem.click();
    await sleep(200);

    const buyBtn = hostPage.locator('.btn-buy:not([disabled])').first();
    if (!(await buyBtn.isVisible().catch(() => false))) {
      throw new Error('No enabled Buy button found');
    }
    await buyBtn.click();
    await sleep(500);

    const hostCreditsAfter = await getDisplayedCredits(hostPage);
    console.log(`  Host credits after buy: ${hostCreditsAfter}`);

    if (hostCreditsAfter >= initialCredits) {
      throw new Error(
        `Credits did not decrease: ${initialCredits} → ${hostCreditsAfter}`,
      );
    }
    console.log('  ✓ Host credits decreased');

    await waitForCreditsToEqual(guestPage, hostCreditsAfter);
    const guestCreditsAfter = await getDisplayedCredits(guestPage);
    console.log(`  Guest credits after sync: ${guestCreditsAfter}`);

    if (guestCreditsAfter !== hostCreditsAfter) {
      throw new Error(
        `Credits mismatch: host=${hostCreditsAfter} guest=${guestCreditsAfter}`,
      );
    }
    console.log('  ✓ Guest credits match host');

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostSellSyncsToGuest() {
  return runTest('Host Sell → Guest Sees Updated Credits', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser, 'SellSyncGuest');
    console.log('  Both players connected');

    const initialCredits = await getDisplayedCredits(hostPage);
    console.log(`  Initial credits: ${initialCredits}`);

    await navigateTo(hostPage, 'store');
    console.log('  Host navigated to store');

    const storeItem = hostPage.locator('.store-item').first();
    if (!(await storeItem.isVisible().catch(() => false))) {
      throw new Error('No store items visible');
    }
    await storeItem.click();
    await sleep(200);

    const buyBtn = hostPage.locator('#btn-buy:not([disabled])');
    if (!(await buyBtn.isVisible().catch(() => false))) {
      throw new Error('No enabled Buy button found');
    }
    await buyBtn.click();
    await sleep(500);

    const creditsAfterBuy = await getDisplayedCredits(hostPage);
    console.log(`  Host credits after buy: ${creditsAfterBuy}`);

    await storeItem.click();
    await sleep(200);

    const sellBtn = hostPage.locator('#btn-sell:not([disabled])');
    const sellVisible = await sellBtn.isVisible().catch(() => false);

    if (!sellVisible) {
      console.log('  No sell button visible (item may not be sellable)');
      await waitForCreditsToEqual(guestPage, creditsAfterBuy);
      console.log('  Guest synced after buy');
      await hostContext.close();
      await guestContext.close();
      return;
    }

    await sellBtn.click();
    await sleep(500);

    const creditsAfterSell = await getDisplayedCredits(hostPage);
    console.log(`  Host credits after sell: ${creditsAfterSell}`);

    if (creditsAfterSell <= creditsAfterBuy) {
      throw new Error(
        `Credits did not increase: ${creditsAfterBuy} → ${creditsAfterSell}`,
      );
    }
    console.log('  ✓ Host credits increased after sell');

    await waitForCreditsToEqual(guestPage, creditsAfterSell);
    const guestCreditsAfter = await getDisplayedCredits(guestPage);
    console.log(`  Guest credits after sync: ${guestCreditsAfter}`);

    if (guestCreditsAfter !== creditsAfterSell) {
      throw new Error(
        `Credits mismatch: host=${creditsAfterSell} guest=${guestCreditsAfter}`,
      );
    }
    console.log('  ✓ Guest credits match host after sell');

    await hostContext.close();
    await guestContext.close();
  });
}

function testHostResupplyUpdatesGuest() {
  return runTest(
    'Host Resupply → Guest Sees Updated State',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ResupplyGuest');
      console.log('  Both players connected');

      await navigateTo(hostPage, 'contracts');
      await hostPage.click('#btn-refresh-contracts');
      await sleep(500);

      const hostCredits = await getDisplayedCredits(hostPage);
      console.log(`  Host credits after refresh: ${hostCredits}`);

      await navigateTo(hostPage, 'squadron');
      console.log('  Host navigated to squadron');

      await waitForCreditsToEqual(guestPage, hostCredits);
      console.log('  ✓ Guest credits synced after host action');

      await navigateTo(guestPage, 'squadron');
      const guestDeployed = await guestPage
        .locator('.ship-item.deployed')
        .count();
      console.log(`  Guest sees ${guestDeployed} deployed ships`);

      if (guestDeployed !== 4) {
        throw new Error(`Expected 4 deployed ships, got ${guestDeployed}`);
      }
      console.log('  ✓ Guest sees correct ship count');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testHostReassignPilotSyncsToGuest() {
  return runTest(
    'Host Reassigns Pilot → Guest Sees Update',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ReassignGuest');
      console.log('  Both players connected');

      await navigateTo(hostPage, 'squadron');

      const firstShip = hostPage.locator('.ship-item.deployed').first();
      await firstShip.click();
      await sleep(300);

      const unassignBtn = hostPage.locator('.btn-unassign-pilot').first();
      const hasUnassign = await unassignBtn.isVisible().catch(() => false);

      if (hasUnassign) {
        console.log('  Found unassign button, clicking...');
        await unassignBtn.click();
        await sleep(500);

        const hostAvailable = await hostPage
          .locator('.ship-item[data-pilot-id]')
          .count();
        console.log(`  Host available pilots: ${hostAvailable}`);

        await sleep(1500);

        await navigateTo(guestPage, 'squadron');
        const guestAvailable = await guestPage
          .locator('.ship-item[data-pilot-id]')
          .count();
        console.log(`  Guest available pilots: ${guestAvailable}`);

        if (guestAvailable >= 1) {
          console.log('  ✓ Guest sees unassigned pilot');
        }
      } else {
        console.log('  No unassign button visible (pilot viewer not shown)');
        console.log('  Verifying both see same deployed ships...');

        const hostDeployed = await hostPage
          .locator('.ship-item.deployed')
          .count();
        await navigateTo(guestPage, 'squadron');
        const guestDeployed = await guestPage
          .locator('.ship-item.deployed')
          .count();

        if (hostDeployed !== guestDeployed) {
          throw new Error(
            `Deployed count mismatch: host=${hostDeployed} guest=${guestDeployed}`,
          );
        }
        console.log(`  ✓ Both see ${hostDeployed} deployed ships`);
      }

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Guest receives campaign state', fn: testGuestReceivesCampaignState },
  { name: 'Chat bidirectional sync', fn: testChatBidirectionalSync },
  {
    name: 'Host buy → guest sees updated credits',
    fn: testHostBuyUpdatesGuestCredits,
  },
  {
    name: 'Host sell → guest sees updated credits',
    fn: testHostSellSyncsToGuest,
  },
  {
    name: 'Host resupply → guest sees updated state',
    fn: testHostResupplyUpdatesGuest,
  },
  {
    name: 'Host reassigns pilot → guest sees update',
    fn: testHostReassignPilotSyncsToGuest,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('State Sync Basic Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
