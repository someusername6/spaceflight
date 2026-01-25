/**
 * World Serialization Tests - Full world round-trip and edge cases.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { createAIControlled } from '../../../src/components/ai.ts';
import { createCollision } from '../../../src/components/collision.ts';
import { createCombatStats } from '../../../src/components/combat-stats.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createSecondaryWeaponFromDef } from '../../../src/components/missile.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createPlayerControlled } from '../../../src/components/player.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { createSecondaryWeapons } from '../../../src/components/weapons.ts';
import {
  deserializeComponent,
  serializeComponent,
} from '../../../src/core/component-serializers.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  removeEntity,
} from '../../../src/core/ecs.ts';
import { random } from '../../../src/core/prng.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { computeWorldHash } from '../../../src/core/world-hash.ts';
import {
  deserializeWorld,
  deserializeWorldFromBytes,
  estimateWorldSize,
  serializeWorld,
  serializeWorldToBytes,
} from '../../../src/core/world-serialization.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';

describe('World Serialization', () => {
  it('Empty world round-trip', () => {
    const world = createWorld();

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(newWorld.entities.size, 0);
    assert.strictEqual(newWorld.nextEntityId, 1);
  });

  it('Single entity round-trip', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(100, 200, 300));
    addComponent(world, entity, createHealth(80));
    addComponent(world, entity, createFaction(Faction.Player));

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(newWorld.entities.size, 1);
    assert.ok(newWorld.entities.has(entity));

    const transform = getComponent(newWorld, entity, 'transform');
    assert.strictEqual(transform.position.x, 100);
    assert.strictEqual(transform.position.y, 200);
    assert.strictEqual(transform.position.z, 300);

    const health = getComponent(newWorld, entity, 'health');
    assert.strictEqual(health.hull, 80);

    const faction = getComponent(newWorld, entity, 'faction');
    assert.strictEqual(faction.faction, Faction.Player);
  });

  it('Multiple entities round-trip', () => {
    const world = createWorld();

    // Create player
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createPlayerControlled());
    addComponent(world, player, createFaction(Faction.Player));

    // Create enemy
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(500, 0, -500));
    addComponent(world, enemy, createAIControlled(AI_PROFILES.regular));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    // Create projectile
    const projectile = createEntity(world);
    addComponent(world, projectile, createTransform(100, 0, 0));
    addComponent(
      world,
      projectile,
      createProjectile(
        player,
        20,
        800,
        1500,
        new THREE.Vector3(1, 0, 0),
        'energy',
        'Plasma',
      ),
    );

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(newWorld.entities.size, 3);
    assert.ok(getComponent(newWorld, player, 'playerControlled'));
    assert.ok(getComponent(newWorld, enemy, 'aiControlled'));
    assert.ok(getComponent(newWorld, projectile, 'projectile'));
  });

  it('PRNG state preserved', () => {
    const world = createWorld();

    // Consume some random numbers
    random(world.prng);
    random(world.prng);
    random(world.prng);
    const originalSeed = world.prng.seed;

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(newWorld.prng.seed, originalSeed);

    // Both should produce the same next value
    const value1 = random(world.prng);
    const value2 = random(newWorld.prng);
    assert.strictEqual(value1, value2);
  });

  it('nextEntityId preserved', () => {
    const world = createWorld();
    createEntity(world);
    createEntity(world);
    createEntity(world);

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(newWorld.nextEntityId, 4);

    // New entity should get ID 4
    const newEntity = createEntity(newWorld);
    assert.strictEqual(newEntity, 4);
  });

  it('toRemove set preserved', () => {
    const world = createWorld();
    const e1 = createEntity(world);
    const e2 = createEntity(world);
    addComponent(world, e1, createTransform(0, 0, 0));
    addComponent(world, e2, createTransform(0, 0, 0));

    // Mark e2 for removal
    removeEntity(world, e2);

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.ok(newWorld.toRemove.has(e2));
    assert.ok(!newWorld.toRemove.has(e1));
  });

  it('SystemState gameTime preserved', () => {
    const world = createWorld();
    world.systemState.gameTime = 123.456;

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(newWorld.systemState.gameTime, 123.456);
  });

  it('SystemState weapons state preserved', () => {
    const world = createWorld();
    world.systemState.weapons.prevInput.cyclePrimary = true;
    world.systemState.weapons.prevInput.launchDecoy = true;
    world.systemState.weapons.lastDecoyFireTime = 5.5;

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(
      newWorld.systemState.weapons.prevInput.cyclePrimary,
      true,
    );
    assert.strictEqual(
      newWorld.systemState.weapons.prevInput.launchDecoy,
      true,
    );
    assert.strictEqual(newWorld.systemState.weapons.lastDecoyFireTime, 5.5);
  });

  it('SystemState mission state preserved', () => {
    const world = createWorld();
    world.systemState.mission.result = MissionResult.Victory;
    world.systemState.mission.missionType = 'escort';

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(
      newWorld.systemState.mission.result,
      MissionResult.Victory,
    );
    assert.strictEqual(newWorld.systemState.mission.missionType, 'escort');
  });

  it('SystemState callsignCounters preserved', () => {
    const world = createWorld();
    world.systemState.shipIdentity.callsignCounters.Alpha = 3;
    world.systemState.shipIdentity.callsignCounters.Bandit = 5;

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.strictEqual(
      newWorld.systemState.shipIdentity.callsignCounters.Alpha,
      3,
    );
    assert.strictEqual(
      newWorld.systemState.shipIdentity.callsignCounters.Bandit,
      5,
    );
  });

  it('SystemState beams state preserved', () => {
    const world = createWorld();
    const entityId = 5;
    world.systemState.beams.activeBeams.set(entityId, [
      {
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, -1),
        hitPoint: new THREE.Vector3(0, 0, -100),
        color: new THREE.Color(0x00ff00),
        active: true,
        weaponIndex: 0,
        fadeStartTime: null,
      },
    ]);
    world.systemState.beams.prevFireState.set(entityId, true);

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    assert.ok(newWorld.systemState.beams.activeBeams.has(entityId));
    const beams = newWorld.systemState.beams.activeBeams.get(entityId);
    assert.strictEqual(beams.length, 1);
    assert.strictEqual(beams[0].active, true);
    assert.strictEqual(beams[0].hitPoint.z, -100);
    assert.ok(newWorld.systemState.beams.prevFireState.get(entityId));
  });

  it('Bytes round-trip', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(100, 200, 300));
    addComponent(world, entity, createHealth(80));

    const bytes = serializeWorldToBytes(world);
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.length > 0);

    const newWorld = createWorld();
    deserializeWorldFromBytes(bytes, newWorld);

    const transform = getComponent(newWorld, entity, 'transform');
    assert.strictEqual(transform.position.x, 100);
  });

  it('Hash matches after round-trip', () => {
    const world = createWorld();

    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createPlayerControlled());
    addComponent(world, player, createPhysics({ maxSpeed: 250 }));
    addComponent(world, player, createHealth(80));

    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(500, 0, -500));
    addComponent(world, enemy, createAIControlled(AI_PROFILES.regular));

    const hashBefore = computeWorldHash(world);

    const serialized = serializeWorld(world);
    const newWorld = createWorld();
    deserializeWorld(serialized, newWorld);

    const hashAfter = computeWorldHash(newWorld);

    assert.strictEqual(
      hashBefore,
      hashAfter,
      'Hash should match after round-trip',
    );
  });

  it('Estimate world size', () => {
    const world = createWorld();

    // Add some entities
    for (let i = 0; i < 10; i++) {
      const entity = createEntity(world);
      addComponent(world, entity, createTransform(i * 100, 0, 0));
      addComponent(world, entity, createPhysics({ maxSpeed: 250 }));
      addComponent(world, entity, createHealth(80));
    }

    const size = estimateWorldSize(world);
    assert.ok(size > 0, 'Size should be positive');
    assert.ok(size < 100000, 'Size should be reasonable for 10 entities');
  });
});

describe('Serialization Edge Cases', () => {
  it('undefined vs null in optional fields', () => {
    // lockTarget can be undefined
    const weapons = createSecondaryWeapons([
      createSecondaryWeaponFromDef('seeker', 4),
    ]);
    assert.strictEqual(weapons.lockTarget, undefined);

    const serialized = serializeComponent(weapons);
    const restored = deserializeComponent(serialized);

    // After round-trip, undefined should stay undefined (not become null)
    assert.strictEqual(restored.lockTarget, undefined);
  });

  it('Empty arrays handled correctly', () => {
    const collision = createCollision(5);
    assert.strictEqual(collision.collidedWith.length, 0);

    const serialized = serializeComponent(collision);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.collidedWith.length, 0);
  });

  it('Empty Maps handled correctly', () => {
    const stats = createCombatStats();
    assert.strictEqual(stats.weaponStats.size, 0);

    const serialized = serializeComponent(stats);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.weaponStats.size, 0);
  });

  it('Version mismatch throws error', () => {
    const world = createWorld();
    const serialized = serializeWorld(world);
    serialized.version = 999; // Invalid version

    const newWorld = createWorld();
    assert.throws(() => {
      deserializeWorld(serialized, newWorld);
    }, /version mismatch/);
  });
});
