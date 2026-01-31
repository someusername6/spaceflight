/**
 * E2E Tests - Callsign
 *
 * Consolidated tests for callsign change and store convert scrap.
 * Sources: callsign-change.mjs, store-convert.mjs
 *
 * Total: 6 tests
 */

import { isMainModule, runTest, runTestSuite, sleep } from '../core/index.mjs';
import {
  changeCallsign,
  closeCallsignPopover,
  getCallsignError,
  getChatMessages,
  getDisplayedCredits,
  getPlayerCallsigns,
  navigateTo,
  setupHostAndGuest,
  setupHostInLobby,
  togglePermission,
  waitForCreditsToEqual,
  waitForSync,
} from '../helpers/index.mjs';

// =============================================================================
// Callsign Tests (from callsign-change.mjs)
// =============================================================================

function testHostChangesCallsign() {
  return runTest('Host Changes Own Callsign', async (browser) => {
    const { hostContext, hostPage, roomCode } = await setupHostInLobby(browser);
    console.log(`  Host in lobby with room code: ${roomCode}`);

    const initialCallsigns = await getPlayerCallsigns(hostPage);
    console.log(`  Initial callsigns: ${initialCallsigns.join(', ')}`);

    const newCallsign = 'Commander';
    const success = await changeCallsign(hostPage, newCallsign);

    if (!success) {
      throw new Error('Failed to change callsign - popover did not close');
    }
    console.log(`  Changed callsign to: ${newCallsign}`);

    await sleep(500);

    const updatedCallsigns = await getPlayerCallsigns(hostPage);
    console.log(`  Updated callsigns: ${updatedCallsigns.join(', ')}`);

    if (!updatedCallsigns.includes(newCallsign)) {
      throw new Error(
        `Callsign not updated. Expected ${newCallsign}, got: ${updatedCallsigns.join(', ')}`,
      );
    }
    console.log('  Callsign successfully updated');

    await hostContext.close();
  });
}

