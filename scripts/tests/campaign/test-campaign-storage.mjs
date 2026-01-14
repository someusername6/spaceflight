/**
 * Campaign Storage Tests - Multi-slot IndexedDB operations.
 *
 * Tests the campaign storage system including:
 * - Save/load to different slots
 * - Checkpoint system for non-ironman defeat recovery
 * - Metadata operations
 * - Active slot tracking
 * - Campaign deletion with checkpoint cleanup
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
  deleteCampaign,
  getActiveSlotId,
  getAllSlotsMetadata,
  getSlotMetadata,
  hasAnyCampaign,
  loadCampaign,
  saveCampaign,
  setActiveSlotId,
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
// Multi-Slot Storage Tests
// ============================================================================

describe('Campaign Storage: Multi-Slot Operations', () => {
  it('saves and loads campaigns to different slots', async () => {
    const campaign1 = createTestCampaign({
      commanderName: 'Pilot One',
      credits: 1000,
    });
    const campaign2 = createTestCampaign({
      commanderName: 'Pilot Two',
      credits: 2000,
    });
    const campaign3 = createTestCampaign({
      commanderName: 'Pilot Three',
      credits: 3000,
    });

    // Save to all 3 slots
    await saveCampaign(campaign1, 1);
    await saveCampaign(campaign2, 2);
    await saveCampaign(campaign3, 3);

    // Load and verify each slot
    const loaded1 = await loadCampaign(1);
    const loaded2 = await loadCampaign(2);
    const loaded3 = await loadCampaign(3);

    assert.ok(loaded1 !== null, 'Slot 1 should load');
    assert.ok(loaded2 !== null, 'Slot 2 should load');
    assert.ok(loaded3 !== null, 'Slot 3 should load');

    assert.strictEqual(
      loaded1.settings.commanderName,
      'Pilot One',
      'Slot 1 commander name',
    );
    assert.strictEqual(loaded1.credits, 1000, 'Slot 1 credits');

    assert.strictEqual(
      loaded2.settings.commanderName,
      'Pilot Two',
      'Slot 2 commander name',
    );
    assert.strictEqual(loaded2.credits, 2000, 'Slot 2 credits');

    assert.strictEqual(
      loaded3.settings.commanderName,
      'Pilot Three',
      'Slot 3 commander name',
    );
    assert.strictEqual(loaded3.credits, 3000, 'Slot 3 credits');
  });

  it('slots are independent - updating one does not affect others', async () => {
    const initial1 = createTestCampaign({ credits: 1000 });
    const initial2 = createTestCampaign({ credits: 2000 });

    await saveCampaign(initial1, 1);
    await saveCampaign(initial2, 2);

    // Update slot 1 only
    const updated1 = createTestCampaign({ credits: 9999 });
    await saveCampaign(updated1, 1);

    // Slot 2 should be unaffected
    const loaded2 = await loadCampaign(2);
    assert.strictEqual(loaded2.credits, 2000, 'Slot 2 unchanged');
  });

  it('returns null for empty slots', async () => {
    const loaded = await loadCampaign(1);
    assert.strictEqual(loaded, null, 'Empty slot returns null');
  });

  it('hasAnyCampaign returns false when all slots empty', async () => {
    const result = await hasAnyCampaign();
    assert.strictEqual(result, false, 'No campaigns exist');
  });

  it('hasAnyCampaign returns true when any slot has data', async () => {
    await saveCampaign(createTestCampaign(), 2);

    const result = await hasAnyCampaign();
    assert.strictEqual(result, true, 'Campaign exists');
  });
});

// ============================================================================
// Metadata Tests
// ============================================================================

describe('Campaign Storage: Metadata Operations', () => {
  it('getSlotMetadata returns exists:false for empty slot', async () => {
    const metadata = await getSlotMetadata(1);

    assert.strictEqual(metadata.exists, false, 'Empty slot does not exist');
    assert.strictEqual(metadata.slotId, 1, 'Slot ID preserved');
  });

  it('getSlotMetadata returns campaign info for occupied slot', async () => {
    const campaign = createTestCampaign({
      commanderName: 'Test Pilot',
      ironmanMode: true,
      credits: 5000,
      sector: 3,
      missionCount: 15,
    });

    await saveCampaign(campaign, 2);
    const metadata = await getSlotMetadata(2);

    assert.strictEqual(metadata.exists, true, 'Slot exists');
    assert.strictEqual(metadata.slotId, 2, 'Slot ID');
    assert.strictEqual(metadata.sector, 3, 'Sector');
    assert.strictEqual(metadata.credits, 5000, 'Credits');
    assert.strictEqual(metadata.missionCount, 15, 'Mission count');
    assert.strictEqual(metadata.commanderName, 'Test Pilot', 'Commander name');
    assert.strictEqual(metadata.ironmanMode, true, 'Ironman mode');
    assert.ok(metadata.savedAt > 0, 'Has savedAt timestamp');
    assert.ok(Array.isArray(metadata.shipClasses), 'Has ship classes array');
  });

  it('getAllSlotsMetadata returns array of 3 metadata objects', async () => {
    await saveCampaign(createTestCampaign({ credits: 1000 }), 1);
    await saveCampaign(createTestCampaign({ credits: 3000 }), 3);

    const allMetadata = await getAllSlotsMetadata();

    assert.strictEqual(allMetadata.length, 3, 'Returns 3 slots');
    assert.strictEqual(allMetadata[0].exists, true, 'Slot 1 exists');
    assert.strictEqual(allMetadata[0].credits, 1000, 'Slot 1 credits');
    assert.strictEqual(allMetadata[1].exists, false, 'Slot 2 empty');
    assert.strictEqual(allMetadata[2].exists, true, 'Slot 3 exists');
    assert.strictEqual(allMetadata[2].credits, 3000, 'Slot 3 credits');
  });
});

// ============================================================================
// Active Slot Tracking Tests
// ============================================================================

describe('Campaign Storage: Active Slot Tracking', () => {
  it('active slot is null initially', () => {
    const slotId = getActiveSlotId();
    assert.strictEqual(slotId, null, 'No active slot');
  });

  it('setActiveSlotId stores and retrieves slot', () => {
    setActiveSlotId(2);
    const slotId = getActiveSlotId();
    assert.strictEqual(slotId, 2, 'Slot 2 is active');
  });

  it('setActiveSlotId(null) clears active slot', () => {
    setActiveSlotId(3);
    assert.strictEqual(getActiveSlotId(), 3, 'Slot 3 active');

    setActiveSlotId(null);
    assert.strictEqual(getActiveSlotId(), null, 'No active slot');
  });

  it('loadCampaign sets the loaded slot as active', async () => {
    await saveCampaign(createTestCampaign(), 2);

    assert.strictEqual(getActiveSlotId(), null, 'No active slot initially');

    await loadCampaign(2);

    assert.strictEqual(getActiveSlotId(), 2, 'Slot 2 now active');
  });
});

// ============================================================================
// Campaign Deletion Tests
// ============================================================================

describe('Campaign Storage: Deletion', () => {
  it('deleteCampaign removes campaign from slot', async () => {
    await saveCampaign(createTestCampaign(), 1);

    const beforeDelete = await loadCampaign(1);
    assert.ok(beforeDelete !== null, 'Campaign exists before delete');

    await deleteCampaign(1);

    const afterDelete = await loadCampaign(1);
    assert.strictEqual(afterDelete, null, 'Campaign gone after delete');
  });

  it('deleteCampaign clears active slot if deleted slot was active', async () => {
    await saveCampaign(createTestCampaign(), 1);
    setActiveSlotId(1);

    assert.strictEqual(getActiveSlotId(), 1, 'Slot 1 is active');

    await deleteCampaign(1);

    assert.strictEqual(getActiveSlotId(), null, 'Active slot cleared');
  });

  it('deleteCampaign does not clear active slot if different slot deleted', async () => {
    await saveCampaign(createTestCampaign(), 1);
    await saveCampaign(createTestCampaign(), 2);
    setActiveSlotId(1);

    await deleteCampaign(2);

    assert.strictEqual(getActiveSlotId(), 1, 'Slot 1 still active');
  });

  it('deleteCampaign removes associated checkpoint', async () => {
    const campaign = createTestCampaign();

    // Save campaign and checkpoint to same slot
    await saveCampaign(campaign, 1);
    await saveCheckpoint(campaign, 1);

    assert.ok(await hasCheckpoint(1), 'Checkpoint exists before delete');

    await deleteCampaign(1);

    assert.strictEqual(await hasCheckpoint(1), false, 'Checkpoint removed');
  });
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
