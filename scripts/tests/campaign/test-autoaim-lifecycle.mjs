/**
 * Autoaim Value Lifecycle Tests
 *
 * Tests the full lifecycle of the autoaim value:
 * - Syncing from campaign to global setting on load
 * - Syncing from global setting to campaign state when changed
 * - Ironman protection (changes blocked for ironman campaigns)
 * - Persistence through save/load cycles
 *
 * Uses fake-indexeddb to mock IndexedDB in Node.js.
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

// Must install polyfills BEFORE importing storage modules
import 'fake-indexeddb/auto';

// Simple localStorage polyfill for Node.js
const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
  clear: () => localStorageData.clear(),
  get length() {
    return localStorageData.size;
  },
  key: (index) => [...localStorageData.keys()][index] ?? null,
};

import { createNewCampaign } from '../../../src/campaign/state.ts';
import {
  clearDBCache,
  loadCampaign,
  saveCampaign,
  setActiveSlotId,
} from '../../../src/campaign/storage/campaign-db.ts';
import { DB_NAME } from '../../../src/campaign/storage/db-connection.ts';
import {
  getPlayerAutoaim,
  initGameSettings,
  setPlayerAutoaim,
} from '../../../src/settings/game-settings.ts';

// ============================================================================
// Test Utilities
// ============================================================================

/** Delete the test database between tests */
async function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/** Create a minimal campaign state for testing */
function createTestCampaign(options = {}) {
  return createNewCampaign({
    commanderName: options.commanderName ?? 'Test Commander',
    ironmanMode: options.ironmanMode ?? false,
    autoaimDegrees: options.autoaimDegrees ?? 2.5,
  });
}

/**
 * Simulate syncAutoaimFromCampaign (from menu-handlers.ts)
 * This is called when loading a campaign.
 */
function syncAutoaimFromCampaign(state) {
  setPlayerAutoaim(state.settings.autoaimDegrees);
}

/**
 * Simulate the onAutoaimChanged callback (from menu-handlers.ts)
 * This is called when user changes autoaim in settings.
 * Returns the new state if updated, or null if blocked (ironman).
 */
function simulateAutoaimChange(currentState, newDegrees) {
  // This mirrors the logic in menu-handlers.ts onAutoaimChanged callback
  if (currentState && !currentState.settings.ironmanMode) {
    return {
      ...currentState,
      settings: {
        ...currentState.settings,
        autoaimDegrees: newDegrees,
      },
    };
  }
  return null; // Blocked for ironman
}

// ============================================================================
// Tests
// ============================================================================

