/**
 * Instant Beam System - Handles instant beam weapons like Nuclear Lance.
 * These fire once on press, damage all targets in path, and fade out.
 */

import * as THREE from 'three';
import type { Heat } from '../../components/heat';
import { addHeat } from '../../components/heat';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapon, PrimaryWeapons } from '../../components/weapons';
import { cycleNextLinkMode, getEffectiveHeat } from '../../components/weapons';
import { getComponent } from '../../core/ecs';
import type { ActiveBeam, Entity, World } from '../../core/types';
import { recordShotFired } from '../stats';
import {
  applyBeamDamageAndEffects,
  BEAM_SPAWN_OFFSET,
  type BeamWeaponInfo,
  calculateFalloffDamage,
  createActiveBeam,
  findBeamState,
  getBeamColor,
} from './beam-helpers';
import { findAllBeamHits } from './beam-raycasting';
import { calculateBankOffset } from './weapon-spawning';
import { PLAYER_AUTOAIM_BONUS } from './weapons';

// Reusable objects
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const targetDirection = new THREE.Vector3();

/**
 * Handle instant beams (edge-triggered, fire only ONE, no linking).
 * Returns true if an instant beam was fired.
 */
export function handleInstantBeams(
  world: World,
  owner: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  activeBeams: Map<Entity, ActiveBeam[]>,
  direction: THREE.Vector3,
  instantBeamCollector: BeamWeaponInfo[],
  wasFiring: boolean,
  targetEntity: Entity | undefined,
  isPlayer = false,
): boolean {
  if (instantBeamCollector.length === 0 || wasFiring) {
    return false;
  }

  const totalBanks = weapons.weapons.length;
  const gameTime = world.systemState.gameTime;

  // Fire only the first instant beam that has ammo and is off cooldown
  for (const { weapon, index } of instantBeamCollector) {
    // Check ammo
    if (weapon.ammo !== undefined && weapon.ammo <= 0) {
      continue; // No ammo, try next
    }

    // Get or create beam state to check cooldown
    let beams = activeBeams.get(owner);
    if (!beams) {
      beams = [];
      activeBeams.set(owner, beams);
    }
    let beam = findBeamState(beams, index);
    if (!beam) {
      beam = createActiveBeam(
        weapon.name,
        index,
        weapon.beamWidth,
        false,
        true, // isLance
        false,
        true, // isInstantBeam
      );
      beams.push(beam);
    }

    // Check cooldown
    const lastFire = beam.lastInstantFireTime ?? 0;
    if (gameTime - lastFire < weapon.fireRate) {
      continue; // Still on cooldown, try next
    }

    // Check heat before firing
    const heatCost = getEffectiveHeat(weapon);
    if (!addHeat(heat, heatCost)) {
      continue; // Overheated, try next
    }

    // Fire the instant beam!
    fireInstantBeam(
      world,
      owner,
      transform,
      weapon,
      index,
      totalBanks,
      beam,
      direction,
      gameTime,
      targetEntity,
      isPlayer,
    );

    // Consume ammo
    if (weapon.ammo !== undefined) {
      weapon.ammo--;

      // Auto-switch to next weapon if empty
      if (weapon.ammo <= 0) {
        cycleNextLinkMode(weapons);
      }
    }

    // Only fire one instant beam per press
    return true;
  }

  return false;
}

/** Fire an instant beam (Nuclear Lance) - damages all targets in path */
function fireInstantBeam(
  world: World,
  owner: Entity,
  transform: Transform,
  weapon: PrimaryWeapon,
  weaponIndex: number,
  totalBanks: number,
  beam: ActiveBeam,
  direction: THREE.Vector3,
  gameTime: number,
  targetEntity: Entity | undefined,
  isPlayer = false,
): void {
  // Calculate beam origin with bank offset
  const origin = calculateBankOffset(
    transform,
    weaponIndex,
    totalBanks,
    BEAM_SPAWN_OFFSET,
  );
  rayOrigin.copy(origin);
  rayDirection.copy(direction);

  // Apply autoaim if weapon has autoaimFov or isPlayer, and target exists
  const baseAutoaim = weapon.autoaimFov ?? 0;
  const effectiveAutoaim = isPlayer
    ? baseAutoaim + PLAYER_AUTOAIM_BONUS
    : baseAutoaim;
  if (effectiveAutoaim > 0 && targetEntity !== undefined) {
    const targetTransform = getComponent<Transform>(
      world,
      targetEntity,
      'transform',
    );
    if (targetTransform) {
      // Calculate direction to target
      targetDirection.copy(targetTransform.position).sub(rayOrigin).normalize();

      // Check if target is within autoaim FOV
      const angleToTarget = rayDirection.angleTo(targetDirection);
      const fovRadians = (effectiveAutoaim * Math.PI) / 180;

      if (angleToTarget <= fovRadians) {
        // Target is within FOV - correct aim to target
        rayDirection.copy(targetDirection);
      }
    }
  }

  // Update beam state
  beam.origin.copy(rayOrigin);
  beam.direction.copy(rayDirection);
  beam.active = true;
  beam.fadeStartTime = null;
  beam.lanceFireTime = gameTime;
  beam.lastInstantFireTime = gameTime;
  beam.color.copy(getBeamColor(weapon.name));
  beam.weaponName = weapon.name;

  // Reuse or create hitPoint vector
  if (!beam.hitPoint) {
    beam.hitPoint = new THREE.Vector3();
  }

  // Find ALL targets in beam path
  const hits = findAllBeamHits(
    world,
    owner,
    rayOrigin,
    rayDirection,
    weapon.range,
  );

  // Track shot fired
  recordShotFired(world, owner, weapon.name, 'beam', false);

  if (hits.length > 0) {
    // Set hitPoint to farthest target hit (for beam visual)
    const farthestHit = hits[hits.length - 1];
    if (farthestHit) {
      beam.hitPoint
        .copy(rayDirection)
        .multiplyScalar(farthestHit.distance)
        .add(rayOrigin);
    }

    // Apply damage to ALL targets
    for (const hit of hits) {
      // Calculate hit point for this target
      const hitPoint = new THREE.Vector3()
        .copy(rayDirection)
        .multiplyScalar(hit.distance)
        .add(rayOrigin);

      // Full damage to all targets (no falloff for Nuclear Lance)
      const damage = weapon.noFalloff
        ? weapon.damage
        : calculateFalloffDamage(weapon.damage, hit.distance);

      applyBeamDamageAndEffects({
        world,
        owner,
        target: hit.entity,
        weapon,
        damage,
        hitPoint,
        beam,
        gameTime,
      });
    }
  } else {
    // No hits - beam extends to max range
    beam.hitPoint
      .copy(rayDirection)
      .multiplyScalar(weapon.range)
      .add(rayOrigin);
  }

  // Immediately start fadeout (instant beam visual effect)
  beam.fadeStartTime = gameTime;
  beam.active = false;
}
