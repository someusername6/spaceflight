/**
 * World Hash Tests - Validates deterministic state hashing.
 *
 * Tests:
 * - Same state produces same hash
 * - Different states produce different hashes
 * - Hash is deterministic across calls
 * - Order independence (entities/components)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { AIState, createAIControlled } from '../../../src/components/ai.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createMissile } from '../../../src/components/missile.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createPlayerControlled } from '../../../src/components/player.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createTargeting } from '../../../src/components/targeting.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { createPrimaryWeapons } from '../../../src/components/weapons.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../src/core/ecs.ts';
import { random } from '../../../src/core/prng.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';
import {
  computeWorldHash,
  HashState,
  worldsEqual,
} from '../../../src/serialization/index.ts';

describe('HashState', () => {
  it('Same input produces same hash', () => {
    const h1 = new HashState();
    h1.addInt32(12345);
    h1.addFloat64(Math.PI);
    h1.addString('hello');
    h1.addBool(true);

    const h2 = new HashState();
    h2.addInt32(12345);
    h2.addFloat64(Math.PI);
    h2.addString('hello');
    h2.addBool(true);

    assert.strictEqual(h1.finalize(), h2.finalize());
  });

  it('Different input produces different hash', () => {
    const h1 = new HashState();
    h1.addInt32(12345);

    const h2 = new HashState();
    h2.addInt32(12346);

    assert.notStrictEqual(h1.finalize(), h2.finalize());
  });

  it('Order matters', () => {
    const h1 = new HashState();
    h1.addInt32(1);
    h1.addInt32(2);

    const h2 = new HashState();
    h2.addInt32(2);
    h2.addInt32(1);

    assert.notStrictEqual(h1.finalize(), h2.finalize());
  });

  it('Float precision is maintained', () => {
    const h1 = new HashState();
    h1.addFloat64(1.0000001);

    const h2 = new HashState();
    h2.addFloat64(1.0000002);

    assert.notStrictEqual(h1.finalize(), h2.finalize());
  });
});

describe('World Hash', () => {
  it('Empty world has consistent hash', () => {
    const world1 = createWorld();
    const world2 = createWorld();

    assert.strictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('Hash is deterministic across multiple calls', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(100, 200, 300));
    addComponent(world, entity, createHealth(80));

    const hash1 = computeWorldHash(world);
    const hash2 = computeWorldHash(world);
    const hash3 = computeWorldHash(world);

    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash2, hash3);
  });

  it('Same entities produce same hash', () => {
    const world1 = createWorld();
    const e1 = createEntity(world1);
    addComponent(world1, e1, createTransform(100, 200, 300));
    addComponent(world1, e1, createHealth(80));
    addComponent(world1, e1, createFaction(Faction.Player));

    const world2 = createWorld();
    const e2 = createEntity(world2);
    addComponent(world2, e2, createTransform(100, 200, 300));
    addComponent(world2, e2, createHealth(80));
    addComponent(world2, e2, createFaction(Faction.Player));

    assert.strictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('Different position produces different hash', () => {
    const world1 = createWorld();
    const e1 = createEntity(world1);
    addComponent(world1, e1, createTransform(100, 200, 300));

    const world2 = createWorld();
    const e2 = createEntity(world2);
    addComponent(world2, e2, createTransform(100, 200, 301)); // Different Z

    assert.notStrictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('Different health produces different hash', () => {
    const world1 = createWorld();
    const e1 = createEntity(world1);
    addComponent(world1, e1, createHealth(80));

    const world2 = createWorld();
    const e2 = createEntity(world2);
    addComponent(world2, e2, createHealth(79)); // Different health

    assert.notStrictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('Different PRNG seed produces different hash', () => {
    const world1 = createWorld();
    const world2 = createWorld();

    random(world1.prng); // Advance PRNG

    assert.notStrictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('Different gameTime produces different hash', () => {
    const world1 = createWorld();
    world1.systemState.gameTime = 10.0;

    const world2 = createWorld();
    world2.systemState.gameTime = 10.1;

    assert.notStrictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('Different mission state produces different hash', () => {
    const world1 = createWorld();
    world1.systemState.mission.result = MissionResult.InProgress;

    const world2 = createWorld();
    world2.systemState.mission.result = MissionResult.Victory;

    assert.notStrictEqual(computeWorldHash(world1), computeWorldHash(world2));
  });

  it('worldsEqual helper works', () => {
    const world1 = createWorld();
    const world2 = createWorld();

    assert.ok(worldsEqual(world1, world2), 'Empty worlds should be equal');

    const e1 = createEntity(world1);
    addComponent(world1, e1, createTransform(0, 0, 0));

    assert.ok(
      !worldsEqual(world1, world2),
      'Different worlds should not be equal',
    );
  });

  it('Entity order does not affect hash (sorted internally)', () => {
    // Create entities in different orders but with same final state
    const world1 = createWorld();
    const a1 = createEntity(world1); // ID 1
    const b1 = createEntity(world1); // ID 2
    addComponent(world1, a1, createTransform(0, 0, 0));
    addComponent(world1, a1, createHealth(100));
    addComponent(world1, b1, createTransform(100, 0, 0));
    addComponent(world1, b1, createHealth(50));

    const world2 = createWorld();
    const a2 = createEntity(world2); // ID 1
    const b2 = createEntity(world2); // ID 2
    // Add components in different order
    addComponent(world2, b2, createHealth(50));
    addComponent(world2, b2, createTransform(100, 0, 0));
    addComponent(world2, a2, createHealth(100));
    addComponent(world2, a2, createTransform(0, 0, 0));

    assert.strictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Component addition order should not affect hash',
    );
  });

  it('Complex scenario: player + enemy + projectile', () => {
    function createBattleWorld(seed) {
      const world = createWorld();
      world.prng.seed = seed;
      world.systemState.gameTime = 5.0;

      // Player
      const player = createEntity(world);
      addComponent(world, player, createTransform(0, 0, 0));
      addComponent(world, player, createPhysics({ maxSpeed: 250 }));
      addComponent(world, player, createHealth(80));
      addComponent(world, player, createShields(60, 10, 3));
      addComponent(world, player, createFaction(Faction.Player));
      addComponent(world, player, createPlayerControlled());
      addComponent(world, player, createTargeting());
      addComponent(world, player, createPrimaryWeapons(['plasma']));

      // Enemy
      const enemy = createEntity(world);
      addComponent(world, enemy, createTransform(500, 0, -500));
      addComponent(world, enemy, createPhysics({ maxSpeed: 300 }));
      addComponent(world, enemy, createHealth(60));
      addComponent(world, enemy, createShields(40, 8, 2));
      addComponent(world, enemy, createFaction(Faction.Enemy));
      addComponent(world, enemy, createAIControlled(AI_PROFILES.regular));
      addComponent(world, enemy, createTargeting());

      // Missile
      const missile = createEntity(world);
      addComponent(world, missile, createTransform(100, 0, -100));
      addComponent(
        world,
        missile,
        createMissile(
          player,
          enemy,
          100,
          400,
          90,
          2000,
          new THREE.Vector3(0, 0, -1),
        ),
      );

      return world;
    }

    const world1 = createBattleWorld(12345);
    const world2 = createBattleWorld(12345);

    assert.strictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Identical battle scenarios should have same hash',
    );

    // Change one thing
    getComponent(world2, 2, 'health').hull = 59;

    assert.notStrictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Different enemy health should change hash',
    );
  });

  it('Missile resistedDecoys affects hash', () => {
    const world1 = createWorld();
    const missile1 = createEntity(world1);
    addComponent(world1, missile1, createTransform(0, 0, 0));
    const m1 = createMissile(
      1,
      2,
      100,
      400,
      90,
      2000,
      new THREE.Vector3(0, 0, -1),
    );
    m1.resistedDecoys.add(10);
    addComponent(world1, missile1, m1);

    const world2 = createWorld();
    const missile2 = createEntity(world2);
    addComponent(world2, missile2, createTransform(0, 0, 0));
    const m2 = createMissile(
      1,
      2,
      100,
      400,
      90,
      2000,
      new THREE.Vector3(0, 0, -1),
    );
    m2.resistedDecoys.add(10);
    m2.resistedDecoys.add(20); // Extra decoy
    addComponent(world2, missile2, m2);

    assert.notStrictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Different resistedDecoys should change hash',
    );
  });

  it('Targeting validTargets affects hash (sorted)', () => {
    const world1 = createWorld();
    const e1 = createEntity(world1);
    const targeting1 = createTargeting();
    targeting1.validTargets = [5, 10, 15];
    addComponent(world1, e1, targeting1);

    const world2 = createWorld();
    const e2 = createEntity(world2);
    const targeting2 = createTargeting();
    targeting2.validTargets = [15, 10, 5]; // Same elements, different order
    addComponent(world2, e2, targeting2);

    // Should be equal because validTargets are sorted before hashing
    assert.strictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Same validTargets in different order should have same hash',
    );

    // Add a different target
    targeting2.validTargets.push(20);
    assert.notStrictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Different validTargets should change hash',
    );
  });

  it('AI state affects hash', () => {
    const world1 = createWorld();
    const e1 = createEntity(world1);
    const ai1 = createAIControlled(AI_PROFILES.regular);
    ai1.state = AIState.Idle;
    addComponent(world1, e1, ai1);

    const world2 = createWorld();
    const e2 = createEntity(world2);
    const ai2 = createAIControlled(AI_PROFILES.regular);
    ai2.state = AIState.Engage;
    addComponent(world2, e2, ai2);

    assert.notStrictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Different AI state should change hash',
    );
  });

  it('callsignCounters affect hash', () => {
    const world1 = createWorld();
    world1.systemState.shipIdentity.callsignCounters.Alpha = 1;

    const world2 = createWorld();
    world2.systemState.shipIdentity.callsignCounters.Alpha = 2;

    assert.notStrictEqual(
      computeWorldHash(world1),
      computeWorldHash(world2),
      'Different callsignCounters should change hash',
    );
  });
});