describe('Autoaim Value Lifecycle', () => {
  beforeEach(async () => {
    // Clear database and localStorage before each test
    await deleteDatabase();
    clearDBCache();
    localStorageData.clear();
    // Initialize game settings (loads from empty localStorage)
    initGameSettings();
  });

  afterEach(async () => {
    // Clean up after each test
    await deleteDatabase();
    clearDBCache();
    localStorageData.clear();
  });

  describe('sync from campaign on load', () => {
    it('global setting is synced from campaign on load', async () => {
      // Create campaign with autoaim=5
      const campaign = createTestCampaign({ autoaimDegrees: 5 });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      // Set global to different value
      setPlayerAutoaim(0);
      assert.strictEqual(getPlayerAutoaim(), 0, 'Global should be 0 initially');

      // Simulate loading campaign (which calls syncAutoaimFromCampaign)
      const loaded = await loadCampaign(1);
      syncAutoaimFromCampaign(loaded);

      // Global should now match campaign
      assert.strictEqual(
        getPlayerAutoaim(),
        5,
        'Global should be synced to campaign value',
      );
    });

    it('sync works for all valid autoaim values', async () => {
      const values = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

      for (const value of values) {
        const campaign = createTestCampaign({ autoaimDegrees: value });
        await saveCampaign(campaign, 1);

        // Reset global to 0
        setPlayerAutoaim(0);

        // Load and sync
        const loaded = await loadCampaign(1);
        syncAutoaimFromCampaign(loaded);

        assert.strictEqual(
          getPlayerAutoaim(),
          value,
          `Global should be ${value} after sync`,
        );
      }
    });
  });

  describe('sync to campaign on change (non-ironman)', () => {
    it('campaign state is updated when autoaim changes', () => {
      const campaign = createTestCampaign({
        ironmanMode: false,
        autoaimDegrees: 2.5,
      });

      // Simulate user changing autoaim to 5
      const newState = simulateAutoaimChange(campaign, 5);

      assert.ok(newState, 'State should be updated');
      assert.strictEqual(
        newState.settings.autoaimDegrees,
        5,
        'Campaign autoaim should be updated',
      );
      // Original should be unchanged (immutable update)
      assert.strictEqual(
        campaign.settings.autoaimDegrees,
        2.5,
        'Original should be unchanged',
      );
    });

    it('updated campaign state persists through save/load', async () => {
      // Create campaign with autoaim=2.5
      const campaign = createTestCampaign({
        ironmanMode: false,
        autoaimDegrees: 2.5,
      });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      // Simulate user changing autoaim to 5
      const newState = simulateAutoaimChange(campaign, 5);
      assert.ok(newState, 'State should be updated');

      // Save the updated state
      await saveCampaign(newState, 1);

      // Load and verify
      const loaded = await loadCampaign(1);
      assert.strictEqual(
        loaded.settings.autoaimDegrees,
        5,
        'Loaded campaign should have new autoaim value',
      );
    });
  });

  describe('ironman protection', () => {
    it('autoaim change is blocked for ironman campaign', () => {
      const campaign = createTestCampaign({
        ironmanMode: true,
        autoaimDegrees: 2.5,
      });

      // Attempt to change autoaim
      const newState = simulateAutoaimChange(campaign, 5);

      assert.strictEqual(
        newState,
        null,
        'Change should be blocked for ironman',
      );
    });

    it('ironman campaign preserves original autoaim through simulated change attempt', async () => {
      const campaign = createTestCampaign({
        ironmanMode: true,
        autoaimDegrees: 2.5,
      });
      await saveCampaign(campaign, 1);

      // Attempt to change (should be blocked)
      const newState = simulateAutoaimChange(campaign, 5);
      assert.strictEqual(newState, null, 'Change should be blocked');

      // Save original (not the null result!)
      // In real code, the callback returns early so save never happens with changed value

      // Load and verify original value preserved
      const loaded = await loadCampaign(1);
      assert.strictEqual(
        loaded.settings.autoaimDegrees,
        2.5,
        'Ironman campaign should preserve original autoaim',
      );
    });

    it('global setting change does not affect ironman campaign state', async () => {
      const campaign = createTestCampaign({
        ironmanMode: true,
        autoaimDegrees: 2.5,
      });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      // Even if global setting somehow changes, campaign should not be updated
      setPlayerAutoaim(5);
      assert.strictEqual(getPlayerAutoaim(), 5, 'Global was changed');

      // Attempt to update campaign (should be blocked by ironman check)
      const newState = simulateAutoaimChange(campaign, 5);
      assert.strictEqual(newState, null, 'Update should be blocked');

      // Campaign in DB should still have original value
      const loaded = await loadCampaign(1);
      assert.strictEqual(
        loaded.settings.autoaimDegrees,
        2.5,
        'Campaign should be unchanged',
      );
    });
  });

  describe('full lifecycle scenarios', () => {
    it('create → change → save → reload preserves change (non-ironman)', async () => {
      // Step 1: Create campaign with autoaim=2.5
      const campaign = createTestCampaign({
        ironmanMode: false,
        autoaimDegrees: 2.5,
      });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      // Step 2: Sync global from campaign (simulating load)
      syncAutoaimFromCampaign(campaign);
      assert.strictEqual(getPlayerAutoaim(), 2.5);

      // Step 3: User changes autoaim in settings to 5
      setPlayerAutoaim(5);
      const updatedState = simulateAutoaimChange(campaign, 5);

      // Step 4: Save updated state (simulating autosave)
      await saveCampaign(updatedState, 1);

      // Step 5: Quit and reload (clear global, load from DB)
      setPlayerAutoaim(0); // Simulate fresh start
      const reloaded = await loadCampaign(1);
      syncAutoaimFromCampaign(reloaded);

      // Verify: global should be 5 (the changed value)
      assert.strictEqual(
        getPlayerAutoaim(),
        5,
        'Global should have persisted change',
      );
      assert.strictEqual(
        reloaded.settings.autoaimDegrees,
        5,
        'Campaign should have persisted change',
      );
    });

    it('create → attempt change → reload preserves original (ironman)', async () => {
      // Step 1: Create ironman campaign with autoaim=2.5
      const campaign = createTestCampaign({
        ironmanMode: true,
        autoaimDegrees: 2.5,
      });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      // Step 2: Sync global from campaign
      syncAutoaimFromCampaign(campaign);
      assert.strictEqual(getPlayerAutoaim(), 2.5);

      // Step 3: Attempt to change (blocked by ironman)
      const updatedState = simulateAutoaimChange(campaign, 5);
      assert.strictEqual(updatedState, null, 'Change blocked');

      // Step 4: Since change was blocked, original state is saved
      // (In real code, the callback returns null so the state isn't updated)

      // Step 5: Reload
      setPlayerAutoaim(0);
      const reloaded = await loadCampaign(1);
      syncAutoaimFromCampaign(reloaded);

      // Verify: original value preserved
      assert.strictEqual(
        getPlayerAutoaim(),
        2.5,
        'Global should have original value',
      );
      assert.strictEqual(
        reloaded.settings.autoaimDegrees,
        2.5,
        'Campaign should have original value',
      );
    });

    it('switching between campaigns loads correct autoaim', async () => {
      // Create two campaigns with different autoaim values
      const campaign1 = createTestCampaign({
        commanderName: 'Player 1',
        autoaimDegrees: 1,
      });
      const campaign2 = createTestCampaign({
        commanderName: 'Player 2',
        autoaimDegrees: 4,
      });

      await saveCampaign(campaign1, 1);
      await saveCampaign(campaign2, 2);

      // Load campaign 1
      setActiveSlotId(1);
      let loaded = await loadCampaign(1);
      syncAutoaimFromCampaign(loaded);
      assert.strictEqual(getPlayerAutoaim(), 1, 'Campaign 1 autoaim');

      // Switch to campaign 2
      setActiveSlotId(2);
      loaded = await loadCampaign(2);
      syncAutoaimFromCampaign(loaded);
      assert.strictEqual(getPlayerAutoaim(), 4, 'Campaign 2 autoaim');

      // Switch back to campaign 1
      setActiveSlotId(1);
      loaded = await loadCampaign(1);
      syncAutoaimFromCampaign(loaded);
      assert.strictEqual(getPlayerAutoaim(), 1, 'Back to campaign 1 autoaim');
    });
  });
});
