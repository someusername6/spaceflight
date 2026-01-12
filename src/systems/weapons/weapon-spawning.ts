/**
 * Weapon Spawning - Creates projectile and missile entities.
 *
 * Each weapon bank has a distinct spawn point offset from ship center.
 */

import * as THREE from 'three';
import type { AimError } from '../../components/aim-error';
import { applyAimError } from '../../components/aim-error';
import type { FactionComponent } from '../../components/faction';
import { createFaction } from '../../components/faction';
import { createHealth } from '../../components/health';
import {
  createMissile,
  type MissileShrapnelConfig,
  type MissileType,
} from '../../components/missile';
import type {
  CreateProjectileOptions,
  ProjectileCategory,
  WeaponName,
} from '../../components/projectile';
import { createProjectile } from '../../components/projectile';
import type { Transform } from '../../components/transform';
import { createTransform } from '../../components/transform';
import type { SecondaryWeapon } from '../../components/weapons';
import { addComponent, createEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { createCollision } from '../collision';
import { getForward } from '../physics';
import { recordMissileLaunched, recordShotFired } from '../stats';

/** Spawn offsets from ship center */
const PROJECTILE_SPAWN_OFFSET = 3;
const MISSILE_SPAWN_OFFSET = 4; // Owner collision ignored for first 20m of travel

/** Lateral offset between weapon banks */
const BANK_LATERAL_OFFSET = 1.5;

/** Collision radii */
const PROJECTILE_RADIUS = 0.5;
const MISSILE_RADIUS = 1.0;

// Reusable vectors (avoid per-spawn allocations)
const spawnPos = new THREE.Vector3();
const rightAxis = new THREE.Vector3();
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
  const pos = calculateBankOffset(
    ownerTransform,
    bankIndex,
    totalBanks,
    PROJECTILE_SPAWN_OFFSET,
  );
  createProjectileEntity(
    world,
    owner,
    pos,
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
  const pos = calculateBankOffset(
    ownerTransform,
    bankIndex,
    totalBanks,
    PROJECTILE_SPAWN_OFFSET,
  );

  // Apply aim error if present
  let direction = aimError ? applyAimError(forward, aimError) : forward;

  // Apply autoaim correction if within cone
  if (autoaim && autoaim.fovDegrees > 0) {
    toIntercept.copy(autoaim.interceptPoint).sub(pos).normalize();
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
    pos,
    direction,
    weapon,
    ownerFaction,
    target,
  );
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

// Re-export spawnDecoy from decoy-spawning.ts for backwards compatibility
export { spawnDecoy } from './decoy-spawning';
