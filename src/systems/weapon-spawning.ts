/**
 * Weapon Spawning - Creates projectile and missile entities.
 *
 * Each weapon bank has a distinct spawn point offset from ship center.
 */

import * as THREE from 'three';
import type { AimError } from '../components/aim-error';
import { applyAimError } from '../components/aim-error';
import { createDecoy } from '../components/decoy';
import type { FactionComponent } from '../components/faction';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createMissile, type MissileType } from '../components/missile';
import type { ProjectileCategory, WeaponName } from '../components/projectile';
import { createProjectile } from '../components/projectile';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import type { SecondaryWeapon } from '../components/weapons';
import { addComponent, createEntity } from '../core/ecs';
import { randomUnitVector } from '../core/prng';
import type { Entity, World } from '../core/types';
import { createCollision } from './collision';
import { getForward } from './physics';
import {
  recordDecoyDeployed,
  recordMissileLaunched,
  recordShotFired,
} from './stats';

// Re-export for backward compatibility
export { spawnShrapnel } from './shrapnel';

/** Spawn offsets from ship center */
const PROJECTILE_SPAWN_OFFSET = 3;
const MISSILE_SPAWN_OFFSET = 4; // Owner collision ignored for first 20m of travel
const DECOY_SPAWN_OFFSET = 3; // Below the ship (downward)

/** Lateral offset between weapon banks */
const BANK_LATERAL_OFFSET = 1.5;

/** Collision radii */
const PROJECTILE_RADIUS = 0.5;
const MISSILE_RADIUS = 1.0;

// Reusable vectors (avoid per-spawn allocations)
const spawnPos = new THREE.Vector3();
const rightAxis = new THREE.Vector3();
const tempForward = new THREE.Vector3();
const downAxis = new THREE.Vector3();
const toIntercept = new THREE.Vector3();

/** Autoaim parameters for projectile correction */
export interface AutoaimParams {
  /** The calculated intercept point to aim at */
  interceptPoint: THREE.Vector3;
  /** Autoaim field of view in degrees */
  fovDegrees: number;
}

/**
 * Calculate spawn position for a weapon bank.
 * Banks are distributed symmetrically around ship center.
 * Bank 0 = left, Bank 1 = right, Bank 2 = left-outer, etc.
 */
export function calculateBankOffset(
  transform: Transform,
  bankIndex: number,
  totalBanks: number,
  forwardOffset: number,
): THREE.Vector3 {
  const forward = getForward(transform);
  spawnPos.copy(transform.position).addScaledVector(forward, forwardOffset);

  // For single bank, no lateral offset
  if (totalBanks <= 1) return spawnPos;

  // Calculate right axis (perpendicular to forward, in local XZ plane)
  tempForward.copy(forward);
  rightAxis.set(0, 1, 0).cross(tempForward).normalize();

  // Distribute banks: 0=left, 1=right, 2=far-left, 3=far-right, etc.
  const pairIndex = Math.floor(bankIndex / 2);
  const isRight = bankIndex % 2 === 1;
  const lateralOffset = BANK_LATERAL_OFFSET * (pairIndex + 1);

  if (isRight) {
    spawnPos.addScaledVector(rightAxis, lateralOffset);
  } else {
    spawnPos.addScaledVector(rightAxis, -lateralOffset);
  }

  return spawnPos;
}

/** Spawn a projectile entity */
export function spawnProjectile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: {
    name: string;
    damage: number;
    projectileSpeed: number;
    range: number;
    category?: string; // WeaponCategory includes 'beam' but we filter that out
    flakRadius?: number;
    shrapnelCount?: number;
  },
  ownerFaction: FactionComponent | undefined,
  bankIndex = 0,
  totalBanks = 1,
): void {
  const forward = getForward(ownerTransform);
  const pos = calculateBankOffset(
    ownerTransform,
    bankIndex,
    totalBanks,
    PROJECTILE_SPAWN_OFFSET,
  );

  const projectile = createEntity(world);
  const category: ProjectileCategory =
    weapon.category === 'ballistic' ? 'ballistic' : 'energy';

  addComponent(world, projectile, createTransform(pos.x, pos.y, pos.z));
  addComponent(
    world,
    projectile,
    createProjectile(
      owner,
      weapon.damage,
      weapon.projectileSpeed,
      weapon.range,
      forward,
      category,
      weapon.name as WeaponName,
      weapon.flakRadius,
      weapon.shrapnelCount,
    ),
  );
  addComponent(world, projectile, createCollision(PROJECTILE_RADIUS));

  // Projectiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, projectile, createFaction(ownerFaction.faction));
  }

  // Track per-ship stats
  recordShotFired(world, owner, weapon.name);

  // Track aggregate stats if enabled (for balance analysis)
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    stats.shotsFired[weapon.name] = (stats.shotsFired[weapon.name] || 0) + 1;
  }
}

