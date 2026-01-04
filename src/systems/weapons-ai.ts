/**
 * AI Weapon System - Handles AI primary and secondary weapon firing.
 *
 * Uses smart weapon selection to pick optimal weapons based on:
 * - Range to target
 * - Heat level
 * - Ammo conservation
 * - Target shields
 * - Missile selection
 *
 * Uses AIProfile for per-entity behavior thresholds.
 */

import * as THREE from 'three';
import { type AIControlled, AIState } from '../components/ai';
import type { AimError } from '../components/aim-error';
import type { FactionComponent } from '../components/faction';
import type { Heat } from '../components/heat';
import { addHeat } from '../components/heat';
import type { Missile } from '../components/missile';
import type { Physics } from '../components/physics';
import type { Shields } from '../components/shields';
import type { Transform } from '../components/transform';
import type {
  PrimaryWeapon,
  PrimaryWeapons,
  SecondaryWeapons,
} from '../components/weapons';
import { findDecoyWeapon, getEffectiveHeat } from '../components/weapons';
import { entityExists, getComponent, queryEntities } from '../core/ecs';
import { calculateInterceptPoint } from '../core/lead-calculation';
import type { Entity, World } from '../core/types';
import { selectOptimalMissile } from './ai/ai-missile-selection';
import {
  calculateFiringAngle,
  selectOptimalPrimaryWeapon,
} from './ai/ai-weapon-selection';
import {
  spawnDecoy,
  spawnMissile,
  spawnProjectileWithAimError,
} from './weapon-spawning';
import { fireLinkedPrimaries } from './weapons';

// Reusable vectors for dumbfire lead calculation
const tempAimDir = new THREE.Vector3();
const tempZeroVec = new THREE.Vector3(0, 0, 0);

/** Handle AI primary weapon firing with smart weapon selection */
export function handleAIPrimaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  // Only fire when in Engage state
  if (ai.state !== AIState.Engage) return;

  // Need a valid target
  if (ai.target === null || !entityExists(world, ai.target)) return;

  // Get target information for weapon selection
  const targetTransform = getComponent<Transform>(
    world,
    ai.target,
    'transform',
  );
  if (!targetTransform) return;

  const targetShields = getComponent<Shields>(world, ai.target, 'shields');

  // Calculate distance and firing angle
  const distance = transform.position.distanceTo(targetTransform.position);
  const firingAngle = calculateFiringAngle(transform, targetTransform.position);

  // Select optimal weapon(s) using AI profile thresholds
  const selection = selectOptimalPrimaryWeapon(
    weapons,
    distance,
    heat,
    targetShields,
    firingAngle,
    ai.profile,
  );

  // Get aim error if present (makes AI imperfect)
  const aimError = getComponent<AimError>(world, entity, 'aimError');

  // Set linked flag so beam system knows to fire beams alongside projectiles
  weapons.linked = selection.mode === 'linked';

  // Execute weapon selection
  if (selection.mode === 'linked') {
    fireLinkedPrimaries(
      world,
      entity,
      transform,
      weapons,
      heat,
      faction,
      gameTime,
      aimError,
    );
  } else if (selection.mode === 'single' && selection.index !== undefined) {
    fireSinglePrimaryAI(
      world,
      entity,
      transform,
      weapons,
      heat,
      faction,
      gameTime,
      selection.index,
      aimError,
    );
  }
  // mode === 'none' - don't fire (conserving heat/ammo)
}

/** Fire a specific primary weapon for AI */
function fireSinglePrimaryAI(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  gameTime: number,
  weaponIndex: number,
  aimError?: AimError,
): void {
  const weapon = weapons.weapons[weaponIndex] as PrimaryWeapon | undefined;
  if (!weapon || weapon.category === 'beam') return; // Beams handled by beam system

  const timeSinceFire = gameTime - weapons.lastFireTime;
  if (timeSinceFire < weapon.fireRate) return;

  // Check ammo
  if (weapon.ammo !== undefined && weapon.ammo <= 0) return;

  // Check heat (scaled by bank size)
  if (!addHeat(heat, getEffectiveHeat(weapon))) return;

  weapons.lastFireTime = gameTime;
  if (weapon.ammo !== undefined) weapon.ammo--;

  spawnProjectileWithAimError(
    world,
    entity,
    transform,
    weapon,
    faction,
    aimError,
    weaponIndex,
    weapons.weapons.length,
  );
}

