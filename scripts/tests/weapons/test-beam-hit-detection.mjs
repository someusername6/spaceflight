/**
 * Beam Hit Detection Tests - Verify beam raycasting detects all target types.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { addComponent, createEntity } from '../../../src/core/ecs.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { findBeamHit } from '../../../src/systems/weapons/beam-raycasting.ts';
import {
  createEnemyConvoy,
  createEnemyShip,
  createEnemyStation,
  createTestWorld,
} from '../shared/weapon-damage-utils.mjs';

// ============================================================================
// Tests: Beam Raycasting Hit Detection
// ============================================================================

describe('Beam Raycasting vs Ships', () => {
  const beamWeapons = [
    'redLaser',
    'greenLaser',
    'blueLaser',
    'lightning',
    'torch',
  ];

  for (const weaponKey of beamWeapons) {
    it(`${weaponKey} beam detects enemy ship`, () => {
      const world = createTestWorld();
      const weapon = PRIMARY_WEAPONS[weaponKey];

      const owner = createEntity(world);
      addComponent(world, owner, createTransform(0, 0, 0));
      addComponent(world, owner, createFaction(Faction.Player));

      const target = createEnemyShip(world, new Vector3(0, 0, -100));

      const rayOrigin = new Vector3(0, 0, 0);
      const rayDirection = new Vector3(0, 0, -1);

      const hitResult = findBeamHit(
        world,
        owner,
        rayOrigin,
        rayDirection,
        weapon.range,
      );

      assert.ok(hitResult.hit, `${weapon.name} beam should detect enemy ship`);
      assert.strictEqual(
        hitResult.entity,
        target,
        'Hit entity should be the target',
      );
      assert.ok(hitResult.distance > 0, 'Hit distance should be positive');
    });
  }
});

describe('Beam Raycasting vs Convoys', () => {
  const beamWeapons = [
    'redLaser',
    'greenLaser',
    'blueLaser',
    'lightning',
    'torch',
  ];

  for (const weaponKey of beamWeapons) {
    it(`${weaponKey} beam detects enemy convoy`, () => {
      const world = createTestWorld();
      const weapon = PRIMARY_WEAPONS[weaponKey];

      const owner = createEntity(world);
      addComponent(world, owner, createTransform(0, 0, 0));
      addComponent(world, owner, createFaction(Faction.Player));

      const target = createEnemyConvoy(world, new Vector3(0, 0, -100));

      const rayOrigin = new Vector3(0, 0, 0);
      const rayDirection = new Vector3(0, 0, -1);

      const hitResult = findBeamHit(
        world,
        owner,
        rayOrigin,
        rayDirection,
        weapon.range,
      );

      assert.ok(
        hitResult.hit,
        `${weapon.name} beam should detect enemy convoy`,
      );
      assert.strictEqual(
        hitResult.entity,
        target,
        'Hit entity should be the convoy',
      );
    });
  }
});

describe('Beam Raycasting vs Stations', () => {
  const beamWeapons = [
    'redLaser',
    'greenLaser',
    'blueLaser',
    'lightning',
    'torch',
  ];

  for (const weaponKey of beamWeapons) {
    it(`${weaponKey} beam detects enemy station`, () => {
      const world = createTestWorld();
      const weapon = PRIMARY_WEAPONS[weaponKey];

      const owner = createEntity(world);
      addComponent(world, owner, createTransform(0, 0, 0));
      addComponent(world, owner, createFaction(Faction.Player));

      const target = createEnemyStation(world, new Vector3(0, 0, -500));

      const rayOrigin = new Vector3(0, 0, 0);
      const rayDirection = new Vector3(0, 0, -1);

      const hitResult = findBeamHit(
        world,
        owner,
        rayOrigin,
        rayDirection,
        weapon.range,
      );

      assert.ok(
        hitResult.hit,
        `${weapon.name} beam should detect enemy station`,
      );
      assert.strictEqual(
        hitResult.entity,
        target,
        'Hit entity should be the station',
      );
      assert.ok(
        hitResult.distance < 200,
        `Hit distance should be to surface (~160m), got ${hitResult.distance}`,
      );
    });
  }
});

// ============================================================================
// Tests: Nuclear Lance (Instant Beam) Hit Detection
// ============================================================================

describe('Nuclear Lance Hit Detection', () => {
  it('nuclear lance detects enemy ship', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.nuclearLance;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyShip(world, new Vector3(0, 0, -500));

    const rayOrigin = new Vector3(0, 0, 0);
    const rayDirection = new Vector3(0, 0, -1);

    const hitResult = findBeamHit(
      world,
      owner,
      rayOrigin,
      rayDirection,
      weapon.range,
    );

    assert.ok(
      hitResult.hit,
      'Nuclear Lance should detect enemy ship at long range',
    );
    assert.strictEqual(
      hitResult.entity,
      target,
      'Hit entity should be the target',
    );
  });

  it('nuclear lance detects enemy convoy', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.nuclearLance;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, -500));

    const rayOrigin = new Vector3(0, 0, 0);
    const rayDirection = new Vector3(0, 0, -1);

    const hitResult = findBeamHit(
      world,
      owner,
      rayOrigin,
      rayDirection,
      weapon.range,
    );

    assert.ok(
      hitResult.hit,
      'Nuclear Lance should detect enemy convoy at long range',
    );
    assert.strictEqual(
      hitResult.entity,
      target,
      'Hit entity should be the convoy',
    );
  });

  it('nuclear lance detects enemy station', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.nuclearLance;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyStation(world, new Vector3(0, 0, -500));

    const rayOrigin = new Vector3(0, 0, 0);
    const rayDirection = new Vector3(0, 0, -1);

    const hitResult = findBeamHit(
      world,
      owner,
      rayOrigin,
      rayDirection,
      weapon.range,
    );

    assert.ok(
      hitResult.hit,
      'Nuclear Lance should detect enemy station at long range',
    );
    assert.strictEqual(
      hitResult.entity,
      target,
      'Hit entity should be the station',
    );
  });
});

// ============================================================================
// Tests: Beam Range Limits
// ============================================================================

describe('Beam Range Limits', () => {
  it('short range beam (torch) misses distant target', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.torch;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    createEnemyShip(world, new Vector3(0, 0, -300));

    const rayOrigin = new Vector3(0, 0, 0);
    const rayDirection = new Vector3(0, 0, -1);

    const hitResult = findBeamHit(
      world,
      owner,
      rayOrigin,
      rayDirection,
      weapon.range,
    );

    assert.ok(!hitResult.hit, 'Torch should miss target beyond its range');
  });

  it('long range beam (nuclear lance) hits distant target', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.nuclearLance;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyShip(world, new Vector3(0, 0, -2000));

    const rayOrigin = new Vector3(0, 0, 0);
    const rayDirection = new Vector3(0, 0, -1);

    const hitResult = findBeamHit(
      world,
      owner,
      rayOrigin,
      rayDirection,
      weapon.range,
    );

    assert.ok(
      hitResult.hit,
      'Nuclear Lance should hit target within its range',
    );
    assert.strictEqual(
      hitResult.entity,
      target,
      'Hit entity should be the target',
    );
  });
});
