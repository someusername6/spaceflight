/**
 * E2E Tests - Auto-Unready
 *
 * Tests for automatic unready triggers on loadout changes.
 * Total: 1 test (ship reassignment not testable via current UI)
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  VITE_URL,
} from '../core/index.mjs';

// =============================================================================
// Helper: Setup host in lobby with ready state
// =============================================================================

async function setupHostInLobby(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', (err) => console.log(`  [Page Error] ${err.message}`));

  await page.goto(VITE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-host-game', {
    state: 'visible',
    timeout: 15000,
  });
  await page.click('#btn-host-game');
  await page.waitForSelector('.saves-list', {
    state: 'visible',
    timeout: 5000,
  });

  const occupiedSlot = await page.locator('.save-slot.occupied').first();
  if (await occupiedSlot.isVisible().catch(() => false)) {
    await occupiedSlot.click();
  } else {
    await page.locator('.save-slot.empty').first().click();
    await page.waitForSelector('.campaign-create-modal', {
      state: 'visible',
      timeout: 5000,
    });
    await page.click('#btn-start');
  }

  await page.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });
  console.log('  In lobby');

  return { context, page };
}

async function setReadyState(page, ready = true) {
  // Check current ready state
  const isCurrentlyReady = await page.evaluate(() => {
    const readyBtn = document.querySelector('#btn-ready');
    return readyBtn?.classList.contains('ready-active');
  });

  if (isCurrentlyReady !== ready) {
    await page.click('#btn-ready');
    // Wait for state to update
    await page.waitForFunction(
      (targetReady) => {
        const btn = document.querySelector('#btn-ready');
        return btn?.classList.contains('ready-active') === targetReady;
      },
      ready,
      { timeout: 5000 },
    );
  }

  console.log(`  Ready state set to: ${ready}`);
}

async function isPlayerReady(page) {
  return page.evaluate(() => {
    const readyBtn = document.querySelector('#btn-ready');
    return readyBtn?.classList.contains('ready-active') ?? false;
  });
}

// =============================================================================
// Tests
// =============================================================================

function testLoadoutChangeTriggersUnready() {
  return runTest('Loadout change triggers auto-unready', async (browser) => {
    const { context, page } = await setupHostInLobby(browser);

    // Set ready state
    await setReadyState(page, true);
    const readyBefore = await isPlayerReady(page);
    if (!readyBefore) {
      throw new Error('Failed to set ready state');
    }
    console.log('  Player is ready: true');

    // Navigate to squadron screen
    await page.click('[data-nav="squadron"]');
    await page.waitForSelector('.squadron-screen', {
      state: 'visible',
      timeout: 10000,
    });
    console.log('  On squadron screen');

    // Wait for squadron list to render with deployed ships
    await page.waitForSelector('[data-deployed-id]', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Squadron list visible');

    // Click on first deployed ship to select it
    await page.click('[data-deployed-id]');
    console.log('  Clicked deployed ship');

    // Wait for ship viewer schematic to appear
    await page.waitForSelector('.schematic-diagram', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Ship viewer schematic visible');

    // Get initial slot counts
    const slotInfoBefore = await page.evaluate(() => {
      const filled = document.querySelectorAll('.schematic-slot.filled');
      const empty = document.querySelectorAll('.schematic-slot.empty');
      return {
        filledCount: filled.length,
        emptyCount: empty.length,
      };
    });
    console.log(
      `  Before: ${slotInfoBefore.filledCount} filled, ${slotInfoBefore.emptyCount} empty`,
    );

    if (slotInfoBefore.filledCount === 0) {
      throw new Error('No filled weapon slots to test with');
    }

    // Click a filled slot to show popover
    await page.click('.schematic-slot.filled');
    console.log('  Clicked filled weapon slot');

    // Wait for popover to appear
    await page.waitForSelector('.weapon-popover', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Popover visible');

    // Click unequip button
    const unequipBtn = page.locator('.btn-unequip');
    if (!(await unequipBtn.isVisible().catch(() => false))) {
      throw new Error('Unequip button not visible in popover');
    }

    await unequipBtn.click();
    console.log('  Clicked unequip button');

    // Wait for popover to close (unequip should trigger closeAll)
    await page.waitForSelector('.weapon-popover', {
      state: 'hidden',
      timeout: 5000,
    });
    console.log('  Popover closed');

    // Verify the loadout actually changed
    const slotInfoAfter = await page.evaluate(() => {
      const filled = document.querySelectorAll('.schematic-slot.filled');
      const empty = document.querySelectorAll('.schematic-slot.empty');
      return {
        filledCount: filled.length,
        emptyCount: empty.length,
      };
    });
    console.log(
      `  After: ${slotInfoAfter.filledCount} filled, ${slotInfoAfter.emptyCount} empty`,
    );

    if (
      slotInfoAfter.filledCount >= slotInfoBefore.filledCount &&
      slotInfoAfter.emptyCount <= slotInfoBefore.emptyCount
    ) {
      throw new Error(
        'Loadout change did not occur (same number of filled slots)',
      );
    }

    console.log('  Loadout change confirmed');

    // Navigate back to lobby
    await page.click('[data-nav="lobby"]');
    await page.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 10000,
    });
    console.log('  Back in lobby');

    // ASSERT: Player should be unreadied after loadout change
    const readyAfter = await isPlayerReady(page);
    console.log(`  Player ready state after loadout change: ${readyAfter}`);

    if (readyAfter) {
      throw new Error(
        'Player should be auto-unreadied after loadout change, but is still ready',
      );
    }
    console.log('  VERIFIED: Auto-unready triggered on loadout change');

    await context.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Loadout change unready', fn: testLoadoutChangeTriggersUnready },
  // Ship reassignment test removed - UI doesn't have ship assignment controls
  // in the host popover. Ship assignment happens automatically when guests join
  // or via squadron screen pilot assignment, which is complex to test in E2E.
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Auto-Unready Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
