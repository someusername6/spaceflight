/**
 * Serialization Performance Tests - Validate snapshot size and timing budgets.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { createAIControlled } from '../../../src/components/ai.ts';
import { createAimError } from '../../../src/components/aim-error.ts';
import { createCollision } from '../../../src/components/collision.ts';
import { createCombatStats } from '../../../src/components/combat-stats.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createHeat } from '../../../src/components/heat.ts';
import {
  createMissile,
  createSecondaryWeaponFromDef,
} from '../../../src/components/missile.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createPlayerControlled } from '../../../src/components/player.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createShipIdentity } from '../../../src/components/ship-identity.ts';
import { createTargeting } from '../../../src/components/targeting.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  createPrimaryWeapons,
  createSecondaryWeapons,
} from '../../../src/components/weapons.ts';
import {
  addComponent,
  createEntity,
  createWorld,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';
import {
  computeWorldHash,
  deserializeWorld,
  estimateWorldSize,
  serializeWorld,
  serializeWorldToBytes,
} from '../../../src/serialization/index.ts';

/**
 * Create a realistic battle scenario for performance testing.
 * Typical battle: 4 player + 6-10 enemies + 10-20 projectiles + 5-10 missiles
 */
function createTypicalBattle() {
  const world = createWorld();
  world.systemState.gameTime = 45.0;

  // 4 player squadron
  for (let i = 0; i < 4; i++) {
    const ship = createEntity(world);
    addComponent(world, ship, createTransform(i * 100, 0, 0));
    addComponent(
      world,
      ship,
      createPhysics({
        maxSpeed: 250,
        acceleration: 150,
        drag: 0.8,
        turnRate: 120,
        rollRate: 180,
      }),
    );
    addComponent(world, ship, createHealth(100));
    addComponent(world, ship, createShields(60, 10, 3));
    addComponent(world, ship, createFaction(Faction.Player));
    addComponent(world, ship, createCollision(5));
    addComponent(world, ship, createTargeting());
    addComponent(world, ship, createPrimaryWeapons(['plasma', 'pulse']));
    addComponent(
      world,
      ship,
      createSecondaryWeapons([createSecondaryWeaponFromDef('seeker', 8)]),
    );
    addComponent(world, ship, createHeat(100, 15, 0.5));
    addComponent(world, ship, createShipIdentity('Alpha', i + 1, 'fighter'));
    addComponent(world, ship, createCombatStats());

    if (i === 0) {
      addComponent(world, ship, createPlayerControlled());
    } else {
      addComponent(world, ship, createAIControlled(AI_PROFILES.wingman));
    }
  }

  // 8 enemies
  for (let i = 0; i < 8; i++) {
    const ship = createEntity(world);
    addComponent(world, ship, createTransform(500 + i * 100, 0, -500));
    addComponent(
      world,
      ship,
      createPhysics({
        maxSpeed: 300,
        acceleration: 180,
        drag: 0.8,
        turnRate: 140,
        rollRate: 200,
      }),
    );
    addComponent(world, ship, createHealth(60));
    addComponent(world, ship, createShields(40, 8, 2));
    addComponent(world, ship, createFaction(Faction.Enemy));
    addComponent(world, ship, createCollision(5));
    addComponent(world, ship, createTargeting());
    addComponent(world, ship, createAIControlled(AI_PROFILES.regular));
    addComponent(world, ship, createPrimaryWeapons(['plasma']));
    addComponent(
      world,
      ship,
      createSecondaryWeapons([createSecondaryWeaponFromDef('seeker', 4)]),
    );
    addComponent(world, ship, createHeat(80, 12, 0.6));
    addComponent(world, ship, createShipIdentity('Bandit', i + 1, 'gnat'));
    addComponent(world, ship, createAimError(world.prng));
  }

  // 15 projectiles in flight
  for (let i = 0; i < 15; i++) {
    const proj = createEntity(world);
    addComponent(world, proj, createTransform(200 + i * 50, 10, -200));
    addComponent(
      world,
      proj,
      createProjectile(
        1,
        20,
        800,
        1500,
        new THREE.Vector3(0, 0, -1),
        'energy',
        'Plasma',
      ),
    );
    addComponent(world, proj, createCollision(0.5));
  }

  // 6 missiles in flight
  for (let i = 0; i < 6; i++) {
    const missile = createEntity(world);
    addComponent(world, missile, createTransform(100 + i * 80, 0, -150));
    addComponent(
      world,
      missile,
      createMissile(1, 5 + i, 100, 400, 90, 2000, new THREE.Vector3(0, 0, -1)),
    );
    addComponent(world, missile, createCollision(1));
  }

  // Some active beams
  world.systemState.beams.activeBeams.set(1, [
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
  world.systemState.beams.prevFireState.set(1, true);

  return world;
}

describe('Serialization Performance', () => {
  it('Typical battle snapshot size < 100KB', () => {
    const world = createTypicalBattle();
    const size = estimateWorldSize(world);

    // Target is ~50KB, allow up to 100KB as acceptable
    assert.ok(
      size < 100000,
      `Snapshot size ${(size / 1024).toFixed(1)}KB exceeds 100KB limit`,
    );

    // Log actual size for reference
    console.log(
      `    Typical battle snapshot size: ${(size / 1024).toFixed(1)}KB`,
    );
  });

  it('Serialization time < 5ms for 60fps budget', () => {
    const world = createTypicalBattle();

    // Warm up
    serializeWorld(world);

    // Measure 10 iterations
    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      serializeWorld(world);
    }
    const elapsed = performance.now() - start;
    const avgTime = elapsed / iterations;

    assert.ok(
      avgTime < 5,
      `Serialization time ${avgTime.toFixed(2)}ms exceeds 5ms budget`,
    );

    console.log(`    Average serialization time: ${avgTime.toFixed(2)}ms`);
  });

  it('Deserialization time < 5ms for 60fps budget', () => {
    const world = createTypicalBattle();
    const serialized = serializeWorld(world);

    // Warm up
    const warmupWorld = createWorld();
    deserializeWorld(serialized, warmupWorld);

    // Measure 10 iterations
    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const newWorld = createWorld();
      deserializeWorld(serialized, newWorld);
    }
    const elapsed = performance.now() - start;
    const avgTime = elapsed / iterations;

    assert.ok(
      avgTime < 5,
      `Deserialization time ${avgTime.toFixed(2)}ms exceeds 5ms budget`,
    );

    console.log(`    Average deserialization time: ${avgTime.toFixed(2)}ms`);
  });

  it('Bytes serialization overhead reasonable', () => {
    const world = createTypicalBattle();

    const jsonSize = estimateWorldSize(world);
    const bytes = serializeWorldToBytes(world);

    // UTF-8 encoding should be similar size (within 10%)
    const bytesOverhead = (bytes.length / jsonSize - 1) * 100;
    assert.ok(
      Math.abs(bytesOverhead) < 20,
      `Bytes encoding overhead ${bytesOverhead.toFixed(1)}% too large`,
    );

    console.log(
      `    JSON size: ${(jsonSize / 1024).toFixed(1)}KB, Bytes: ${(bytes.length / 1024).toFixed(1)}KB`,
    );
  });
});