/** Spawn a projectile with aim error and optional autoaim correction */
export function spawnProjectileWithAimError(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: {
    name: string;
    damage: number;
    projectileSpeed: number;
    range: number;
    category?: string;
    flakRadius?: number;
    shrapnelCount?: number;
    autoaimFov?: number;
  },
  ownerFaction: FactionComponent | undefined,
  aimError: AimError | undefined,
  bankIndex = 0,
  totalBanks = 1,
  autoaim?: AutoaimParams,
): void {
  const forward = getForward(ownerTransform);
  const pos = calculateBankOffset(
    ownerTransform,
    bankIndex,
    totalBanks,
    PROJECTILE_SPAWN_OFFSET,
  );

  // Apply aim error if present, otherwise use forward direction
  let direction = aimError ? applyAimError(forward, aimError) : forward;

  // Apply autoaim correction if within cone
  if (autoaim && autoaim.fovDegrees > 0) {
    // Calculate direction to intercept point
    toIntercept.copy(autoaim.interceptPoint).sub(pos).normalize();

    // Check if current aim is within autoaim cone of intercept
    const dot = direction.dot(toIntercept);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
    const angleDeg = angleRad * (180 / Math.PI);

    if (angleDeg <= autoaim.fovDegrees) {
      // Within cone - correct to intercept point
      direction = toIntercept;
    }
  }

  const projectile = createEntity(world);
  const category: ProjectileCategory =
    weapon.category === 'ballistic' ? 'ballistic' : 'energy';

  addComponent(world, projectile, createTransform(pos.x, pos.y, pos.z));
  addComponent(
    world,
    projectile,
    createProjectile(
      owner,
      weapon.damage,
      weapon.projectileSpeed,
      weapon.range,
      direction,
      category,
      weapon.name as WeaponName,
      weapon.flakRadius,
      weapon.shrapnelCount,
    ),
  );
  addComponent(world, projectile, createCollision(PROJECTILE_RADIUS));

  // Projectiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, projectile, createFaction(ownerFaction.faction));
  }

  // Track per-ship stats
  recordShotFired(world, owner, weapon.name);

  // Track aggregate stats if enabled (for balance analysis)
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    stats.shotsFired[weapon.name] = (stats.shotsFired[weapon.name] || 0) + 1;
  }
}

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

/** Decoy collision radius */
const DECOY_RADIUS = 1.5;

// Reusable vector for decoy direction (avoid per-call allocations)
const decoyDirection = new THREE.Vector3();

/** Spawn a decoy entity (launches from bottom of ship with downward bias) */
export function spawnDecoy(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  ownerFaction: FactionComponent | undefined,
): void {
  // Get ship's local "down" direction (negative Y in local space)
  downAxis.set(0, -1, 0).applyQuaternion(ownerTransform.rotation);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(downAxis, DECOY_SPAWN_OFFSET);

  // Random direction biased downward (away from ship)
  const randomDir = randomUnitVector(world.prng);
  decoyDirection.set(randomDir.x, randomDir.y, randomDir.z);
  // Bias toward downward (ship's local down direction)
  decoyDirection.addScaledVector(downAxis, 1.5).normalize();

  const decoy = createEntity(world);

  // Create transform at spawn position
  const decoyTransform = createTransform(spawnPos.x, spawnPos.y, spawnPos.z);
  addComponent(world, decoy, decoyTransform);

  // Create decoy component
  addComponent(world, decoy, createDecoy(owner, decoyDirection));

  // Add collision (decoys can destroy missiles on contact)
  addComponent(world, decoy, createCollision(DECOY_RADIUS));

  // Add health (decoys have 1 HP like missiles)
  addComponent(world, decoy, createHealth(1));

  // Decoys inherit owner's faction
  if (ownerFaction) {
    addComponent(world, decoy, createFaction(ownerFaction.faction));
  }

  // Track per-ship stats
  recordDecoyDeployed(world, owner);

  // Track aggregate stats if enabled (for balance analysis)
  if (world.systemState.combatStats) {
    world.systemState.combatStats.decoysLaunched++;
  }
}
