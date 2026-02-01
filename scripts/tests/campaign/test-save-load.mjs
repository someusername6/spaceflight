/**
 * Save/Load Integration Tests
 *
 * Tests that campaign state survives the full save/load cycle:
 * 1. Serialization via JSON.stringify (uses toJSON methods)
 * 2. Deserialization via JSON.parse
 * 3. Reconstitution of SlotArrays from plain arrays
 *
 * This test would have caught the SlotArray WeakMap bug where weapon data
 * was lost during serialization because WeakMap doesn't survive JSON.stringify.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createSlotArray,
  forEachSlot,
  getSlot,
  slotArrayFromJSON,
} from '../../../src/campaign/slot-array.ts';
import { createNewCampaign } from '../../../src/campaign/state.ts';

// ============================================================================
// Layer 1: Data Structure Round-Trip Tests (Unit)
// ============================================================================

describe('Save/Load: Data Structure Round-Trip', () => {
  describe('SlotArray serialization', () => {
    it('SlotArray survives JSON.stringify via implicit toJSON()', () => {
      // This is the exact code path used by saveGame()
      const weapons = [
        { weaponType: 'plasma', bankSize: 1 },
        null,
        { weaponType: 'autocannon', bankSize: 2, currentAmmo: 150 },
      ];
      const original = createSlotArray(weapons);

      // Simulate save: JSON.stringify calls toJSON() automatically
      const jsonString = JSON.stringify(original);

      // Simulate load: JSON.parse returns plain array
      const parsed = JSON.parse(jsonString);

      // Reconstitute: wrap in SlotArray again
      const restored = slotArrayFromJSON(parsed);

      // Verify structure
      assert.strictEqual(restored.slotCount, 3, 'Slot count preserved');

      // Verify data - this would fail with the old WeakMap bug
      const slot0 = getSlot(restored, 0);
      assert.ok(slot0 !== undefined, 'Slot 0 should have data');
      assert.strictEqual(slot0.weaponType, 'plasma', 'Weapon type preserved');
      assert.strictEqual(slot0.bankSize, 1, 'Bank size preserved');

      assert.strictEqual(
        getSlot(restored, 1),
        undefined,
        'Null slot preserved',
      );

      const slot2 = getSlot(restored, 2);
      assert.ok(slot2 !== undefined, 'Slot 2 should have data');
      assert.strictEqual(
        slot2.weaponType,
        'autocannon',
        'Weapon type preserved',
      );
      assert.strictEqual(slot2.currentAmmo, 150, 'Ammo count preserved');
    });

    it('empty SlotArray survives round-trip', () => {
      const original = createSlotArray([null, null]);
      const jsonString = JSON.stringify(original);
      const parsed = JSON.parse(jsonString);
      const restored = slotArrayFromJSON(parsed);

      assert.strictEqual(restored.slotCount, 2, 'Slot count preserved');
      assert.strictEqual(getSlot(restored, 0), undefined, 'Slot 0 empty');
      assert.strictEqual(getSlot(restored, 1), undefined, 'Slot 1 empty');
    });

    it('SlotArray with complex nested data survives round-trip', () => {
      const weapons = [
        {
          weaponType: 'seeker',
          bankSize: 2,
          count: 8,
          maxCount: 12,
        },
      ];
      const original = createSlotArray(weapons);
      const jsonString = JSON.stringify(original);
      const parsed = JSON.parse(jsonString);
      const restored = slotArrayFromJSON(parsed);

      const slot = getSlot(restored, 0);
      assert.ok(slot !== undefined, 'Slot should have data');
      assert.strictEqual(slot.count, 8, 'Count preserved');
      assert.strictEqual(slot.maxCount, 12, 'Max count preserved');
    });
  });

  describe('OwnedShip serialization', () => {
    it('ship with weapon SlotArrays survives round-trip', () => {
      // Create a ship-like structure with SlotArrays
      const ship = {
        id: 'ship-1',
        shipClass: 'fighter',
        primaryWeapons: createSlotArray([
          { weaponType: 'plasma', bankSize: 1 },
          { weaponType: 'pulse', bankSize: 2 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'seeker', bankSize: 2, count: 8, maxCount: 12 },
          null,
        ]),
        pilot: {
          id: 'pilot-1',
          name: 'Test Pilot',
          shipSkills: { fighter: 'regular' },
        },
      };

      // Serialize (simulates saveGame)
      const jsonString = JSON.stringify(ship);

      // Deserialize (simulates loadGame before reconstitution)
      const parsed = JSON.parse(jsonString);

      // Reconstitute SlotArrays (simulates reconstituteSave)
      const restored = {
        ...parsed,
        primaryWeapons: slotArrayFromJSON(parsed.primaryWeapons),
        secondaryWeapons: slotArrayFromJSON(parsed.secondaryWeapons),
      };

      // Verify ship data
      assert.strictEqual(restored.id, 'ship-1', 'Ship ID preserved');
      assert.strictEqual(restored.shipClass, 'fighter', 'Ship class preserved');
      assert.strictEqual(restored.pilot.name, 'Test Pilot', 'Pilot preserved');

      // Verify primary weapons SlotArray is functional
      assert.strictEqual(
        restored.primaryWeapons.slotCount,
        2,
        'Primary slot count preserved',
      );
      const primary0 = getSlot(restored.primaryWeapons, 0);
      assert.ok(primary0 !== undefined, 'Primary slot 0 has data');
      assert.strictEqual(
        primary0.weaponType,
        'plasma',
        'Primary weapon preserved',
      );

      // Verify secondary weapons SlotArray is functional
      assert.strictEqual(
        restored.secondaryWeapons.slotCount,
        2,
        'Secondary slot count preserved',
      );
      const secondary0 = getSlot(restored.secondaryWeapons, 0);
      assert.ok(secondary0 !== undefined, 'Secondary slot 0 has data');
      assert.strictEqual(secondary0.count, 8, 'Missile count preserved');
    });
  });
});

// ============================================================================
// Layer 2: Full Campaign Round-Trip Test (Integration)
// ============================================================================

describe('Save/Load: Full Campaign Round-Trip', () => {
  it('full CampaignState survives serialize → deserialize → reconstitute', () => {
    // Create a real campaign state (uses Date.now() for seed, but we don't care)
    const original = createNewCampaign();

    // Collect original weapon data for comparison
    const originalWeaponData = original.ships.map((ship) => {
      const primaries = [];
      forEachSlot(ship.primaryWeapons, (w, i) => {
        primaries.push({ index: i, ...w });
      });
      const secondaries = [];
      forEachSlot(ship.secondaryWeapons, (w, i) => {
        secondaries.push({ index: i, ...w });
      });
      return { shipId: ship.id, primaries, secondaries };
    });

    // Simulate saveGame: wrap in SaveData structure and stringify
    const saveData = {
      version: 4,
      timestamp: Date.now(),
      state: original,
    };
    const jsonString = JSON.stringify(saveData);

    // Verify JSON is not trivially small (would indicate serialization failure)
    assert.ok(jsonString.length > 1000, 'JSON should be substantial size');

    // Simulate loadGame: parse JSON
    const parsed = JSON.parse(jsonString);
    assert.strictEqual(parsed.version, 4, 'Version preserved');

    // Simulate reconstituteSave: recreate SlotArrays
    const restoredState = {
      ...parsed.state,
      ships: parsed.state.ships.map((ship) => ({
        ...ship,
        primaryWeapons: slotArrayFromJSON(ship.primaryWeapons),
        secondaryWeapons: slotArrayFromJSON(ship.secondaryWeapons),
      })),
    };

    // Verify campaign data
    assert.strictEqual(restoredState.credits, 1000, 'Credits preserved');
    assert.strictEqual(restoredState.currentSector, 1, 'Sector preserved');
    assert.strictEqual(restoredState.ships.length, 4, 'Ship count preserved');
    assert.strictEqual(restoredState.pilots.length, 4, 'Pilot count preserved');

    // Verify each ship's SlotArrays are functional
    for (let i = 0; i < restoredState.ships.length; i++) {
      const ship = restoredState.ships[i];
      const originalData = originalWeaponData[i];

      // Verify primary weapons
      const restoredPrimaries = [];
      forEachSlot(ship.primaryWeapons, (w, idx) => {
        restoredPrimaries.push({ index: idx, ...w });
      });

      assert.deepStrictEqual(
        restoredPrimaries,
        originalData.primaries,
        `Ship ${ship.id} primary weapons preserved`,
      );

      // Verify secondary weapons
      const restoredSecondaries = [];
      forEachSlot(ship.secondaryWeapons, (w, idx) => {
        restoredSecondaries.push({ index: idx, ...w });
      });

      assert.deepStrictEqual(
        restoredSecondaries,
        originalData.secondaries,
        `Ship ${ship.id} secondary weapons preserved`,
      );
    }
  });

  it('campaign with modified ships survives round-trip', () => {
    // Create campaign and modify it (simulate mid-game state)
    const original = createNewCampaign();

    // Modify a ship's weapons to simulate gameplay
    const ship = original.ships[0];
    if (ship) {
      // Get current primary weapon and modify ammo
      const primary = getSlot(ship.primaryWeapons, 0);
      if (primary && primary.currentAmmo !== undefined) {
        // Create modified version with reduced ammo
        const modifiedPrimary = { ...primary, currentAmmo: 50 };
        ship.primaryWeapons = slotArrayFromJSON([
          modifiedPrimary,
          ...Array(ship.primaryWeapons.slotCount - 1).fill(null),
        ]);
      }
    }

    // Modify credits
    original.credits = 5000;
    original.missionCount = 10;

    // Round-trip
    const jsonString = JSON.stringify({ version: 4, state: original });
    const parsed = JSON.parse(jsonString);
    const restored = {
      ...parsed.state,
      ships: parsed.state.ships.map((s) => ({
        ...s,
        primaryWeapons: slotArrayFromJSON(s.primaryWeapons),
        secondaryWeapons: slotArrayFromJSON(s.secondaryWeapons),
      })),
    };

    // Verify modifications survived
    assert.strictEqual(restored.credits, 5000, 'Modified credits preserved');
    assert.strictEqual(restored.missionCount, 10, 'Mission count preserved');
  });

  it('SlotArray methods work on restored data', () => {
    const original = createNewCampaign();

    // Round-trip
    const jsonString = JSON.stringify(original);
    const parsed = JSON.parse(jsonString);
    const restoredShip = {
      ...parsed.ships[0],
      primaryWeapons: slotArrayFromJSON(parsed.ships[0].primaryWeapons),
      secondaryWeapons: slotArrayFromJSON(parsed.ships[0].secondaryWeapons),
    };

    // Verify SlotArray methods work (would throw if storage WeakMap is broken)
    let primaryCount = 0;
    forEachSlot(restoredShip.primaryWeapons, () => {
      primaryCount++;
    });
    assert.ok(
      primaryCount > 0,
      'forEachSlot works on restored primary weapons',
    );

    let secondaryCount = 0;
    forEachSlot(restoredShip.secondaryWeapons, () => {
      secondaryCount++;
    });
    // Secondary might be empty for some ship types, so just verify no throw
    assert.ok(
      secondaryCount >= 0,
      'forEachSlot works on restored secondary weapons',
    );
  });
});

// Legacy migration tests moved to test-legacy-migration-integration.mjs