describe('Hash Performance', () => {
  it('Large world hash completes quickly', () => {
    const world = createWorld();

    // Create 50 entities with multiple components
    for (let i = 0; i < 50; i++) {
      const entity = createEntity(world);
      addComponent(world, entity, createTransform(i * 100, 0, 0));
      addComponent(world, entity, createPhysics({ maxSpeed: 250 }));
      addComponent(world, entity, createHealth(100));
      addComponent(world, entity, createShields(60, 10, 3));
      addComponent(
        world,
        entity,
        createFaction(i % 2 === 0 ? Faction.Player : Faction.Enemy),
      );
      addComponent(world, entity, createCollision(5));
      addComponent(world, entity, createTargeting());

      if (i % 2 === 1) {
        addComponent(world, entity, createAIControlled(AI_PROFILES.regular));
      }
    }

    const start = performance.now();
    const hash = computeWorldHash(world);
    const elapsed = performance.now() - start;

    assert.ok(hash !== 0, 'Hash should be non-zero');
    assert.ok(
      elapsed < 50,
      `Hash should complete in <50ms, took ${elapsed.toFixed(2)}ms`,
    );
  });

  it('Hash is consistent for same large world', () => {
    const world = createWorld();

    for (let i = 0; i < 20; i++) {
      const entity = createEntity(world);
      addComponent(world, entity, createTransform(i * 100, 0, 0));
      addComponent(world, entity, createPhysics({ maxSpeed: 250 }));
      addComponent(world, entity, createHealth(100));
    }

    const hashes = [];
    for (let i = 0; i < 10; i++) {
      hashes.push(computeWorldHash(world));
    }

    const firstHash = hashes[0];
    for (const hash of hashes) {
      assert.strictEqual(hash, firstHash, 'All hashes should be identical');
    }
  });
});
