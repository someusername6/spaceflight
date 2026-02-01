/**
 * Legacy Migration Integration Tests
 *
 * Tests the full migration path for v1 → v2 campaign saves.
 * Verifies both JSON round-trip and IndexedDB storage paths.
 *
 * Extracted from test-save-load.mjs and test-campaign-storage.mjs
 * to stay under 400 line limit.
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
} from '../../../src/campaign/storage/campaign-db.ts';
import { reconstituteCampaignState } from '../../../src/campaign/storage/campaign-utils.ts';
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

  if (options.credits !== undefined) state.credits = options.credits;
  if (options.sector !== undefined) state.currentSector = options.sector;
  if (options.missionCount !== undefined)
    state.missionCount = options.missionCount;

  return state;
}

// ============================================================================
// Test Setup/Teardown (for IndexedDB tests)
// ============================================================================

beforeEach(async () => {
  localStorage.clear();
  clearDBCache();
});

afterEach(async () => {
  localStorage.clear();
  clearDBCache();
  await deleteDatabase();
});

// ============================================================================
// JSON Round-Trip Migration Tests
// ============================================================================

describe('Legacy Migration: JSON Round-Trip', () => {
  it('v1 campaign with legacy pilot skills migrates correctly', () => {
    // Simulate a v1 campaign state with legacy 'skill' field instead of 'shipSkills'
    const legacyState = {
      seed: 12345,
      commanderId: 'commander-1',
      credits: 2500,
      currentSector: 2,
      sectorMissionsCompleted: 3,
      completedContracts: ['contract-1'],
      attemptedContracts: ['contract-1', 'contract-2'],
      contractRefreshCount: 1,
      missionCount: 5,
      nextId: 10,
      settings: {
        commanderName: 'TestCommander',
        ironmanMode: false,
        autoaimDegrees: 2.5,
      },
      pilots: [
        {
          id: 'commander-1',
          name: 'TestCommander',
          skill: 'ace', // Legacy field
          kills: 25,
          assists: 10,
          missionsFlown: 50,
          missionsWon: 45,
          damageDealt: 250000,
          damageReceived: 50000,
          ejectionCount: 0,
          injuredMissionsLeft: 0,
          xp: 0,
        },
        {
          id: 'pilot-2',
          name: 'Alpha',
          skill: 'veteran', // Legacy field
          kills: 10,
          assists: 5,
          missionsFlown: 15,
          missionsWon: 12,
          damageDealt: 50000,
          damageReceived: 20000,
          ejectionCount: 1,
          injuredMissionsLeft: 0,
          xp: 75,
        },
      ],
      ships: [
        {
          id: 'ship-1',
          shipClass: 'fighter',
          primaryWeapons: [{ weaponType: 'plasma', bankSize: 2 }],
          secondaryWeapons: [
            { weaponType: 'seeker', bankSize: 2, count: 8, maxCount: 12 },
          ],
          pilot: {
            id: 'commander-1',
            name: 'TestCommander',
            skill: 'ace', // Legacy field in embedded pilot
            kills: 25,
            assists: 10,
            missionsFlown: 50,
            missionsWon: 45,
            damageDealt: 250000,
            damageReceived: 50000,
            ejectionCount: 0,
            injuredMissionsLeft: 0,
            xp: 0,
          },
        },
        {
          id: 'ship-2',
          shipClass: 'bomber',
          primaryWeapons: [
            { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
          ],
          secondaryWeapons: [],
          pilot: {
            id: 'pilot-2',
            name: 'Alpha',
            skill: 'veteran', // Legacy field in embedded pilot
            kills: 10,
            assists: 5,
            missionsFlown: 15,
            missionsWon: 12,
            damageDealt: 50000,
            damageReceived: 20000,
            ejectionCount: 1,
            injuredMissionsLeft: 0,
            xp: 75,
          },
        },
      ],
      availableRecruits: [
        {
          id: 'recruit-1',
          name: 'Beta',
          skill: 'rookie',
          price: 75,
          // Missing startingShip and bonusXP (legacy)
        },
      ],
      storedShips: [],
      storedWeapons: [],
      storedAmmo: {},
    };

    // Round-trip through JSON (simulates storage)
    const jsonString = JSON.stringify(legacyState);
    const parsed = JSON.parse(jsonString);

    // Apply migration (this is what loadCampaign does)
    const migrated = reconstituteCampaignState(parsed);

    // Verify commander pilot migration
    const commander = migrated.pilots.find((p) => p.id === 'commander-1');
    assert.ok(commander, 'Commander pilot exists');
    assert.deepStrictEqual(
      commander.shipSkills,
      {},
      'Commander has empty shipSkills',
    );
    assert.strictEqual(
      commander.skill,
      undefined,
      'Legacy skill field removed from commander',
    );

    // Verify wingman pilot migration
    const wingman = migrated.pilots.find((p) => p.id === 'pilot-2');
    assert.ok(wingman, 'Wingman pilot exists');
    assert.strictEqual(wingman.shipSkills.fighter, 'veteran', 'Fighter skill');
    assert.strictEqual(wingman.shipSkills.bomber, 'veteran', 'Bomber skill');
    assert.strictEqual(
      wingman.skill,
      undefined,
      'Legacy skill field removed from wingman',
    );

    // Verify embedded pilot in ship also migrated
    const commanderShip = migrated.ships.find((s) => s.id === 'ship-1');
    assert.ok(commanderShip?.pilot, 'Commander ship has pilot');
    assert.deepStrictEqual(
      commanderShip.pilot.shipSkills,
      {},
      'Embedded commander has empty shipSkills',
    );

    // Verify recruit migration
    const recruit = migrated.availableRecruits[0];
    assert.ok(recruit, 'Recruit exists');
    assert.strictEqual(recruit.startingShip, 'fighter', 'Has startingShip');
    assert.strictEqual(recruit.bonusXP, 25, 'Has bonusXP (rookie = 25)');

    // Verify SlotArrays are functional
    assert.ok(
      migrated.ships[0].primaryWeapons.slotCount > 0,
      'SlotArrays reconstituted',
    );

    // Verify no data loss
    assert.strictEqual(migrated.credits, 2500, 'Credits preserved');
    assert.strictEqual(migrated.currentSector, 2, 'Sector preserved');
    assert.strictEqual(wingman.kills, 10, 'Pilot stats preserved');
    assert.strictEqual(wingman.xp, 75, 'XP preserved');
  });
});

// ============================================================================
// IndexedDB Migration Tests
// ============================================================================

describe('Legacy Migration: IndexedDB Storage', () => {
  it('loadCampaign migrates v1 campaign with legacy pilot skills', async () => {
    // Create a v1-style campaign with legacy 'skill' field
    const legacyState = createTestCampaign();

    // Convert to legacy format (simulating v1 save)
    const legacyPilots = legacyState.pilots.map((pilot) => {
      const { shipSkills, ...rest } = pilot;
      const highestSkill =
        Object.values(shipSkills)[0] ??
        (pilot.id === legacyState.commanderId ? 'ace' : 'regular');
      return { ...rest, skill: highestSkill, shipSkills: {} };
    });

    const legacyShips = legacyState.ships.map((ship) => {
      if (!ship.pilot) return ship;
      const { shipSkills, ...pilotRest } = ship.pilot;
      const highestSkill =
        Object.values(shipSkills)[0] ??
        (ship.pilot.id === legacyState.commanderId ? 'ace' : 'regular');
      return {
        ...ship,
        pilot: { ...pilotRest, skill: highestSkill, shipSkills: {} },
      };
    });

    const legacyRecruits = legacyState.availableRecruits.map((recruit) => {
      const { startingShip, bonusXP, ...rest } = recruit;
      return rest;
    });

    const legacyCampaign = {
      ...legacyState,
      pilots: legacyPilots,
      ships: legacyShips,
      availableRecruits: legacyRecruits,
    };

    // Save the legacy campaign
    await saveCampaign(legacyCampaign, 1);

    // Load it back - should trigger migration
    const loaded = await loadCampaign(1);

    assert.ok(loaded !== null, 'Campaign loaded successfully');

    // Verify commander migration
    const commander = loaded.pilots.find((p) => p.id === loaded.commanderId);
    assert.ok(commander, 'Commander exists');
    assert.deepStrictEqual(commander.shipSkills, {}, 'Commander empty skills');
    assert.strictEqual(commander.skill, undefined, 'Legacy field removed');

    // Verify wingman migration
    const wingmen = loaded.pilots.filter((p) => p.id !== loaded.commanderId);
    for (const wingman of wingmen) {
      assert.ok(
        Object.keys(wingman.shipSkills).length > 0,
        `Wingman ${wingman.name} has ship skills`,
      );
      assert.strictEqual(
        wingman.skill,
        undefined,
        `Wingman ${wingman.name} has no legacy field`,
      );
    }

    // Verify embedded pilots in ships
    for (const ship of loaded.ships) {
      if (!ship.pilot) continue;
      assert.strictEqual(
        ship.pilot.skill,
        undefined,
        'Embedded pilot has no legacy field',
      );
    }

    // Verify recruit migration
    for (const recruit of loaded.availableRecruits) {
      assert.ok(recruit.startingShip, `Recruit has startingShip`);
      assert.ok(recruit.bonusXP !== undefined, `Recruit has bonusXP`);
    }

    // Verify SlotArrays are functional
    assert.ok(
      loaded.ships[0]?.primaryWeapons?.slotCount > 0,
      'SlotArrays reconstituted',
    );
  });
});
