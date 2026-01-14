/**
 * Weapon Spawning - Creates projectile entities.
 *
 * Each weapon bank has a distinct spawn point offset from ship center.
 * Primary weapons spawn at hardpoint positions defined in ship data.
 */

import * as THREE from 'three';
import type { AimError } from '../../components/aim-error';
import { applyAimError } from '../../components/aim-error';
import type { FactionComponent } from '../../components/faction';
import { createFaction } from '../../components/faction';
import type {
  CreateProjectileOptions,
  ProjectileCategory,
  WeaponName,
} from '../../components/projectile';
import { createProjectile } from '../../components/projectile';
import type { ShipIdentity } from '../../components/ship-identity';
import type { Transform } from '../../components/transform';
import { createTransform } from '../../components/transform';
import { addComponent, createEntity, getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { getArchetype } from '../../factories/ship';
import { createCollision } from '../collision';
import { getForward } from '../physics';
import { recordShotFired } from '../stats';
import { getHardpointWorldPosition } from './hardpoint-positions';

/** Spawn offset from ship center */
const PROJECTILE_SPAWN_OFFSET = 3;

/** Lateral offset between weapon banks */
const BANK_LATERAL_OFFSET = 1.5;

/** Collision radius */
const PROJECTILE_RADIUS = 0.5;

// Reusable vectors (avoid per-spawn allocations)
const spawnPos = new THREE.Vector3();
const rightAxis = new THREE.Vector3();
const toIntercept = new THREE.Vector3();

/**
 * Get ship class name from entity's identity.
 * Returns undefined if entity has no shipIdentity or archetype has no ship class.
 */
function getShipClassName(world: World, entity: Entity): string | undefined {
  const identity = getComponent<ShipIdentity>(world, entity, 'shipIdentity');
  if (!identity) return undefined;

  const archetype = getArchetype(identity.archetype);
  return archetype?.shipClassName;
}

/**
 * Get spawn position for a weapon, using hardpoint data if available.
 * Falls back to symmetric bank distribution if hardpoints not defined.
 *
 * @param out - Vector3 to store the result (modified in place)
 * @param world - ECS world
 * @param owner - Entity firing the weapon
 * @param ownerTransform - Owner's current transform
 * @param bankIndex - Which weapon bank (0-indexed)
 * @param totalBanks - Total number of weapon banks
 * @param forwardOffset - Additional forward offset from ship center
 */
export function getWeaponSpawnPosition(
  out: THREE.Vector3,
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  bankIndex: number,
  totalBanks: number,
  forwardOffset: number,
): void {
  const shipClassName = getShipClassName(world, owner);

  if (shipClassName) {
    const found = getHardpointWorldPosition(
      out,
      ownerTransform,
      shipClassName,
      bankIndex,
      forwardOffset,
    );
    if (found) {
      return;
    }
  }

  // Fallback to symmetric bank distribution
  const fallbackPos = calculateBankOffset(
    ownerTransform,
    bankIndex,
    totalBanks,
    forwardOffset,
  );
  out.copy(fallbackPos);
}

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

  // Calculate right axis from ship's local right (accounts for roll/pitch)
  rightAxis.set(1, 0, 0).applyQuaternion(transform.rotation);

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

/** Weapon info for projectile spawning */
export interface ProjectileWeaponInfo {
  name: string;
  damage: number;
  projectileSpeed: number;
  range: number;
  category?: string; // WeaponCategory includes 'beam' but we filter that out
  flakRadius?: number;
  shrapnelCount?: number;
  shrapnelDamage?: number;
  shrapnelSpeed?: number;
  shrapnelRange?: number;
  shieldDamageMultiplier?: number;
  ionize?: boolean;
  // Gyrojet-style fields
  initialSpeed?: number;
  acceleration?: number;
  trackingRate?: number;
  trackingCone?: number;
  speedDamageScale?: boolean;
  autoaimFov?: number;
}

/** Build projectile options from weapon stats */
function buildProjectileOptions(
  weapon: ProjectileWeaponInfo,
  target?: Entity,
): CreateProjectileOptions | undefined {
  const options: CreateProjectileOptions = {};

  // Copy optional fields (only add if defined)
  if (weapon.flakRadius !== undefined) options.flakRadius = weapon.flakRadius;
  if (weapon.shrapnelCount !== undefined)
    options.shrapnelCount = weapon.shrapnelCount;
  if (weapon.shrapnelDamage !== undefined)
    options.shrapnelDamage = weapon.shrapnelDamage;
  if (weapon.shrapnelSpeed !== undefined)
    options.shrapnelSpeed = weapon.shrapnelSpeed;
  if (weapon.shrapnelRange !== undefined)
    options.shrapnelRange = weapon.shrapnelRange;
  if (weapon.shieldDamageMultiplier !== undefined)
    options.shieldDamageMultiplier = weapon.shieldDamageMultiplier;
  if (weapon.ionize !== undefined) options.ionize = weapon.ionize;
  if (weapon.speedDamageScale)
    options.speedDamageScale = weapon.speedDamageScale;

  // Gyrojet-style acceleration
  if (weapon.acceleration !== undefined) {
    options.acceleration = weapon.acceleration;
    options.maxSpeed = weapon.projectileSpeed;
  }

  // Tracking (gyrojet)
  if (weapon.trackingRate !== undefined) {
    options.trackingRate = weapon.trackingRate;
    if (weapon.trackingCone !== undefined)
      options.trackingCone = weapon.trackingCone;
    if (target !== undefined) options.trackingTarget = target;
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

/** Create and add projectile entity with all components */
function createProjectileEntity(
  world: World,
  owner: Entity,
  pos: THREE.Vector3,
  direction: THREE.Vector3,
  weapon: ProjectileWeaponInfo,
  ownerFaction: FactionComponent | undefined,
  target?: Entity,
): void {
  const projectile = createEntity(world);
  const category: ProjectileCategory =
    weapon.category === 'ballistic' ? 'ballistic' : 'energy';
  const startSpeed = weapon.initialSpeed ?? weapon.projectileSpeed;
  const options = buildProjectileOptions(weapon, target);

  addComponent(world, projectile, createTransform(pos.x, pos.y, pos.z));
  addComponent(
    world,
    projectile,
    createProjectile(
      owner,
      weapon.damage,
      startSpeed,
      weapon.range,
      direction,
      category,
      weapon.name as WeaponName,
      options,
    ),
  );
  addComponent(world, projectile, createCollision(PROJECTILE_RADIUS));

  if (ownerFaction) {
    addComponent(world, projectile, createFaction(ownerFaction.faction));
  }

  // Queue muzzle flash at spawn position
  world.systemState.muzzleFlashes.pending.push({
    x: pos.x,
    y: pos.y,
    z: pos.z,
    weaponName: weapon.name,
  });

  recordShotFired(world, owner, weapon.name);
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    stats.shotsFired[weapon.name] = (stats.shotsFired[weapon.name] || 0) + 1;
  }
}

/** Spawn a projectile entity */
export function spawnProjectile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: ProjectileWeaponInfo,
  ownerFaction: FactionComponent | undefined,
  bankIndex = 0,
  totalBanks = 1,
  target?: Entity,
): void {
  const forward = getForward(ownerTransform);
  getWeaponSpawnPosition(
    spawnPos,
    world,
    owner,
    ownerTransform,
    bankIndex,
    totalBanks,
    PROJECTILE_SPAWN_OFFSET,
  );

  createProjectileEntity(
    world,
    owner,
    spawnPos,
    forward,
    weapon,
    ownerFaction,
    target,
  );
}

/** Spawn a projectile with aim error and optional autoaim correction */
export function spawnProjectileWithAimError(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: ProjectileWeaponInfo,
  ownerFaction: FactionComponent | undefined,
  aimError: AimError | undefined,
  bankIndex = 0,
  totalBanks = 1,
  autoaim?: AutoaimParams,
  target?: Entity,
): void {
  const forward = getForward(ownerTransform);
  getWeaponSpawnPosition(
    spawnPos,
    world,
    owner,
    ownerTransform,
    bankIndex,
    totalBanks,
    PROJECTILE_SPAWN_OFFSET,
  );

  // Apply aim error if present
  let direction = aimError ? applyAimError(forward, aimError) : forward;

  // Apply autoaim correction if within cone
  if (autoaim && autoaim.fovDegrees > 0) {
    toIntercept.copy(autoaim.interceptPoint).sub(spawnPos).normalize();
    const dot = direction.dot(toIntercept);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
    const angleDeg = angleRad * (180 / Math.PI);
    if (angleDeg <= autoaim.fovDegrees) {
      direction = toIntercept;
    }
  }

  createProjectileEntity(
    world,
    owner,
    spawnPos,
    direction,
    weapon,
    ownerFaction,
    target,
  );
}

// Re-export for backwards compatibility
export { spawnDecoy } from './decoy-spawning';
export { spawnMissile } from './missile-spawning';
