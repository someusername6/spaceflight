/**
 * Beam System Helpers - Utility functions for beam weapons including
 * damage falloff, beam colors, object pooling, and damage application.
 */

import * as THREE from 'three';
import { injectExternalHeat } from '../../components/heat';
import { ionizeShields } from '../../components/shields';
import type { PrimaryWeapon } from '../../components/weapons';
import { entityExists, getComponent } from '../../core/ecs';
import type { ActiveBeam, Entity, World } from '../../core/types';
import { BEAM_HIT_INTERVAL } from '../../rendering/effects/projectile-hits';
import { dealDamage } from '../damage';
import { getForward } from '../physics';
import { recordBeamHit, recordDamage, recordShotHit } from '../stats';
import { calculateBankOffset } from './weapon-spawning';

// Re-export raycasting functions for backward compatibility
export {
  type BeamHitResult,
  type BeamHitResultMulti,
  findAllBeamHits,
  findBeamHit,
} from './beam-raycasting';

/** Beam spawn offset from ship center (forward) */
export const BEAM_SPAWN_OFFSET = 3;

/** Check if a continuous beam should queue a hit effect (throttled) */
export function shouldQueueBeamHit(
  beam: ActiveBeam,
  gameTime: number,
): boolean {
  const lastTime = beam.lastHitEffectTime ?? 0;
  return gameTime - lastTime >= BEAM_HIT_INTERVAL;
}

/** Beam weapon info for pooling (avoid per-frame allocations) */
export interface BeamWeaponInfo {
  weapon: PrimaryWeapon;
  index: number;
}

const beamWeaponPool: BeamWeaponInfo[] = [];
/** Get a pooled BeamWeaponInfo object */
export function getBeamWeaponInfo(
  world: World,
  weapon: PrimaryWeapon,
  index: number,
): BeamWeaponInfo {
  const poolIndex = world.systemState.pools.beamWeapon;
  if (poolIndex >= beamWeaponPool.length) {
    beamWeaponPool.push({ weapon: null as unknown as PrimaryWeapon, index: 0 });
  }
  const info = beamWeaponPool[poolIndex] as BeamWeaponInfo;
  world.systemState.pools.beamWeapon++;
  info.weapon = weapon;
  info.index = index;
  return info;
}

/** Reset the beam weapon pool for a new frame */
export function resetBeamWeaponPool(world: World): void {
  world.systemState.pools.beamWeapon = 0;
}

/** Distance for falloff calculation (caps damage when very close) */
export const MIN_FALLOFF_DISTANCE = 100;

/**
 * Calculate damage with 1/d falloff (linear inverse).
 * Less aggressive than 1/d² - beams are still useful at medium range.
 * @param baseDamage - Base damage value at reference distance
 * @param distance - Actual distance to target
 * @returns Damage adjusted for distance falloff
 */
export function calculateFalloffDamage(
  baseDamage: number,
  distance: number,
): number {
  const effectiveDistance = Math.max(MIN_FALLOFF_DISTANCE, distance);
  return baseDamage / (effectiveDistance / MIN_FALLOFF_DISTANCE);
}

// Cached beam colors (avoid per-frame allocation)
const BEAM_COLORS: Record<string, THREE.Color> = {
  'Red Laser': new THREE.Color(1, 0, 0),
  'Green Laser': new THREE.Color(0, 1, 0),
  'Blue Laser': new THREE.Color(0, 0, 1),
  Lightning: new THREE.Color(0.6, 0.8, 1.0), // Electric blue-white
  Torch: new THREE.Color(1.0, 0.6, 0.2), // Orange-white plasma cutter
  'Nuclear Lance': new THREE.Color(1.0, 0.95, 0.8), // Bright white-gold
};
const DEFAULT_BEAM_COLOR = new THREE.Color(1, 1, 1);

/**
 * Get beam color based on weapon name.
 * @param name - Weapon name
 * @returns Color for the beam visual
 */
export function getBeamColor(name: string): THREE.Color {
  return BEAM_COLORS[name] ?? DEFAULT_BEAM_COLOR;
}

/** Find beam state for a weapon slot */
export function findBeamState(
  beams: ActiveBeam[],
  weaponIndex: number,
): ActiveBeam | undefined {
  for (let i = 0; i < beams.length; i++) {
    if (beams[i]?.weaponIndex === weaponIndex) {
      return beams[i];
    }
  }
  return undefined;
}

