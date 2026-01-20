/**
 * Flak Weapon Damage Tests - Verify flak shrapnel damages targets.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { addComponent, createEntity } from '../../../src/core/ecs.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createCollision } from '../../../src/systems/collision.ts';
import {
  calculateDamage,
  countProjectiles,
  countShrapnel,
  createEnemyConvoy,
  createEnemyStation,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';

// ============================================================================
// Helper Functions
// ============================================================================

function spawnFlakProjectile(world, startPos, targetPos, owner) {
  const weapon = PRIMARY_WEAPONS.flak;
  const direction = targetPos.clone().sub(startPos).normalize();
  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(startPos.x, startPos.y, startPos.z),
  );
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createCollision(0.5));

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
  return entity;
}

// ============================================================================
// Tests: Flak Weapon Shrapnel Damage
// ============================================================================

describe('Flak Weapon Shrapnel Damage', () => {
  it('flak spawns shrapnel and damages target', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.flak;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const projectileStart = new Vector3(0, 0, weapon.flakRadius + 10);
    spawnFlakProjectile(world, projectileStart, new Vector3(0, 0, 0), owner);

    let maxProjectilesSeen = 0;
    let maxShrapnelSeen = 0;
    let damageDealt = false;
    let tickWhenDamageDealt = -1;

    for (let tick = 0; tick < 180; tick++) {
      runForTicks(world, 1);

      const projectileCount = countProjectiles(world);
      const shrapnelCount = countShrapnel(world);

      if (projectileCount > maxProjectilesSeen) {
        maxProjectilesSeen = projectileCount;
      }
      if (shrapnelCount > maxShrapnelSeen) {
        maxShrapnelSeen = shrapnelCount;
      }

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0 && !damageDealt) {
        damageDealt = true;
        tickWhenDamageDealt = tick;
      }

      if (damageDealt && projectileCount === 0) {
        break;
      }
    }

    assert.ok(
      maxProjectilesSeen >= 10,
      `Flak should spawn shrapnel (max seen: ${maxProjectilesSeen})`,
    );
    assert.ok(
      maxShrapnelSeen > 0,
      `Shrapnel should be marked with isShrapnel flag (max: ${maxShrapnelSeen})`,
    );
    assert.ok(
      damageDealt,
      `Shrapnel should deal damage (tick: ${tickWhenDamageDealt})`,
    );
  });

  it('flak shrapnel damages convoy', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.flak;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const convoy = createEnemyConvoy(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, convoy);

    const projectileStart = new Vector3(0, 0, weapon.flakRadius + 10);
    spawnFlakProjectile(world, projectileStart, new Vector3(0, 0, 0), owner);

    let damageDealt = false;
    for (let tick = 0; tick < 180; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, convoy);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        damageDealt = true;
        break;
      }
    }

    assert.ok(damageDealt, 'Flak shrapnel should damage convoy');
  });

  it('flak shrapnel damages station', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.flak;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const station = createEnemyStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, station);

    const projectileStart = new Vector3(0, 0, weapon.flakRadius + 10);
    spawnFlakProjectile(world, projectileStart, new Vector3(0, 0, 0), owner);

    let damageDealt = false;
    for (let tick = 0; tick < 180; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, station);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        damageDealt = true;
        break;
      }
    }

    assert.ok(damageDealt, 'Flak shrapnel should damage station');
  });
});
