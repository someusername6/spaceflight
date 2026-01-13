/**
 * Combat Stats core tests - component creation and damage recording
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  createCombatStats,
  createTestEnemy,
  createTestShip,
  createWorld,
  getComponent,
  getOrCreateWeaponStats,
  initMatchStats,
  recordDamage,
} from '../shared/combat-stats-test-helpers.mjs';

describe('Combat Stats Core', () => {
  // =============================================================================
  // CombatStats Component Tests
  // =============================================================================

  describe('CombatStats Component', () => {
    it('CombatStats component creates with zero values', () => {
      const stats = createCombatStats();
      assert.strictEqual(
        stats.type,
        'combatStats',
        'Type should be combatStats',
      );
      assert.strictEqual(stats.kills, 0, 'Kills should start at 0');
      assert.strictEqual(stats.assists, 0, 'Assists should start at 0');
      assert.strictEqual(
        stats.damageDealt,
        0,
        'Damage dealt should start at 0',
      );
      assert.strictEqual(
        stats.damageReceived,
        0,
        'Damage received should start at 0',
      );
      assert.strictEqual(
        stats.weaponStats.size,
        0,
        'Weapon stats map should be empty',
      );
    });

    it('getOrCreateWeaponStats creates new weapon stats', () => {
      const stats = createCombatStats();
      const weapon = getOrCreateWeaponStats(stats, 'Red Laser', 'beam');
      assert.strictEqual(
        weapon.weaponName,
        'Red Laser',
        'Weapon name should match',
      );
      assert.strictEqual(weapon.category, 'beam', 'Category should be beam');
      assert.strictEqual(weapon.damageDealt, 0, 'Damage should start at 0');
      assert.strictEqual(
        stats.weaponStats.size,
        1,
        'Should have 1 weapon stat',
      );
    });

    it('getOrCreateWeaponStats returns existing stats', () => {
      const stats = createCombatStats();
      const weapon1 = getOrCreateWeaponStats(stats, 'Red Laser', 'beam');
      weapon1.damageDealt = 100;
      const weapon2 = getOrCreateWeaponStats(stats, 'Red Laser', 'beam');
      assert.strictEqual(weapon1, weapon2, 'Should return same object');
      assert.strictEqual(weapon2.damageDealt, 100, 'Damage should persist');
    });
  });

  // =============================================================================
  // Damage Recording Tests
  // =============================================================================

  describe('Damage Recording', () => {
    it('recordDamage updates source damage dealt', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker = createTestShip(world);
      const target = createTestEnemy(world);

      recordDamage(world, attacker, target, 'Red Laser', 'beam', 50);

      const stats = getComponent(world, attacker, 'combatStats');
      assert.strictEqual(stats.damageDealt, 50, 'Damage dealt should be 50');
    });

    it('recordDamage updates target damage received', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker = createTestShip(world);
      const target = createTestShip(world);

      recordDamage(world, attacker, target, 'Red Laser', 'beam', 30);

      const stats = getComponent(world, target, 'combatStats');
      assert.strictEqual(
        stats.damageReceived,
        30,
        'Damage received should be 30',
      );
    });

    it('recordDamage updates weapon-specific damage', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker = createTestShip(world);
      const target = createTestEnemy(world);

      recordDamage(world, attacker, target, 'Prometheus', 'beam', 75);

      const stats = getComponent(world, attacker, 'combatStats');
      const weapon = stats.weaponStats.get('Prometheus');
      assert.ok(weapon !== undefined, 'Should have Prometheus weapon stats');
      assert.strictEqual(weapon.damageDealt, 75, 'Weapon damage should be 75');
    });

    it('recordDamage tracks damage sources for kill attribution', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker1 = createTestShip(world);
      const attacker2 = createTestShip(world);
      const target = createTestShip(world);

      recordDamage(world, attacker1, target, 'Red Laser', 'beam', 30);
      recordDamage(world, attacker2, target, 'Green Laser', 'beam', 20);

      const sources = world.systemState.matchStats.damageSources.get(target);
      assert.ok(sources !== undefined, 'Should have damage sources');
      assert.ok(sources.has(attacker1), 'Should include attacker 1');
      assert.ok(sources.has(attacker2), 'Should include attacker 2');
    });

    it('recordDamage ignores zero damage', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker = createTestShip(world);
      const target = createTestEnemy(world);

      recordDamage(world, attacker, target, 'Red Laser', 'beam', 0);

      const stats = getComponent(world, attacker, 'combatStats');
      assert.strictEqual(
        stats.damageDealt,
        0,
        'Zero damage should not be recorded',
      );
      assert.strictEqual(
        stats.weaponStats.size,
        0,
        'Should not create weapon stats',
      );
    });

    it('recordDamage ignores negative damage', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker = createTestShip(world);
      const target = createTestEnemy(world);

      recordDamage(world, attacker, target, 'Red Laser', 'beam', -10);

      const stats = getComponent(world, attacker, 'combatStats');
      assert.strictEqual(
        stats.damageDealt,
        0,
        'Negative damage should not be recorded',
      );
    });

    it('recordDamage accumulates across multiple hits', () => {
      const world = createWorld(0);
      initMatchStats(world);
      const attacker = createTestShip(world);
      const target = createTestEnemy(world);

      recordDamage(world, attacker, target, 'Red Laser', 'beam', 25);
      recordDamage(world, attacker, target, 'Red Laser', 'beam', 25);
      recordDamage(world, attacker, target, 'Red Laser', 'beam', 50);

      const stats = getComponent(world, attacker, 'combatStats');
      assert.strictEqual(stats.damageDealt, 100, 'Total damage should be 100');

      const weapon = stats.weaponStats.get('Red Laser');
      assert.strictEqual(
        weapon.damageDealt,
        100,
        'Weapon damage should also be 100',
      );
    });
  });
});