/** Create a new ActiveBeam state object */
export function createActiveBeam(
  weaponName: string,
  weaponIndex: number,
  beamWidth: number | undefined,
  isPulse: boolean,
  isLance: boolean,
  isTorch: boolean,
  isInstantBeam: boolean,
): ActiveBeam {
  const beam: ActiveBeam = {
    origin: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    hitPoint: null,
    color: getBeamColor(weaponName).clone(),
    active: false,
    weaponIndex,
    weaponName,
    fadeStartTime: null,
  };
  if (beamWidth !== undefined) beam.beamWidth = beamWidth;
  if (isPulse) {
    beam.isPulseBeam = true;
    beam.lastPulseTime = 0;
    beam.pulseActive = false;
  }
  if (isLance) beam.isLance = true;
  if (isTorch) beam.isTorch = true;
  if (isInstantBeam) {
    beam.isInstantBeam = true;
    beam.lastInstantFireTime = 0;
  }
  return beam;
}

/** Update beam positions during fadeout so they follow ship orientation */
export function updateFadingBeams(
  world: World,
  activeBeams: Map<Entity, ActiveBeam[]>,
): void {
  const gameTime = world.systemState.gameTime;

  for (const [entity, beams] of activeBeams) {
    // Get entity's current transform (if it still exists)
    if (!entityExists(world, entity)) continue;
    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;

    const weapons = getComponent(world, entity, 'primaryWeapons');
    const totalBanks = weapons?.weapons.length ?? 1;

    for (const beam of beams) {
      if (beam.active) continue; // Active beams are already updated

      // Start fadeout if just became inactive
      if (beam.fadeStartTime === null) {
        beam.fadeStartTime = gameTime;
        // Reset pulse state so lightning renderer doesn't keep generating bolts
        beam.pulseActive = false;
      }

      // Calculate beam length BEFORE updating origin (need old positions)
      let beamLength = 200; // Fallback length
      if (beam.hitPoint) {
        const len = beam.origin.distanceTo(beam.hitPoint);
        if (len > 0) beamLength = len;
      }

      // Update beam position to follow ship orientation during fadeout
      const origin = calculateBankOffset(
        transform,
        beam.weaponIndex,
        totalBanks,
        BEAM_SPAWN_OFFSET,
      );
      const forward = getForward(transform);

      beam.origin.copy(origin);
      beam.direction.copy(forward);

      // Update hitPoint to extend forward using preserved beam length
      if (beam.hitPoint) {
        beam.hitPoint.copy(origin).addScaledVector(forward, beamLength);
      }
    }
  }
}

/** Parameters for applying beam damage and effects */
export interface BeamDamageParams {
  world: World;
  owner: Entity;
  target: Entity;
  weapon: PrimaryWeapon;
  damage: number;
  hitPoint: THREE.Vector3;
  beam: ActiveBeam;
  gameTime: number;
}

/**
 * Apply beam damage and special effects to a target.
 * Handles damage dealing, ionization, heat injection, hit effects, and stats.
 */
export function applyBeamDamageAndEffects(params: BeamDamageParams): void {
  const { world, owner, target, weapon, damage, hitPoint, beam, gameTime } =
    params;

  // Deal damage
  dealDamage(
    world,
    target,
    damage,
    hitPoint,
    weapon.shieldDamageMultiplier ?? 1,
    weapon.hullDamageMultiplier ?? 1,
    owner,
  );

  // Apply ionization effect (for future ion beams)
  if (weapon.ionize) {
    const targetShields = getComponent(world, target, 'shields');
    if (targetShields) {
      ionizeShields(targetShields, gameTime);
    }
  }

  // Apply heat injection (Torch weapon)
  if (weapon.heatInjection) {
    const targetHeat = getComponent(world, target, 'heat');
    if (targetHeat) {
      // heatInjection is per-second rate, damage is already scaled by dt
      // Scale heat injection proportionally
      const dt = damage / weapon.damage; // Recover dt from damage ratio
      injectExternalHeat(targetHeat, weapon.heatInjection * dt);
    }
  }

  // Queue hit visual effect with beam color
  // Throttle continuous beams to avoid spamming (pulse beams fire once per pulse)
  const shouldQueueHit =
    weapon.isPulseBeam || shouldQueueBeamHit(beam, gameTime);
  if (shouldQueueHit) {
    world.systemState.projectileHits.pending.push({
      x: hitPoint.x,
      y: hitPoint.y,
      z: hitPoint.z,
      category: 'energy',
      color: { r: beam.color.r, g: beam.color.g, b: beam.color.b },
      gameTime,
    });
    beam.lastHitEffectTime = gameTime;
  }

  // Track per-ship stats
  recordDamage(
    world,
    owner,
    target,
    weapon.name,
    'beam',
    damage,
    weapon.isPulseBeam,
  );
  if (weapon.isPulseBeam) {
    recordShotHit(world, owner, weapon.name, 'beam', true);
  } else {
    recordBeamHit(world, owner, weapon.name, damage / weapon.damage); // Recover dt
  }

  // Track aggregate beam damage stats (for balance analysis)
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    stats.beamDamage[weapon.name] =
      (stats.beamDamage[weapon.name] || 0) + damage;
  }
}
