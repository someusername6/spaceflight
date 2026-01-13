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

/** Cone angle from forward for multi-projectile missiles (degrees) */
const MULTI_MISSILE_CONE_ANGLE = 10;

// Reusable vectors
const spawnPos = new THREE.Vector3();
const coneDir = new THREE.Vector3();
const perpAxis = new THREE.Vector3();

/**
 * Calculate direction for a missile in a cone pattern.
 * All missiles are spread evenly around a cone at MULTI_MISSILE_CONE_ANGLE from forward.
 *
 * @param direction - The forward firing direction
 * @param index - Which missile (0-indexed)
 * @param total - Total number of missiles
 * @returns Direction vector for this missile
 */
function getConeDirection(
  direction: THREE.Vector3,
  index: number,
  total: number,
): THREE.Vector3 {
  // Single missile fires straight forward
  if (total <= 1) {
    coneDir.copy(direction);
    return coneDir;
  }

  // Find a perpendicular axis to rotate around
  // Use world up (Y) unless direction is nearly vertical
  perpAxis.set(0, 1, 0);
  if (Math.abs(direction.y) > 0.9) {
    perpAxis.set(1, 0, 0);
  }
  // Make it truly perpendicular via cross product
  perpAxis.crossVectors(direction, perpAxis).normalize();

  // Start by rotating forward by cone angle around the perpendicular axis
  const coneAngleRad = (MULTI_MISSILE_CONE_ANGLE * Math.PI) / 180;
  coneDir.copy(direction);
  coneDir.applyAxisAngle(perpAxis, coneAngleRad);

  // Then rotate around the forward direction to distribute missiles evenly
  const rotationAroundForward = (index / total) * Math.PI * 2;
  coneDir.applyAxisAngle(direction, rotationAroundForward);

  return coneDir;
}

/** Spawn a single missile entity (internal helper) */
function spawnSingleMissile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: SecondaryWeapon,
  ownerFaction: FactionComponent | undefined,
  target: Entity | undefined,
  direction: THREE.Vector3,
): void {
  const forward = getForward(ownerTransform);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(forward, MISSILE_SPAWN_OFFSET);

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

/** Spawn missile entity (or multiple for cluster/swarm weapons) */
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
  // Use provided aim direction for dumbfire, or forward for tracking missiles
  const baseDirection = aimDirection ?? forward;

  const projectileCount = weapon.projectilesPerShot ?? 1;

  // Spawn missiles in a cone pattern (single missile goes straight)
  for (let i = 0; i < projectileCount; i++) {
    const missileDirection = getConeDirection(
      baseDirection,
      i,
      projectileCount,
    ).clone();
    spawnSingleMissile(
      world,
      owner,
      ownerTransform,
      weapon,
      ownerFaction,
      target,
      missileDirection,
    );
  }
}
