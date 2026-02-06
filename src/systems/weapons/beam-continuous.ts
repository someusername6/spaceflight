/**
 * Continuous Beam Firing - Handles continuous and pulse beam weapon logic.
 */

import * as THREE from 'three';
import { addHeat } from '../../components/heat';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapon } from '../../components/weapons';
import { getEffectiveHeat } from '../../components/weapons';
import { getComponent } from '../../core/ecs';
import type { ActiveBeam, Entity, World } from '../../core/types';
import { recordBeamFired, recordShotFired } from '../stats';
import { applyAutoaimCorrection } from './autoaim';
import {
  applyBeamDamageAndEffects,
  BEAM_SPAWN_OFFSET,
  calculateFalloffDamage,
  createActiveBeam,
  findBeamHit,
  findBeamState,
  getBeamColor,
} from './beam-helpers';
import { getWeaponSpawnPosition } from './weapon-spawning';

// Reusable objects
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();

/** Fire a continuous beam and process hits */
export function fireContinuousBeam(
  world: World,
  owner: Entity,
  transform: Transform,
  weapon: PrimaryWeapon,
  weaponIndex: number,
  totalBanks: number,
  dt: number,
  activeBeams: Map<Entity, ActiveBeam[]>,
  direction: THREE.Vector3,
  targetEntity: Entity | undefined,
  autoaimBonus = 0,
): void {
  const gameTime = world.systemState.gameTime;
  // Calculate beam origin using hardpoint positions (or fallback to bank offset)
  getWeaponSpawnPosition(
    rayOrigin,
    world,
    owner,
    transform,
    weaponIndex,
    totalBanks,
    BEAM_SPAWN_OFFSET,
  );
  rayDirection.copy(direction);

  // Apply autoaim if weapon has autoaimFov or player has bonus, and target exists
  const baseAutoaim = weapon.autoaimFov ?? 0;
  const effectiveAutoaim = baseAutoaim + autoaimBonus;
  if (effectiveAutoaim > 0 && targetEntity !== undefined) {
    const targetTransform = getComponent(world, targetEntity, 'transform');
    if (targetTransform) {
      applyAutoaimCorrection(
        rayDirection,
        targetTransform.position,
        rayOrigin,
        effectiveAutoaim,
      );
    }
  }

  // Get or create beam array for this entity
  let beams = activeBeams.get(owner);
  if (!beams) {
    beams = [];
    activeBeams.set(owner, beams);
  }

  // Find or create beam state for this weapon slot
  let beam = findBeamState(beams, weaponIndex);
  const isPulse = weapon.isPulseBeam === true;
  const isLance = weapon.isInstantBeam === true;
  const isTorch = weapon.heatInjection !== undefined;
  if (!beam) {
    beam = createActiveBeam(
      weapon.name,
      weaponIndex,
      weapon.beamWidth,
      isPulse,
      isLance,
      isTorch,
      false, // Not instant beam (continuous)
    );
    beams.push(beam);
  }

  beam.origin.copy(rayOrigin);
  beam.direction.copy(rayDirection);
  beam.active = true;
  beam.fadeStartTime = null; // Reset fade when beam becomes active
  beam.hitPoint = null;
  beam.color.copy(getBeamColor(weapon.name));
  beam.weaponName = weapon.name;

  // Handle pulse beam timing (Lightning)
  let shouldDealDamage = true;
  if (weapon.isPulseBeam && weapon.pulseInterval) {
    const timeSinceLastPulse = gameTime - (beam.lastPulseTime ?? 0);
    if (timeSinceLastPulse >= weapon.pulseInterval) {
      beam.lastPulseTime = gameTime;
      beam.pulseActive = true;
      shouldDealDamage = true;
      // Add heat per pulse (need to get heat component)
      const heat = getComponent(world, owner, 'heat');
      if (heat) {
        const heatPerPulse = getEffectiveHeat(weapon);
        if (!addHeat(heat, heatPerPulse)) {
          // Overheated - don't fire this pulse
          beam.pulseActive = false;
          shouldDealDamage = false;
        } else {
          // Track pulse as a shot (pulse beams track shots, not time)
          recordShotFired(world, owner, weapon.name, 'beam', true);
        }
      }
    } else {
      // Between pulses - still show beam direction but no damage
      beam.pulseActive = false;
      shouldDealDamage = false;
    }
  }

  // Find nearest enemy in beam path
  const hitResult = findBeamHit(
    world,
    owner,
    rayOrigin,
    rayDirection,
    weapon.range,
  );

  // Reuse or create hitPoint vector (avoid per-frame allocation)
  if (!beam.hitPoint) {
    beam.hitPoint = new THREE.Vector3();
  }

  // Track beam time fired (for continuous beams)
  if (!weapon.isPulseBeam) {
    recordBeamFired(world, owner, weapon.name, dt);
  }

  if (hitResult.hit) {
    // Calculate hit point
    beam.hitPoint
      .copy(rayDirection)
      .multiplyScalar(hitResult.distance)
      .add(rayOrigin);

    // Apply damage if appropriate
    if (shouldDealDamage) {
      let damage: number;
      if (weapon.isPulseBeam) {
        // Pulse beams deal fixed damage per pulse (no dt scaling)
        damage = weapon.noFalloff
          ? weapon.damage
          : calculateFalloffDamage(weapon.damage, hitResult.distance);
      } else {
        // Continuous beams deal damage per second (scaled by dt)
        const falloffDamage = calculateFalloffDamage(
          weapon.damage,
          hitResult.distance,
        );
        damage = falloffDamage * dt;
      }
      applyBeamDamageAndEffects({
        world,
        owner,
        target: hitResult.entity,
        weapon,
        damage,
        hitPoint: beam.hitPoint,
        beam,
        gameTime,
        dt: weapon.isPulseBeam ? (weapon.pulseInterval ?? dt) : dt,
      });
    }
  } else {
    // No hit - beam extends to max range (or shorter for off-target pulse beams)
    const range = weapon.isPulseBeam
      ? Math.min(weapon.range, 150) // Tesla arc into nothingness
      : weapon.range;
    beam.hitPoint.copy(rayDirection).multiplyScalar(range).add(rayOrigin);
  }
}
