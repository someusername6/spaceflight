/**
 * Shrapnel Damage Amount Tests - Verify shrapnel deals correct damage exactly once.
 *
 * These tests catch bugs where:
 * - Shrapnel deals damage multiple times (not despawned properly)
 * - Wrong damage value is applied
 * - Collision damage is applied instead of/in addition to shrapnel damage
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  getComponent,
} from '../../../src/core/ecs.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createCollision } from '../../../src/systems/collision.ts';
import {
  calculateDamage,
  countProjectiles,
  createEnemyShip,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';

/**
 * Spawn a single shrapnel projectile directly at target.
 * This isolates shrapnel damage testing from flak detonation mechanics.
 */
function spawnSingleShrapnel(world, startPos, direction, owner, damage) {
  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(startPos.x, startPos.y, startPos.z),
  );
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createCollision(0.3));

  const projectile = createProjectile(
    owner,
    damage,
    500, // shrapnelSpeed
    120, // shrapnelRange
    direction,
    'ballistic',
    'TestShrapnel',
    { isShrapnel: true },
  );

  addComponent(world, entity, projectile);
  return entity;
}

describe('Shrapnel Damage Amount - Single Piece', () => {
  it('single shrapnel deals exactly shrapnelDamage to unshielded target', () => {
    const world = createTestWorld();
    const shrapnelDamage = 4; // Standard shrapnel damage

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 100));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create enemy ship and remove shields for clean damage test
    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const shields = getComponent(world, target, 'shields');
    if (shields) shields.current = 0;

    const before = getTotalHealth(world, target);

    // Spawn shrapnel directly at target (will hit on first collision check)
    const direction = new Vector3(0, 0, -1);
    spawnSingleShrapnel(
      world,
      new Vector3(0, 0, 10),
      direction,
      owner,
      shrapnelDamage,
    );

    // Run until shrapnel hits or expires
    let finalDamage = 0;
    for (let tick = 0; tick < 60; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      finalDamage = damage.totalDamage;

      // Stop when shrapnel is gone
      if (countProjectiles(world) === 0) break;
    }

    // Allow small tolerance for shield regen timing
    const tolerance = 0.5;
    assert.ok(
      Math.abs(finalDamage - shrapnelDamage) < tolerance,
      `Single shrapnel should deal ~${shrapnelDamage} damage (±${tolerance}), got ${finalDamage}`,
    );
  });

  it('shrapnel is despawned after hitting target (no double damage)', () => {
    const world = createTestWorld();
    const shrapnelDamage = 4;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 100));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create enemy with lots of health so we can detect multiple hits
    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const shields = getComponent(world, target, 'shields');
    if (shields) shields.current = 0;

    const before = getTotalHealth(world, target);

    // Spawn shrapnel
    const direction = new Vector3(0, 0, -1);
    spawnSingleShrapnel(
      world,
      new Vector3(0, 0, 10),
      direction,
      owner,
      shrapnelDamage,
    );

    // Track projectile count and damage over time
    let hitTick = -1;
    let projectileCountAfterHit = -1;
    let damageAtHit = 0;
    let finalDamage = 0;

    for (let tick = 0; tick < 60; tick++) {
      runForTicks(world, 1);

      const projectileCount = countProjectiles(world);
      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);

      if (damage.totalDamage > 0 && hitTick === -1) {
        hitTick = tick;
        damageAtHit = damage.totalDamage;
        projectileCountAfterHit = projectileCount;
      }

      finalDamage = damage.totalDamage;

      if (projectileCount === 0 && hitTick !== -1) break;
    }

    assert.ok(hitTick !== -1, 'Shrapnel should hit target');
    assert.strictEqual(
      projectileCountAfterHit,
      0,
      `Shrapnel should be despawned immediately after hit (count: ${projectileCountAfterHit})`,
    );
    assert.strictEqual(
      finalDamage,
      damageAtHit,
      `Damage should not increase after hit (at hit: ${damageAtHit}, final: ${finalDamage})`,
    );
  });

  it('multiple shrapnel pieces each deal damage once', () => {
    const world = createTestWorld();
    const shrapnelDamage = 4;
    const shrapnelCount = 5;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 100));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create enemy with lots of health
    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const shields = getComponent(world, target, 'shields');
    if (shields) shields.current = 0;

    const before = getTotalHealth(world, target);

    // Spawn multiple shrapnel all aimed at target
    const direction = new Vector3(0, 0, -1);
    for (let i = 0; i < shrapnelCount; i++) {
      // Slight offset so they don't all collide on same frame
      const offset = i * 2;
      spawnSingleShrapnel(
        world,
        new Vector3(0, 0, 10 + offset),
        direction,
        owner,
        shrapnelDamage,
      );
    }

    // Run until all shrapnel is gone
    for (let tick = 0; tick < 120; tick++) {
      runForTicks(world, 1);
      if (countProjectiles(world) === 0) break;
    }

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);
    const expectedDamage = shrapnelCount * shrapnelDamage;

    // Allow small tolerance for shield regen timing (scales with shrapnel count)
    const tolerance = shrapnelCount * 0.5;
    assert.ok(
      Math.abs(damage.totalDamage - expectedDamage) < tolerance,
      `${shrapnelCount} shrapnel should deal ~${expectedDamage} damage (±${tolerance}), got ${damage.totalDamage}`,
    );
  });
});

describe('Flak Shrapnel Damage Bounds', () => {
  it('flak shrapnel damage is within expected bounds', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.flak;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create target at origin
    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const shields = getComponent(world, target, 'shields');
    if (shields) shields.current = 0;

    const before = getTotalHealth(world, target);

    // Spawn flak projectile that will detonate near target
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(0, 0, weapon.flakRadius + 5));
    addComponent(world, entity, createFaction(Faction.Player));
    addComponent(world, entity, createCollision(0.5));

    const direction = new Vector3(0, 0, -1);
    const projectile = createProjectile(
      owner,
      weapon.damage,
      weapon.projectileSpeed,
      weapon.range,
      direction,
      weapon.category,
      weapon.name,
      {
        flakRadius: weapon.flakRadius,
        shrapnelCount: weapon.shrapnelCount,
        shrapnelDamage: weapon.shrapnelDamage,
        shrapnelSpeed: weapon.shrapnelSpeed,
        shrapnelRange: weapon.shrapnelRange,
      },
    );
    addComponent(world, entity, projectile);

    // Run until all projectiles are gone
    for (let tick = 0; tick < 180; tick++) {
      runForTicks(world, 1);
      if (countProjectiles(world) === 0) break;
    }

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    // Damage should be > 0 (at least some shrapnel hit)
    // Damage should be <= max possible (all shrapnel hit, each dealing shrapnelDamage once)
    const maxPossibleDamage = weapon.shrapnelCount * weapon.shrapnelDamage;

    assert.ok(
      damage.totalDamage > 0,
      `Flak should deal some damage (got ${damage.totalDamage})`,
    );
    assert.ok(
      damage.totalDamage <= maxPossibleDamage,
      `Flak damage ${damage.totalDamage} exceeds max possible ${maxPossibleDamage} - shrapnel may be hitting multiple times!`,
    );
  });
});
