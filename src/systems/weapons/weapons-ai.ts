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
import { type AIControlled, AIState } from '../../components/ai';
import type { AimError } from '../../components/aim-error';
import { applyAimError } from '../../components/aim-error';
import type { FactionComponent } from '../../components/faction';
import type { Heat } from '../../components/heat';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapons,
  SecondaryWeapons,
} from '../../components/weapons';
import { findDecoyWeapon, setLinkModeByType } from '../../components/weapons';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import { calculateInterceptPoint } from '../../core/lead-calculation';
import type { Entity, World } from '../../core/types';
import { selectOptimalMissile } from '../ai/ai-missile-selection';
import {
  calculateFiringAngle,
  selectOptimalPrimaryWeapon,
} from '../ai/ai-weapon-selection';
import { spawnDecoy, spawnMissile } from './weapon-spawning';
import { fireWeaponsByLinkMode } from './weapons';

// Reusable vectors for dumbfire lead calculation
const tempAimDir = new THREE.Vector3();
const tempZeroVec = new THREE.Vector3(0, 0, 0);

/** Pre-built set of entities targeted by active missiles (rebuilt once per frame) */
const _missileTargetSet = new Set<Entity>();

/** Build the missile target set for O(1) incoming-missile checks. Call once per frame. */
export function buildMissileTargetSet(world: World): void {
  _missileTargetSet.clear();
  for (const entity of queryEntities(world, ['missile'])) {
    const missile = getComponent(world, entity, 'missile');
    if (missile?.target) {
      _missileTargetSet.add(missile.target);
    }
  }
}

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
  const targetTransform = getComponent(world, ai.target, 'transform');
  if (!targetTransform) return;

  const targetShields = getComponent(world, ai.target, 'shields');

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
  const aimError = getComponent(world, entity, 'aimError');

  // Set link mode based on selection
  if (selection.mode === 'linked') {
    // All weapons - set to 'all' mode
    setLinkModeByType(weapons, 'all');
  } else if (selection.mode === 'single' && selection.index !== undefined) {
    // Single weapon bank - set mode to bank index string (matches linkModes entries)
    setLinkModeByType(weapons, String(selection.index));
  }

  // Execute weapon selection (fire all weapons matching current link mode)
  if (selection.mode !== 'none') {
    fireWeaponsByLinkMode(
      world,
      entity,
      transform,
      weapons,
      heat,
      faction,
      gameTime,
      aimError,
      ai.target,
    );
  }
  // mode === 'none' - don't fire (conserving heat/ammo)
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
  aimError: AimError | undefined,
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
  const targetTransform = getComponent(world, ai.target, 'transform');
  if (!targetTransform) return;

  const targetPhysics = getComponent(world, ai.target, 'physics');
  const distance = transform.position.distanceTo(targetTransform.position);
  const isLocked = weapons.lockProgress >= 1;

  // Select optimal missile
  const selection = selectOptimalMissile(weapons, distance, isLocked);

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
  // Dumbfire rockets use aim error - rookies miss more often
  if (weapon.turnRate === 0) {
    const ownerPhysics = getComponent(world, entity, 'physics');
    const interceptPoint = calculateInterceptPoint(
      transform.position,
      ownerPhysics?.velocity ?? tempZeroVec,
      targetTransform.position,
      targetPhysics?.velocity ?? tempZeroVec,
      weapon.speed,
    );

    // Use intercept point if available, otherwise aim directly at target
    const aimPoint = interceptPoint ?? targetTransform.position;
    tempAimDir.copy(aimPoint).sub(transform.position).normalize();

    const finalDir = aimError
      ? applyAimError(tempAimDir, aimError).clone()
      : tempAimDir;
    spawnMissile(
      world,
      entity,
      transform,
      weapon,
      faction,
      ai.target,
      finalDir,
    );
    // Reset lock progress - must re-acquire lock for next missile
    weapons.lockProgress = 0;
    return;
  }

  // Tracking missiles or no intercept solution - fire at target
  spawnMissile(world, entity, transform, weapon, faction, weapons.lockTarget);
  // Reset lock progress - must re-acquire lock for next missile
  weapons.lockProgress = 0;
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

/** Check if any missiles are targeting this entity (O(1) via pre-built set) */
function hasIncomingMissiles(_world: World, entity: Entity): boolean {
  return _missileTargetSet.has(entity);
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
