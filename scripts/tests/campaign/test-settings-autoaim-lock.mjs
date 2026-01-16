/**
 * Settings Autoaim Lock Tests
 *
 * Tests that the settings screen correctly locks/unlocks the autoaim setting
 * based on the ACTIVE campaign's ironman status, not just any existing campaign.
 *
 * Key scenarios:
 * - No active campaign -> unlocked
 * - Active standard campaign -> unlocked
 * - Active ironman campaign -> locked
 * - Multiple slots with different modes -> correct detection based on active
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
  getActiveSlotId,
  getSlotMetadata,
  saveCampaign,
  setActiveSlotId,
} from '../../../src/campaign/storage/campaign-db.ts';
import { DB_NAME } from '../../../src/campaign/storage/db-connection.ts';

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
 * Simulate what bindSettingsScreen does to detect ironman status.
 * This mirrors the logic in src/ui/screens/settings/index.ts
 */
async function detectIronmanForSettings() {
  let campaignExists = false;
  let isIronman = false;
  try {
    const activeSlotId = getActiveSlotId();
    if (activeSlotId) {
      const metadata = await getSlotMetadata(activeSlotId);
      campaignExists = metadata.exists;
      isIronman = metadata.ironmanMode ?? false;
    }
  } catch {
    // Ignore errors, assume no campaign
  }
  return { campaignExists, isIronman };
}

// ============================================================================
// Tests
// ============================================================================

describe('Settings Autoaim Lock', () => {
  beforeEach(async () => {
    // Clear database and localStorage before each test
    await deleteDatabase();
    clearDBCache();
    localStorageData.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await deleteDatabase();
    clearDBCache();
    localStorageData.clear();
  });

  describe('no active campaign', () => {
    it('returns unlocked when no campaigns exist', async () => {
      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(campaignExists, false, 'No campaign should exist');
      assert.strictEqual(isIronman, false, 'Should not be ironman');
    });

    it('returns unlocked when campaigns exist but none is active', async () => {
      // Save a campaign to slot 1 but don't set it as active
      const campaign = createTestCampaign({ ironmanMode: true });
      await saveCampaign(campaign, 1);

      // Explicitly clear active slot
      setActiveSlotId(null);

      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(
        campaignExists,
        false,
        'No active campaign should be detected',
      );
      assert.strictEqual(isIronman, false, 'Should not be ironman');
    });
  });

  describe('active standard campaign', () => {
    it('returns unlocked when active campaign is standard mode', async () => {
      // Save standard campaign to slot 1 and set as active
      const campaign = createTestCampaign({ ironmanMode: false });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(campaignExists, true, 'Campaign should exist');
      assert.strictEqual(isIronman, false, 'Should not be ironman');
    });
  });

  describe('active ironman campaign', () => {
    it('returns locked when active campaign is ironman mode', async () => {
      // Save ironman campaign to slot 1 and set as active
      const campaign = createTestCampaign({ ironmanMode: true });
      await saveCampaign(campaign, 1);
      setActiveSlotId(1);

      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(campaignExists, true, 'Campaign should exist');
      assert.strictEqual(isIronman, true, 'Should be ironman');
    });
  });

  describe('multiple campaigns with different modes', () => {
    it('detects standard mode when active, even if other slot is ironman', async () => {
      // Slot 1: Ironman campaign
      const ironmanCampaign = createTestCampaign({
        commanderName: 'Ironman Player',
        ironmanMode: true,
      });
      await saveCampaign(ironmanCampaign, 1);

      // Slot 2: Standard campaign (active)
      const standardCampaign = createTestCampaign({
        commanderName: 'Standard Player',
        ironmanMode: false,
      });
      await saveCampaign(standardCampaign, 2);
      setActiveSlotId(2);

      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(campaignExists, true, 'Campaign should exist');
      assert.strictEqual(
        isIronman,
        false,
        'Should not be ironman (active is standard)',
      );
    });

    it('detects ironman mode when active, even if other slot is standard', async () => {
      // Slot 1: Standard campaign
      const standardCampaign = createTestCampaign({
        commanderName: 'Standard Player',
        ironmanMode: false,
      });
      await saveCampaign(standardCampaign, 1);

      // Slot 2: Ironman campaign (active)
      const ironmanCampaign = createTestCampaign({
        commanderName: 'Ironman Player',
        ironmanMode: true,
      });
      await saveCampaign(ironmanCampaign, 2);
      setActiveSlotId(2);

      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(campaignExists, true, 'Campaign should exist');
      assert.strictEqual(
        isIronman,
        true,
        'Should be ironman (active is ironman)',
      );
    });

    it('correctly detects when switching active campaign', async () => {
      // Create both campaigns
      const standardCampaign = createTestCampaign({
        commanderName: 'Standard',
        ironmanMode: false,
      });
      await saveCampaign(standardCampaign, 1);

      const ironmanCampaign = createTestCampaign({
        commanderName: 'Ironman',
        ironmanMode: true,
      });
      await saveCampaign(ironmanCampaign, 2);

      // Start with slot 1 active (standard)
      setActiveSlotId(1);
      let result = await detectIronmanForSettings();
      assert.strictEqual(result.isIronman, false, 'Slot 1 should be standard');

      // Switch to slot 2 (ironman)
      setActiveSlotId(2);
      result = await detectIronmanForSettings();
      assert.strictEqual(result.isIronman, true, 'Slot 2 should be ironman');

      // Switch back to slot 1 (standard)
      setActiveSlotId(1);
      result = await detectIronmanForSettings();
      assert.strictEqual(
        result.isIronman,
        false,
        'Slot 1 should still be standard',
      );
    });
  });

  describe('edge cases', () => {
    it('handles active slot pointing to empty slot gracefully', async () => {
      // Set active slot to 1, but don't save any campaign there
      setActiveSlotId(1);

      const { campaignExists, isIronman } = await detectIronmanForSettings();

      assert.strictEqual(
        campaignExists,
        false,
        'No campaign should exist in empty slot',
      );
      assert.strictEqual(isIronman, false, 'Should not be ironman');
    });

    it('handles all three slots with different modes', async () => {
      // Slot 1: Standard
      await saveCampaign(createTestCampaign({ ironmanMode: false }), 1);
      // Slot 2: Ironman
      await saveCampaign(createTestCampaign({ ironmanMode: true }), 2);
      // Slot 3: Standard
      await saveCampaign(createTestCampaign({ ironmanMode: false }), 3);

      // Test each slot as active
      setActiveSlotId(1);
      let result = await detectIronmanForSettings();
      assert.strictEqual(result.isIronman, false, 'Slot 1 is standard');

      setActiveSlotId(2);
      result = await detectIronmanForSettings();
      assert.strictEqual(result.isIronman, true, 'Slot 2 is ironman');

      setActiveSlotId(3);
      result = await detectIronmanForSettings();
      assert.strictEqual(result.isIronman, false, 'Slot 3 is standard');
    });
  });
});
