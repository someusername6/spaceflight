/**
 * Weapon Ammo Tracking Tests - validates ammo carried initialization
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  addComponent,
  createCombatStats,
  createEntity,
  createPrimaryWeapons,
  createWorld,
  getComponent,
  initWeaponAmmoCounts,
} from './combat-stats-test-helpers.mjs';

describe('Ammo Tracking', () => {
  it('ammoCarried sums across multiple weapon banks', () => {
    const world = createWorld(0);
    const entity = createEntity(world);

    // Create ship with 2 banks of flak, 200 ammo each
    addComponent(world, entity, createCombatStats());
    const weapons = createPrimaryWeapons([
      { name: 'flak', size: 1 },
      { name: 'flak', size: 1 },
    ]);
    addComponent(world, entity, weapons);

    // Initialize ammo counts - should sum both banks
    initWeaponAmmoCounts(world, entity);

    const stats = getComponent(world, entity, 'combatStats');
    const flakStats = stats.weaponStats.get('Flak');

    assert.ok(flakStats, 'Should have Flak weapon stats');
    // 2 banks × 200 ammo = 400 total
    assert.strictEqual(
      flakStats.ammoCarried,
      400,
      'Should sum ammo across both banks (2 × 200 = 400)',
    );
  });

  it('ammoCarried works correctly with single bank', () => {
    const world = createWorld(0);
    const entity = createEntity(world);

    // Create ship with 1 bank of autocannon
    addComponent(world, entity, createCombatStats());
    const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 1 }]);
    addComponent(world, entity, weapons);

    initWeaponAmmoCounts(world, entity);

    const stats = getComponent(world, entity, 'combatStats');
    const autocannonStats = stats.weaponStats.get('Autocannon');

    assert.ok(autocannonStats, 'Should have Autocannon weapon stats');
    assert.strictEqual(
      autocannonStats.ammoCarried,
      200,
      'Single bank should have 200 ammo',
    );
  });

  it('ammoCarried tracks different weapon types separately', () => {
    const world = createWorld(0);
    const entity = createEntity(world);

    // Create ship with mixed weapons
    addComponent(world, entity, createCombatStats());
    const weapons = createPrimaryWeapons([
      { name: 'flak', size: 1 },
      { name: 'autocannon', size: 1 },
    ]);
    addComponent(world, entity, weapons);

    initWeaponAmmoCounts(world, entity);

    const stats = getComponent(world, entity, 'combatStats');
    const flakStats = stats.weaponStats.get('Flak');
    const autocannonStats = stats.weaponStats.get('Autocannon');

    assert.ok(flakStats, 'Should have Flak weapon stats');
    assert.ok(autocannonStats, 'Should have Autocannon weapon stats');
    assert.strictEqual(flakStats.ammoCarried, 200, 'Flak should have 200 ammo');
    assert.strictEqual(
      autocannonStats.ammoCarried,
      200,
      'Autocannon should have 200 ammo',
    );
  });
});
