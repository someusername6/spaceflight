/**
 * Weapon Firing - Handles firing primary weapons with link modes and autoaim.
 */

import * as THREE from 'three';
import type { AimError } from '../../components/aim-error';
import type { FactionComponent } from '../../components/faction';
import type { Heat } from '../../components/heat';
import { addHeat } from '../../components/heat';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapon, PrimaryWeapons } from '../../components/weapons';
import {
  getEffectiveHeat,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { entityExists, getComponent } from '../../core/ecs';
import { calculateInterceptPoint } from '../../core/lead-calculation';
import type { Entity, World } from '../../core/types';
import { getPlayerAutoaim } from '../../settings/game-settings';
import {
  type AutoaimParams,
  spawnProjectileWithAimError,
} from './weapon-spawning';

const tempZeroVec = new THREE.Vector3(0, 0, 0);

/** Get the player autoaim bonus from settings (default 1 degree) */
export function getPlayerAutoaimBonus(): number {
  return getPlayerAutoaim();
}

/** Weapon info for firing (avoids per-frame allocations) */
interface FireableWeapon {
  weapon: PrimaryWeapon;
  index: number;
}
const fireableWeaponsCollector: FireableWeapon[] = [];

/**
 * Fire all weapons matching current link mode (shared by player and AI).
 *
 * Uses all-or-nothing heat check: either all linked weapons fire together,
 * or none fire. This prevents the weird visual of only some linked weapons
 * firing when near overheat.
 */
export function fireWeaponsByLinkMode(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  gameTime: number,
  aimError?: AimError,
  target?: Entity,
  isPlayer = false,
): void {
  const indices = getWeaponIndicesForCurrentMode(weapons);
  if (indices.length === 0) return;

  // Clear collector (reuse to avoid per-frame allocations)
  fireableWeaponsCollector.length = 0;

  // First pass: collect fireable weapons and find fastest fire rate
  let fastestFireRate = Infinity;
  for (const i of indices) {
    const w = weapons.weapons[i];
    if (!w || w.category === 'beam') continue; // Beams handled by beam system
    if (w.ammo !== undefined && w.ammo <= 0) continue; // No ammo
    fireableWeaponsCollector.push({ weapon: w, index: i });
    fastestFireRate = Math.min(fastestFireRate, w.fireRate);
  }

  if (fireableWeaponsCollector.length === 0) return;

  // Check fire rate
  const timeSinceFire = gameTime - weapons.lastFireTime;
  if (timeSinceFire < fastestFireRate) return;

  // Calculate total heat for all weapons (all-or-nothing for linked fire)
  let totalHeat = 0;
  for (const { weapon } of fireableWeaponsCollector) {
    totalHeat += getEffectiveHeat(weapon);
  }

  // Check if we can afford ALL the heat at once
  if (!addHeat(heat, totalHeat)) return;

  // Pre-calculate target info for autoaim (once, not per-weapon)
  let targetTransform: Transform | undefined;
  let targetVelocity = tempZeroVec;
  let ownerVelocity = tempZeroVec;
  if (target && entityExists(world, target)) {
    targetTransform = getComponent<Transform>(world, target, 'transform');
    const targetPhysics = getComponent<Physics>(world, target, 'physics');
    const ownerPhysics = getComponent<Physics>(world, entity, 'physics');
    if (targetPhysics) targetVelocity = targetPhysics.velocity;
    if (ownerPhysics) ownerVelocity = ownerPhysics.velocity;
  }

  // Fire all collected weapons
  weapons.lastFireTime = gameTime;
  const totalBanks = weapons.weapons.length;
  for (const { weapon, index } of fireableWeaponsCollector) {
    if (weapon.ammo !== undefined) weapon.ammo--;

    // Calculate autoaim if weapon has autoaimFov or isPlayer, and we have a target
    let autoaim: AutoaimParams | undefined;
    const baseAutoaim = weapon.autoaimFov ?? 0;
    const effectiveAutoaim = isPlayer
      ? baseAutoaim + getPlayerAutoaimBonus()
      : baseAutoaim;
    if (effectiveAutoaim > 0 && targetTransform) {
      const interceptPoint = calculateInterceptPoint(
        transform.position,
        ownerVelocity,
        targetTransform.position,
        targetVelocity,
        weapon.projectileSpeed,
      );
      if (interceptPoint) {
        autoaim = { interceptPoint, fovDegrees: effectiveAutoaim };
      }
    }

    spawnProjectileWithAimError(
      world,
      entity,
      transform,
      weapon,
      faction,
      aimError,
      index,
      totalBanks,
      autoaim,
      target, // Pass target for tracking projectiles (gyrojet)
    );
  }
}