/** Handle AI secondary weapon firing with smart missile selection */
export function handleAISecondaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  // Check for incoming missiles and launch decoys defensively
  handleAIDecoys(world, entity, transform, weapons, faction, ai, gameTime);

  // Only fire offensive weapons when engaging
  if (
    ai.state !== AIState.Engage ||
    !ai.target ||
    !entityExists(world, ai.target)
  ) {
    return;
  }

  // Check fire rate cooldown
  const timeSinceFire = gameTime - weapons.lastFireTime;
  const fastestFireRate = getFastestMissileFireRate(weapons);
  if (timeSinceFire < fastestFireRate) return;

  // Get target information for missile selection
  const targetTransform = getComponent<Transform>(
    world,
    ai.target,
    'transform',
  );
  if (!targetTransform) return;

  const targetPhysics = getComponent<Physics>(world, ai.target, 'physics');
  const targetSpeed = targetPhysics?.velocity.length() ?? 0;
  const distance = transform.position.distanceTo(targetTransform.position);
  const isLocked = weapons.lockProgress >= 1;

  // Select optimal missile
  const selection = selectOptimalMissile(
    weapons,
    distance,
    targetSpeed,
    isLocked,
  );

  if (!selection.shouldFire) return;

  // For AI: Only update currentIndex to lock-requiring weapons
  // This allows lock to build for homing missiles while dumbfire missiles fire
  // Dumbfire missiles don't need the lock tracker, so we preserve the lock-requiring weapon index
  const selectedWeapon = weapons.weapons[selection.index];
  if (selectedWeapon?.requiresLock) {
    weapons.currentIndex = selection.index;
  } else {
    // When firing dumbfire, try to keep currentIndex on a lock-requiring weapon
    // so lock continues to build. Find the first lock-requiring weapon with ammo.
    let hasLockWeapon = false;
    for (let i = 0; i < weapons.weapons.length; i++) {
      const w = weapons.weapons[i];
      if (w?.requiresLock && w.count > 0 && !w.isDecoy) {
        weapons.currentIndex = i;
        hasLockWeapon = true;
        break;
      }
    }
    // If no lock-requiring weapons, just use the dumbfire index
    if (!hasLockWeapon) {
      weapons.currentIndex = selection.index;
    }
  }

  const weapon = weapons.weapons[selection.index];
  if (!weapon || weapon.isDecoy || weapon.count <= 0) return;

  // Final checks (using same logic as player)
  if (weapon.requiresLock && !isLocked) return;
  if (timeSinceFire < weapon.fireRate) return;

  // Fire the selected missile
  weapons.lastFireTime = gameTime;
  weapon.count--;

  // For dumbfire missiles (turnRate === 0), calculate lead intercept
  if (weapon.turnRate === 0) {
    const ownerPhysics = getComponent<Physics>(world, entity, 'physics');
    const ownerVelocity = ownerPhysics?.velocity ?? tempZeroVec;
    const targetVelocity = targetPhysics?.velocity ?? tempZeroVec;

    const interceptPoint = calculateInterceptPoint(
      transform.position,
      ownerVelocity,
      targetTransform.position,
      targetVelocity,
      weapon.speed,
    );

    if (interceptPoint) {
      // Aim at the lead point
      tempAimDir.copy(interceptPoint).sub(transform.position).normalize();
      spawnMissile(
        world,
        entity,
        transform,
        weapon,
        faction,
        ai.target,
        tempAimDir,
      );
      return;
    }
    // No intercept solution - fire straight at target as fallback
    tempAimDir
      .copy(targetTransform.position)
      .sub(transform.position)
      .normalize();
    spawnMissile(
      world,
      entity,
      transform,
      weapon,
      faction,
      ai.target,
      tempAimDir,
    );
    return;
  }

  // Tracking missiles or no intercept solution - fire at target
  spawnMissile(world, entity, transform, weapon, faction, weapons.lockTarget);
}

/** Get fastest fire rate among non-decoy missiles */
function getFastestMissileFireRate(weapons: SecondaryWeapons): number {
  let fastest = Infinity;
  for (const weapon of weapons.weapons) {
    if (!weapon.isDecoy && weapon.fireRate < fastest) {
      fastest = weapon.fireRate;
    }
  }
  return fastest === Infinity ? 0.5 : fastest;
}

/** Check if any missiles are targeting this entity */
function hasIncomingMissiles(world: World, entity: Entity): boolean {
  for (const missileEntity of queryEntities(world, ['missile'])) {
    const missile = getComponent<Missile>(world, missileEntity, 'missile');
    if (missile?.target === entity) return true;
  }
  return false;
}

/** Handle AI decoy launching when under missile threat */
function handleAIDecoys(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  // Check cooldown (use profile's decoy cooldown)
  if (gameTime - ai.lastDecoyTime < ai.profile.decoyCooldown) return;

  // Check if we have decoys
  const decoyResult = findDecoyWeapon(weapons);
  if (!decoyResult || decoyResult.weapon.count <= 0) return;

  // Check if there are incoming missiles
  if (!hasIncomingMissiles(world, entity)) return;

  // Launch decoy
  ai.lastDecoyTime = gameTime;
  decoyResult.weapon.count--;
  spawnDecoy(world, entity, transform, faction);
}