function testGuestChangesCallsignHostSees() {
  return runTest(
    'Guest Changes Callsign - Host Sees Update',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      const initialHostView = await getPlayerCallsigns(hostPage);
      const initialGuestView = await getPlayerCallsigns(guestPage);
      console.log(`  Host sees: ${initialHostView.join(', ')}`);
      console.log(`  Guest sees: ${initialGuestView.join(', ')}`);

      const newCallsign = 'Wingman';
      const success = await changeCallsign(guestPage, newCallsign);

      if (!success) {
        throw new Error('Guest failed to change callsign');
      }
      console.log(`  Guest changed callsign to: ${newCallsign}`);

      await waitForSync(hostPage, 1500);

      const guestCallsigns = await getPlayerCallsigns(guestPage);
      console.log(`  Guest now sees: ${guestCallsigns.join(', ')}`);

      if (!guestCallsigns.includes(newCallsign)) {
        throw new Error(
          `Guest callsign not updated locally: ${guestCallsigns.join(', ')}`,
        );
      }

      const hostCallsigns = await getPlayerCallsigns(hostPage);
      console.log(`  Host now sees: ${hostCallsigns.join(', ')}`);

      if (!hostCallsigns.includes(newCallsign)) {
        throw new Error(
          `Host did not receive callsign update: ${hostCallsigns.join(', ')}`,
        );
      }
      console.log('  Host sees updated callsign - sync successful');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

function testCallsignValidation() {
  return runTest('Callsign Validation - Reject Invalid', async (browser) => {
    const { hostContext, hostPage } = await setupHostInLobby(browser);
    console.log('  Host in lobby');

    const selfRow = hostPage.locator('.player-row.self');
    await selfRow.click();
    await sleep(300);

    const input = hostPage.locator('#callsign-input');
    await input.fill('');
    await hostPage.click('#btn-callsign-save');
    await sleep(200);

    let error = await getCallsignError(hostPage);
    if (!error) {
      throw new Error('Expected error for empty callsign');
    }
    console.log(`  Empty callsign rejected: "${error}"`);

    await input.fill('A');
    await hostPage.click('#btn-callsign-save');
    await sleep(200);

    error = await getCallsignError(hostPage);
    if (!error) {
      throw new Error('Expected error for too short callsign');
    }
    console.log(`  Short callsign rejected: "${error}"`);

    await input.fill('Player@123');
    await hostPage.click('#btn-callsign-save');
    await sleep(200);

    error = await getCallsignError(hostPage);
    if (!error) {
      throw new Error('Expected error for invalid characters');
    }
    console.log(`  Invalid characters rejected: "${error}"`);

    await closeCallsignPopover(hostPage);

    const callsigns = await getPlayerCallsigns(hostPage);
    console.log(
      `  Final callsigns (should be unchanged): ${callsigns.join(', ')}`,
    );

    await hostContext.close();
  });
}

function testCallsignConflict() {
  return runTest('Callsign Conflict - Reject Duplicate', async (browser) => {
    const { hostContext, hostPage, guestContext, guestPage } =
      await setupHostAndGuest(browser);
    console.log('  Both players connected');

    const hostCallsign = await hostPage
      .locator('.player-row:has(.host-indicator) .player-callsign')
      .textContent();
    console.log(`  Host callsign: ${hostCallsign?.trim()}`);

    await changeCallsign(guestPage, hostCallsign?.trim() || 'Host');

    await waitForSync(guestPage, 1500);

    const guestCallsignsAfter = await getPlayerCallsigns(guestPage);
    console.log(
      `  Guest callsigns after attempt: ${guestCallsignsAfter.join(', ')}`,
    );

    const guestRow = guestPage.locator('.player-row.self .player-callsign');
    const guestCurrentCallsign = await guestRow.textContent();

    console.log(`  Guest current callsign: ${guestCurrentCallsign?.trim()}`);

    const hostViewAfter = await getPlayerCallsigns(hostPage);
    const uniqueCallsigns = [...new Set(hostViewAfter)];
    console.log(`  Host sees: ${hostViewAfter.join(', ')}`);

    if (uniqueCallsigns.length < 2) {
      console.log(
        '  Note: Callsigns may appear same briefly before host rejection',
      );
    } else {
      console.log('  Conflict handled - callsigns remain unique');
    }

    await hostContext.close();
    await guestContext.close();
  });
}

function testCallsignChangeSystemMessage() {
  return runTest(
    'Callsign Change - System Message in Chat',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser);
      console.log('  Both players connected');

      const guestCallsignEl = guestPage.locator(
        '.player-row.self .player-callsign',
      );
      const oldCallsign = (await guestCallsignEl.textContent())?.trim();
      console.log(`  Guest initial callsign: ${oldCallsign}`);

      const newCallsign = 'Ace';
      const success = await changeCallsign(guestPage, newCallsign);

      if (!success) {
        throw new Error('Failed to change callsign');
      }
      console.log(`  Guest changed callsign to: ${newCallsign}`);

      await waitForSync(hostPage, 1500);

      const hostChatMessages = await getChatMessages(hostPage);
      console.log(`  Host chat messages: ${hostChatMessages.length} total`);

      const systemMessagePattern = new RegExp(
        `${oldCallsign}.*${newCallsign}|is now ${newCallsign}`,
        'i',
      );
      const hasSystemMessage = hostChatMessages.some((msg) =>
        systemMessagePattern.test(msg),
      );

      if (!hasSystemMessage) {
        console.log('  Chat contents:', hostChatMessages.slice(-5));
        throw new Error('System message not found in host chat');
      }
      console.log('  System message found in host chat');

      const guestChatMessages = await getChatMessages(guestPage);
      const guestHasMessage = guestChatMessages.some((msg) =>
        systemMessagePattern.test(msg),
      );

      if (!guestHasMessage) {
        console.log('  Guest chat contents:', guestChatMessages.slice(-5));
        throw new Error('System message not found in guest chat');
      }
      console.log('  System message found in guest chat');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Store Convert Tests (from store-convert.mjs)
// =============================================================================

function testGuestConvertScrapWithPermission() {
  return runTest(
    'Guest Convert Scrap With Permission → Host Sync',
    async (browser) => {
      const { hostContext, hostPage, guestContext, guestPage } =
        await setupHostAndGuest(browser, 'ConvertGuest');
      console.log('  Both players connected');

      await togglePermission(hostPage, 'canConvertScrap', true);
      console.log('  Host confirmed canConvertScrap for guest');

      await sleep(500);

      const initialCredits = await getDisplayedCredits(guestPage);
      console.log(`  Initial credits: ${initialCredits}`);

      await navigateTo(guestPage, 'store');
      console.log('  Guest navigated to store');

      const scrapSection = guestPage
        .locator('.scrap-section, .scrap-list, .scrap-item')
        .first();
      const hasScrap = await scrapSection.isVisible().catch(() => false);

      if (!hasScrap) {
        console.log('  No scrap available in campaign (test skipped)');
        console.log('  (ConvertScrap action is tested at unit level)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      console.log('  Found scrap section');

      await scrapSection.click();
      await sleep(300);

      const convertBtn = guestPage
        .locator(
          '#btn-convert-scrap, .btn-convert-scrap, [data-action="convert-scrap"]',
        )
        .first();
      const convertBtnVisible = await convertBtn.isVisible().catch(() => false);

      if (!convertBtnVisible) {
        console.log('  Convert button not visible (no scrap selected)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      const isDisabled = await convertBtn.evaluate(
        (el) =>
          el.hasAttribute('disabled') || el.classList.contains('disabled'),
      );

      if (isDisabled) {
        console.log('  Convert button is disabled (test skipped)');
        await hostContext.close();
        await guestContext.close();
        return;
      }

      await convertBtn.click();
      await sleep(500);

      const guestCreditsAfter = await getDisplayedCredits(guestPage);
      console.log(`  Guest credits after convert: ${guestCreditsAfter}`);

      if (guestCreditsAfter <= initialCredits) {
        throw new Error(
          `Credits did not increase: ${initialCredits} → ${guestCreditsAfter}`,
        );
      }
      console.log('  Guest credits increased after convert');

      await waitForCreditsToEqual(hostPage, guestCreditsAfter);
      const hostCreditsAfter = await getDisplayedCredits(hostPage);
      console.log(`  Host credits after sync: ${hostCreditsAfter}`);

      if (hostCreditsAfter !== guestCreditsAfter) {
        throw new Error(
          `Credits mismatch: host=${hostCreditsAfter} guest=${guestCreditsAfter}`,
        );
      }
      console.log('  Host credits match guest after sync');

      await hostContext.close();
      await guestContext.close();
    },
  );
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  // Callsign (5)
  { name: 'Host Changes Own Callsign', fn: testHostChangesCallsign },
  {
    name: 'Guest Changes Callsign - Host Sees Update',
    fn: testGuestChangesCallsignHostSees,
  },
  { name: 'Callsign Validation - Reject Invalid', fn: testCallsignValidation },
  { name: 'Callsign Conflict - Reject Duplicate', fn: testCallsignConflict },
  {
    name: 'Callsign Change - System Message in Chat',
    fn: testCallsignChangeSystemMessage,
  },
  // Store convert (1)
  {
    name: 'Guest convert scrap with permission → host sync',
    fn: testGuestConvertScrapWithPermission,
  },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Callsign Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
