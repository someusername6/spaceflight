/**
 * Shared helpers for missile damage tests.
 */

import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createMissile } from '../../../src/components/missile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { addComponent, createEntity } from '../../../src/core/ecs.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { createCollision } from '../../../src/systems/collision.ts';
import {
  calculateDamage,
  countMissiles,
  createTestWorld,
  getTotalHealth,
  runForTicks,
  TICK_SEC,
} from '../shared/weapon-damage-utils.mjs';

/**
 * Spawn a missile at a position, optionally tracking a target.
 */
export function spawnMissile(
  world,
  missileKey,
  startPos,
  direction,
  owner,
  target = undefined,
) {
  const stats = MISSILES[missileKey];
  if (!stats) {
    throw new Error(`Unknown missile: ${missileKey}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(startPos.x, startPos.y, startPos.z),
  );
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createCollision(1.0));
  addComponent(world, entity, createHealth(1));

  let shrapnelConfig;
  if (stats.flakRadius !== undefined) {
    shrapnelConfig = {
      flakRadius: stats.flakRadius,
      shrapnelCount: stats.shrapnelCount,
      shrapnelDamage: stats.shrapnelDamage,
      shrapnelSpeed: stats.shrapnelSpeed,
      shrapnelRange: stats.shrapnelRange,
    };
  }

  const missile = createMissile(
    owner,
    target,
    stats.damage,
    stats.speed,
    stats.turnRate,
    stats.range,
    direction,
    stats.aoeRadius ?? 0,
    stats.isNuke ?? false,
    missileKey,
    shrapnelConfig,
  );

  addComponent(world, entity, missile);
  return entity;
}

/**
 * Test that a missile deals damage to a target type.
 */
export function testMissileDamage(
  missileKey,
  createTarget,
  useTracking = true,
) {
  const stats = MISSILES[missileKey];
  if (!stats) {
    throw new Error(`Unknown missile: ${missileKey}`);
  }

  if (stats.isDecoy) {
    return { hitDetected: true, stats, skipped: true };
  }

  const world = createTestWorld();

  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 200));
  addComponent(world, owner, createFaction(Faction.Player));

  const target = createTarget(world, new Vector3(0, 0, 0));
  const before = getTotalHealth(world, target);

  const startDistance = Math.min(50, stats.range / 4);
  const missileStart = new Vector3(0, 0, startDistance);
  const direction = new Vector3(0, 0, -1);

  const missileTarget = useTracking && stats.turnRate > 0 ? target : undefined;
  spawnMissile(
    world,
    missileKey,
    missileStart,
    direction,
    owner,
    missileTarget,
  );

  const maxTicks = Math.ceil(stats.range / stats.speed / TICK_SEC) + 120;

  let hitDetected = false;
  for (let tick = 0; tick < maxTicks; tick++) {
    runForTicks(world, 1);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    if (damage.totalDamage > 0) {
      hitDetected = true;
      break;
    }

    if (countMissiles(world) === 0 && tick > 10) {
      break;
    }
  }

  return { hitDetected, stats };
}
