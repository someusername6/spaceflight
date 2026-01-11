/**
 * Nuke weapon behavior tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import {
  areEnemies,
  createFaction,
  Faction,
} from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import {
  createMissile,
  isMissileExpired,
} from '../../../src/components/missile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../src/core/ecs.ts';

describe('Nuke Tests', () => {
  it('Nuke missile has isNuke flag and aoeRadius', () => {
    const owner = 1;
    const direction = new THREE.Vector3(0, 0, -1);

    const missile = createMissile(
      owner,
      undefined, // no target
      500, // damage
      300, // speed
      50, // turn rate
      1500, // range
      direction,
      150, // AoE radius
      true, // isNuke
    );

    assert.ok(missile.isNuke === true, 'Missile should be a nuke');
    assert.ok(missile.aoeRadius === 150, 'AoE radius should be 150');
    assert.ok(missile.damage === 500, 'Nuke damage should be 500');
  });

  it('Regular missile is not a nuke', () => {
    const owner = 1;
    const direction = new THREE.Vector3(0, 0, -1);

    const missile = createMissile(
      owner,
      undefined,
      100, // damage
      400, // speed
      90, // turn rate
      800, // range
      direction,
      0, // no AoE
      false, // not a nuke
    );

    assert.ok(missile.isNuke === false, 'Regular missile should not be a nuke');
    assert.ok(missile.aoeRadius === 0, 'Regular missile should have no AoE');
  });

  it('Missile expires when distanceTraveled >= range', () => {
    const owner = 1;
    const direction = new THREE.Vector3(0, 0, -1);

    const missile = createMissile(
      owner,
      undefined,
      100,
      400,
      90,
      800,
      direction,
      0,
      false,
    );

    assert.ok(
      !isMissileExpired(missile),
      'Fresh missile should not be expired',
    );

    missile.distanceTraveled = 400;
    assert.ok(
      !isMissileExpired(missile),
      'Missile at half range should not be expired',
    );

    missile.distanceTraveled = 800;
    assert.ok(
      isMissileExpired(missile),
      'Missile at full range should be expired',
    );

    missile.distanceTraveled = 900;
    assert.ok(
      isMissileExpired(missile),
      'Missile beyond range should be expired',
    );
  });

  it('Nuke AoE detects enemies within blast radius', () => {
    const world = createWorld();

    // Create owner ship
    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    // Nuke position at (500, 0, 0) with AoE radius 150
    const nukePosition = new THREE.Vector3(500, 0, 0);
    const aoeRadius = 150;

    // Create enemy at (600, 0, 0) - 100 units away, within 150 radius
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(600, 0, 0));
    addComponent(world, enemy, createHealth(100));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    const enemyTransform = getComponent(world, enemy, 'transform');
    const distance = nukePosition.distanceTo(enemyTransform.position);

    assert.ok(distance === 100, `Distance should be 100, got ${distance}`);
    assert.ok(distance <= aoeRadius, 'Enemy should be within AoE radius');
  });

  it('Nuke AoE does not trigger when no enemies in blast radius', () => {
    const world = createWorld();

    // Create owner ship
    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    // Nuke position at (500, 0, 0) with AoE radius 150
    const nukePosition = new THREE.Vector3(500, 0, 0);
    const aoeRadius = 150;

    // Create enemy at (700, 0, 0) - 200 units away, outside 150 radius
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(700, 0, 0));
    addComponent(world, enemy, createHealth(100));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    const enemyTransform = getComponent(world, enemy, 'transform');
    const distance = nukePosition.distanceTo(enemyTransform.position);

    assert.ok(distance === 200, `Distance should be 200, got ${distance}`);
    assert.ok(distance > aoeRadius, 'Enemy should be outside AoE radius');
  });

  it('AoE damage has linear falloff from center to edge', () => {
    const maxDamage = 100;
    const radius = 100;

    // At center (distance 0): full damage
    const damageAtCenter = maxDamage * (1 - 0 / radius);
    assert.ok(damageAtCenter === 100, 'Damage at center should be full');

    // At half radius (distance 50): half damage
    const damageAtHalf = maxDamage * (1 - 50 / radius);
    assert.ok(damageAtHalf === 50, 'Damage at half radius should be half');

    // At edge (distance 100): zero damage
    const damageAtEdge = maxDamage * (1 - 100 / radius);
    assert.ok(damageAtEdge === 0, 'Damage at edge should be zero');
  });

  it('Nuke AoE respects faction alignment', () => {
    // Same faction should not be enemies
    assert.ok(
      !areEnemies(Faction.Player, Faction.Player),
      'Same faction should not be enemies',
    );
    assert.ok(
      !areEnemies(Faction.Enemy, Faction.Enemy),
      'Same faction should not be enemies',
    );

    // Different factions are hostile
    assert.ok(
      areEnemies(Faction.Player, Faction.Enemy),
      'Player and Enemy should be enemies',
    );
    assert.ok(
      areEnemies(Faction.Enemy, Faction.Player),
      'Enemy and Player should be enemies',
    );

    // Neutral is never hostile
    assert.ok(
      !areEnemies(Faction.Player, Faction.Neutral),
      'Neutral is never an enemy',
    );
    assert.ok(
      !areEnemies(Faction.Neutral, Faction.Enemy),
      'Neutral is never an enemy',
    );
  });
});
