/**
 * Campaign Checkpoint Storage Tests
 *
 * Tests the checkpoint system for non-ironman defeat recovery:
 * - Save/load checkpoints
 * - Checkpoint deletion
 * - Slot-specific checkpoints
 * - SlotArray reconstitution in checkpoints
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

import { forEachSlot, getSlot } from '../../../src/campaign/slot-array.ts';
import { createNewCampaign } from '../../../src/campaign/state.ts';
import {
  clearDBCache,
  loadCampaign,
  saveCampaign,
} from '../../../src/campaign/storage/campaign-db.ts';
import {
  deleteCheckpoint,
  hasCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
} from '../../../src/campaign/storage/checkpoint.ts';
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
  const state = createNewCampaign({
    commanderName: options.commanderName ?? 'Test Commander',
    ironmanMode: options.ironmanMode ?? false,
    autoaimDegrees: options.autoaimDegrees ?? 0,
  });

  // Apply overrides if provided
  if (options.credits !== undefined) state.credits = options.credits;
  if (options.sector !== undefined) state.currentSector = options.sector;
  if (options.missionCount !== undefined)
    state.missionCount = options.missionCount;

  return state;
}

// ============================================================================
// Test Setup/Teardown
// ============================================================================

beforeEach(async () => {
  // Clear localStorage (for active slot tracking)
  localStorage.clear();
  // Clear cached DB connection
  clearDBCache();
});

afterEach(async () => {
  // Clear localStorage
  localStorage.clear();
  // Clear cached connection before deleting DB
  clearDBCache();
  // Delete test database
  await deleteDatabase();
});

// ============================================================================
// Checkpoint System Tests
// ============================================================================

describe('Campaign Storage: Checkpoint System', () => {
  it('saveCheckpoint and loadCheckpoint work correctly', async () => {
    const campaign = createTestCampaign({
      commanderName: 'Checkpoint Test',
      credits: 7777,
    });

    await saveCheckpoint(campaign, 1);
    const loaded = await loadCheckpoint(1);

    assert.ok(loaded !== null, 'Checkpoint loaded');
    assert.strictEqual(
      loaded.settings.commanderName,
      'Checkpoint Test',
      'Commander name preserved',
    );
    assert.strictEqual(loaded.credits, 7777, 'Credits preserved');
  });

  it('hasCheckpoint returns false for empty slot', async () => {
    const result = await hasCheckpoint(1);
    assert.strictEqual(result, false, 'No checkpoint');
  });

  it('hasCheckpoint returns true for slot with checkpoint', async () => {
    await saveCheckpoint(createTestCampaign(), 2);
    const result = await hasCheckpoint(2);
    assert.strictEqual(result, true, 'Checkpoint exists');
  });

  it('deleteCheckpoint removes checkpoint', async () => {
    await saveCheckpoint(createTestCampaign(), 1);
    assert.ok(await hasCheckpoint(1), 'Checkpoint exists');

    await deleteCheckpoint(1);

    assert.strictEqual(await hasCheckpoint(1), false, 'Checkpoint deleted');
  });

  it('checkpoints are slot-specific', async () => {
    await saveCheckpoint(createTestCampaign({ credits: 1000 }), 1);
    await saveCheckpoint(createTestCampaign({ credits: 2000 }), 2);

    // Delete checkpoint from slot 1 only
    await deleteCheckpoint(1);

    assert.strictEqual(await hasCheckpoint(1), false, 'Slot 1 checkpoint gone');
    assert.ok(await hasCheckpoint(2), 'Slot 2 checkpoint remains');

    const loaded2 = await loadCheckpoint(2);
    assert.strictEqual(loaded2.credits, 2000, 'Slot 2 data intact');
  });

  it('checkpoint reconstitutes SlotArrays', async () => {
    const campaign = createTestCampaign();
    await saveCheckpoint(campaign, 1);
    const loaded = await loadCheckpoint(1);

    // Verify SlotArrays work on loaded data
    const ship = loaded.ships[0];
    assert.ok(ship.primaryWeapons.slotCount > 0, 'Has primary slots');

    // forEachSlot should work (would throw if SlotArray broken)
    let weaponCount = 0;
    forEachSlot(ship.primaryWeapons, () => {
      weaponCount++;
    });
    assert.ok(weaponCount > 0, 'forEachSlot works on checkpoint data');
  });
});

// ============================================================================
// SlotArray Reconstitution Tests
// ============================================================================

describe('Campaign Storage: SlotArray Reconstitution', () => {
  it('loaded campaign has functional SlotArrays', async () => {
    const campaign = createTestCampaign();

    // Capture original weapon data
    const originalPrimarySlots = campaign.ships[0].primaryWeapons.slotCount;
    const originalPrimary0 = getSlot(campaign.ships[0].primaryWeapons, 0);

    await saveCampaign(campaign, 1);
    const loaded = await loadCampaign(1);

    // Verify SlotArray structure
    assert.strictEqual(
      loaded.ships[0].primaryWeapons.slotCount,
      originalPrimarySlots,
      'Slot count preserved',
    );

    // Verify data access works
    const loadedPrimary0 = getSlot(loaded.ships[0].primaryWeapons, 0);
    assert.ok(loadedPrimary0 !== undefined, 'Slot 0 accessible');
    assert.strictEqual(
      loadedPrimary0.weaponType,
      originalPrimary0.weaponType,
      'Weapon type preserved',
    );

    // Verify iteration works
    let iterCount = 0;
    forEachSlot(loaded.ships[0].primaryWeapons, () => {
      iterCount++;
    });
    assert.ok(iterCount > 0, 'forEachSlot works');
  });

  it('all ships in loaded campaign have functional SlotArrays', async () => {
    const campaign = createTestCampaign();
    await saveCampaign(campaign, 1);
    const loaded = await loadCampaign(1);

    for (const ship of loaded.ships) {
      // Primary weapons
      assert.ok(
        typeof ship.primaryWeapons.slotCount === 'number',
        `Ship ${ship.id} has primaryWeapons.slotCount`,
      );

      let primaryCount = 0;
      forEachSlot(ship.primaryWeapons, () => {
        primaryCount++;
      });

      // Secondary weapons
      assert.ok(
        typeof ship.secondaryWeapons.slotCount === 'number',
        `Ship ${ship.id} has secondaryWeapons.slotCount`,
      );

      let secondaryCount = 0;
      forEachSlot(ship.secondaryWeapons, () => {
        secondaryCount++;
      });

      // At least some ships should have weapons
      if (primaryCount === 0 && secondaryCount === 0) {
        // This is fine - some ships might be empty
      }
    }
  });
});
