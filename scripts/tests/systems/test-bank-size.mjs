/**
 * Bank Size Scaling Tests - validates weapon bank size effects.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { createSecondaryWeaponFromDef } from '../../../src/components/missile.ts';
import {
  createDecoyWeapon,
  createPrimaryWeapons,
  getEffectiveHeat,
} from '../../../src/components/weapons.ts';

describe('Bank Size Scaling', () => {
  // ============================================================
  // Energy Weapons - bank size affects heat scaling
  // ============================================================

  describe('Energy Weapons', () => {
    it('Energy weapon (Plasma) bank size 1 has normal heat', () => {
      const weapons = createPrimaryWeapons([{ name: 'plasma', size: 1 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 1, 'Bank size should be 1');
      assert.strictEqual(weapon.heatPerShot, 5, 'Heat per shot should be 5');
      assert.strictEqual(
        getEffectiveHeat(weapon),
        5,
        'Effective heat should be 5',
      );
    });

    it('Energy weapon (Plasma) bank size 2 has halved effective heat', () => {
      const weapons = createPrimaryWeapons([{ name: 'plasma', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 2, 'Bank size should be 2');
      assert.strictEqual(
        weapon.heatPerShot,
        5,
        'Heat per shot should still be 5',
      );
      assert.strictEqual(
        getEffectiveHeat(weapon),
        2.5,
        'Effective heat should be 2.5',
      );
    });

    it('Energy weapon (Plasma) bank size 3 has 1/3 effective heat', () => {
      const weapons = createPrimaryWeapons([{ name: 'plasma', size: 3 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 3, 'Bank size should be 3');
      assert.strictEqual(
        getEffectiveHeat(weapon),
        5 / 3,
        'Effective heat should be 5/3',
      );
    });

    it('Energy weapon (Pulse) bank size scaling', () => {
      const weapons = createPrimaryWeapons([{ name: 'pulse', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.heatPerShot, 5, 'Pulse heat should be 5');
      assert.strictEqual(
        getEffectiveHeat(weapon),
        2.5,
        'Effective heat should be 2.5',
      );
    });

    it('Energy weapon (Ion) bank size scaling', () => {
      const weapons = createPrimaryWeapons([{ name: 'ion', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.heatPerShot, 6, 'Ion heat should be 6');
      assert.strictEqual(
        getEffectiveHeat(weapon),
        3,
        'Effective heat should be 3',
      );
    });
  });

  // ============================================================
  // Ballistic Weapons - bank size affects ammo capacity
  // ============================================================

  describe('Ballistic Weapons', () => {
    it('Ballistic weapon (Autocannon) bank size 1 has base ammo', () => {
      const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 1 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 1, 'Bank size should be 1');
      assert.strictEqual(weapon.ammo, 200, 'Ammo should be 200');
      assert.strictEqual(weapon.maxAmmo, 200, 'Max ammo should be 200');
    });

    it('Ballistic weapon (Autocannon) bank size 2 has doubled ammo', () => {
      const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 2, 'Bank size should be 2');
      assert.strictEqual(weapon.ammo, 400, 'Ammo should be 400');
      assert.strictEqual(weapon.maxAmmo, 400, 'Max ammo should be 400');
    });

    it('Ballistic weapon (Autocannon) bank size 3 has tripled ammo', () => {
      const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 3 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 3, 'Bank size should be 3');
      assert.strictEqual(weapon.ammo, 600, 'Ammo should be 600');
      assert.strictEqual(weapon.maxAmmo, 600, 'Max ammo should be 600');
    });

    it('Ballistic weapon (Railgun) bank size scaling', () => {
      const weapons = createPrimaryWeapons([{ name: 'railgun', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.ammo, 40, 'Railgun ammo should be 40 (20 * 2)');
      assert.strictEqual(weapon.maxAmmo, 40, 'Max ammo should be 40');
    });

    it('Ballistic weapon (Flak) bank size scaling', () => {
      const weapons = createPrimaryWeapons([{ name: 'flak', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.ammo, 400, 'Flak ammo should be 400 (200 * 2)');
      assert.strictEqual(weapon.maxAmmo, 400, 'Max ammo should be 400');
    });
  });

  // ============================================================
  // Beam Weapons - bank size affects heat scaling
  // ============================================================

  describe('Beam Weapons', () => {
    it('Beam weapon (Red Laser) bank size 1 has normal heat', () => {
      const weapons = createPrimaryWeapons([{ name: 'redLaser', size: 1 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 1, 'Bank size should be 1');
      assert.strictEqual(weapon.heatPerShot, 15, 'Heat/sec should be 15');
      assert.strictEqual(
        getEffectiveHeat(weapon),
        15,
        'Effective heat should be 15',
      );
    });

    it('Beam weapon (Red Laser) bank size 2 has halved effective heat', () => {
      const weapons = createPrimaryWeapons([{ name: 'redLaser', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(weapon.bankSize, 2, 'Bank size should be 2');
      assert.strictEqual(
        getEffectiveHeat(weapon),
        7.5,
        'Effective heat should be 7.5',
      );
    });

    it('Beam weapon (Green Laser) bank size scaling', () => {
      const weapons = createPrimaryWeapons([{ name: 'greenLaser', size: 2 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(
        weapon.heatPerShot,
        12,
        'Green Laser heat should be 12',
      );
      assert.strictEqual(
        getEffectiveHeat(weapon),
        6,
        'Effective heat should be 6',
      );
    });

    it('Beam weapon (Blue Laser) bank size scaling', () => {
      const weapons = createPrimaryWeapons([{ name: 'blueLaser', size: 3 }]);
      const weapon = weapons.weapons[0];
      assert.strictEqual(
        weapon.heatPerShot,
        10,
        'Blue Laser heat should be 10',
      );
      assert.strictEqual(
        getEffectiveHeat(weapon),
        10 / 3,
        'Effective heat should be 10/3',
      );
    });
  });

  // ============================================================
  // Missiles - bank size affects count
  // ============================================================

  describe('Missiles', () => {
    it('Missile (Rocket) bank size 1 has base count', () => {
      const weapon = createSecondaryWeaponFromDef('rocket', 10, 1);
      assert.strictEqual(weapon.bankSize, 1, 'Bank size should be 1');
      assert.strictEqual(weapon.count, 10, 'Count should be 10');
      assert.strictEqual(weapon.maxCount, 10, 'Max count should be 10');
    });

    it('Missile (Rocket) bank size 2 has doubled count', () => {
      const weapon = createSecondaryWeaponFromDef('rocket', 10, 2);
      assert.strictEqual(weapon.bankSize, 2, 'Bank size should be 2');
      assert.strictEqual(weapon.count, 20, 'Count should be 20');
      assert.strictEqual(weapon.maxCount, 20, 'Max count should be 20');
    });

    it('Missile (Seeker) bank size scaling', () => {
      const weapon = createSecondaryWeaponFromDef('seeker', 8, 2);
      assert.strictEqual(weapon.count, 16, 'Seeker count should be 16 (8 * 2)');
      assert.strictEqual(weapon.maxCount, 16, 'Max count should be 16');
      assert.strictEqual(weapon.requiresLock, true, 'Seeker requires lock');
    });

    it('Missile (Dart) bank size scaling', () => {
      const weapon = createSecondaryWeaponFromDef('dart', 6, 3);
      assert.strictEqual(weapon.count, 18, 'Dart count should be 18 (6 * 3)');
      assert.strictEqual(weapon.maxCount, 18, 'Max count should be 18');
    });

    it('Missile (Cluster) bank size scaling', () => {
      const weapon = createSecondaryWeaponFromDef('cluster', 4, 2);
      assert.strictEqual(weapon.count, 8, 'Cluster count should be 8 (4 * 2)');
    });

    it('Missile (Swarm) bank size scaling', () => {
      const weapon = createSecondaryWeaponFromDef('swarm', 16, 2);
      assert.strictEqual(weapon.count, 32, 'Swarm count should be 32 (16 * 2)');
    });

    it('Missile (Torpedo) bank size scaling', () => {
      const weapon = createSecondaryWeaponFromDef('torpedo', 3, 2);
      assert.strictEqual(weapon.count, 6, 'Torpedo count should be 6 (3 * 2)');
    });

    it('Missile (Nuke) bank size scaling', () => {
      const weapon = createSecondaryWeaponFromDef('nuke', 1, 3);
      assert.strictEqual(weapon.count, 3, 'Nuke count should be 3 (1 * 3)');
      assert.strictEqual(weapon.isNuke, true, 'Should be marked as nuke');
      assert.strictEqual(weapon.aoeRadius, 100, 'Should have AoE radius');
    });
  });

  // ============================================================
  // Decoys - bank size affects count
  // ============================================================

  describe('Decoys', () => {
    it('Decoy bank size 1 has base count', () => {
      const weapon = createDecoyWeapon(4, 1);
      assert.strictEqual(weapon.bankSize, 1, 'Bank size should be 1');
      assert.strictEqual(weapon.count, 4, 'Count should be 4');
      assert.strictEqual(weapon.maxCount, 4, 'Max count should be 4');
    });

    it('Decoy bank size 2 has doubled count', () => {
      const weapon = createDecoyWeapon(4, 2);
      assert.strictEqual(weapon.bankSize, 2, 'Bank size should be 2');
      assert.strictEqual(weapon.count, 8, 'Count should be 8 (4 * 2)');
      assert.strictEqual(weapon.maxCount, 8, 'Max count should be 8');
    });

    it('Decoy bank size 3 has tripled count', () => {
      const weapon = createDecoyWeapon(4, 3);
      assert.strictEqual(weapon.bankSize, 3, 'Bank size should be 3');
      assert.strictEqual(weapon.count, 12, 'Count should be 12 (4 * 3)');
      assert.strictEqual(weapon.maxCount, 12, 'Max count should be 12');
    });
  });

  // ============================================================
  // Mixed and Legacy Tests
  // ============================================================

  describe('Mixed and Legacy', () => {
    it('Mixed weapon banks with different sizes', () => {
      const weapons = createPrimaryWeapons([
        { name: 'plasma', size: 1 },
        { name: 'autocannon', size: 2 },
        { name: 'greenLaser', size: 3 },
      ]);
      assert.strictEqual(weapons.weapons.length, 3, 'Should have 3 weapons');

      // Plasma (energy, size 1)
      assert.strictEqual(weapons.weapons[0].bankSize, 1, 'Plasma bank size 1');
      assert.strictEqual(
        getEffectiveHeat(weapons.weapons[0]),
        5,
        'Plasma effective heat 5',
      );

      // Autocannon (ballistic, size 2)
      assert.strictEqual(
        weapons.weapons[1].bankSize,
        2,
        'Autocannon bank size 2',
      );
      assert.strictEqual(weapons.weapons[1].ammo, 400, 'Autocannon ammo 400');

      // Green Laser (beam, size 3)
      assert.strictEqual(
        weapons.weapons[2].bankSize,
        3,
        'Green Laser bank size 3',
      );
      assert.strictEqual(
        getEffectiveHeat(weapons.weapons[2]),
        4,
        'Green Laser effective heat 4',
      );
    });

    it('Legacy string format defaults to bank size 1', () => {
      const weapons = createPrimaryWeapons(['plasma', 'autocannon']);
      assert.strictEqual(
        weapons.weapons[0].bankSize,
        1,
        'Plasma should default to bank size 1',
      );
      assert.strictEqual(
        weapons.weapons[1].bankSize,
        1,
        'Autocannon should default to bank size 1',
      );
      assert.strictEqual(
        weapons.weapons[1].ammo,
        200,
        'Autocannon should have base ammo',
      );
    });
  });
});
