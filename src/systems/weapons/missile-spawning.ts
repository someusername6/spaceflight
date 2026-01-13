/**
 * Missile Spawning - Creates missile entities.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import { createFaction } from '../../components/faction';
import { createHealth } from '../../components/health';
import {
  createMissile,
  type MissileShrapnelConfig,
  type MissileType,
} from '../../components/missile';
import type { Transform } from '../../components/transform';
import { createTransform } from '../../components/transform';
import type { SecondaryWeapon } from '../../components/weapons';
import { addComponent, createEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { createCollision } from '../collision';
import { getForward } from '../physics';
import { recordMissileLaunched } from '../stats';

/** Spawn offset from ship center */
const MISSILE_SPAWN_OFFSET = 4; // Owner collision ignored for first 20m of travel

/** Collision radius */
const MISSILE_RADIUS = 1.0;

// Reusable vector
const spawnPos = new THREE.Vector3();

/** Spawn a missile entity */
export function spawnMissile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: SecondaryWeapon,
  ownerFaction: FactionComponent | undefined,
  target: Entity | undefined,
  aimDirection?: THREE.Vector3, // Optional aim direction for dumbfire lead
): void {
  const forward = getForward(ownerTransform);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(forward, MISSILE_SPAWN_OFFSET);

  // Use provided aim direction for dumbfire, or forward for tracking missiles
  const direction = aimDirection ?? forward;

  const missile = createEntity(world);

  // Create transform at spawn position
  const missileTransform = createTransform(spawnPos.x, spawnPos.y, spawnPos.z);
  missileTransform.rotation.copy(ownerTransform.rotation);
  addComponent(world, missile, missileTransform);

  // Create missile component with type for visuals
  const missileType = weapon.name.toLowerCase() as MissileType;

  // Build shrapnel config if weapon has shrapnel properties
  let shrapnelConfig: MissileShrapnelConfig | undefined;
  if (weapon.flakRadius !== undefined) {
    shrapnelConfig = { flakRadius: weapon.flakRadius };
    if (weapon.shrapnelCount !== undefined)
      shrapnelConfig.shrapnelCount = weapon.shrapnelCount;
    if (weapon.shrapnelDamage !== undefined)
      shrapnelConfig.shrapnelDamage = weapon.shrapnelDamage;
    if (weapon.shrapnelSpeed !== undefined)
      shrapnelConfig.shrapnelSpeed = weapon.shrapnelSpeed;
    if (weapon.shrapnelRange !== undefined)
      shrapnelConfig.shrapnelRange = weapon.shrapnelRange;
  }

  addComponent(
    world,
    missile,
    createMissile(
      owner,
      target,
      weapon.damage,
      weapon.speed,
      weapon.turnRate,
      weapon.range,
      direction,
      weapon.aoeRadius ?? 0,
      weapon.isNuke ?? false,
      missileType,
      shrapnelConfig,
    ),
  );

  // Add collision
  addComponent(world, missile, createCollision(MISSILE_RADIUS));

  // Add health (missiles have 1 HP - destroyed by any hit)
  addComponent(world, missile, createHealth(1));

  // Missiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, missile, createFaction(ownerFaction.faction));
  }

  // Track per-ship stats
  recordMissileLaunched(world, owner, weapon.name);

  // Track aggregate stats if enabled (for balance analysis)
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    stats.missilesFired[weapon.name] =
      (stats.missilesFired[weapon.name] || 0) + 1;
  }
}
