/**
 * Beam System - Handles continuous beam weapon firing and damage.
 */

import * as THREE from 'three';
import { type AIControlled, AIState } from '../../components/ai';
import type { Health } from '../../components/health';
import { isDead } from '../../components/health';
import type { Heat } from '../../components/heat';
import { addHeat } from '../../components/heat';
import type { PlayerControlled } from '../../components/player';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapon, PrimaryWeapons } from '../../components/weapons';
import {
  getEffectiveHeat,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import type { ActiveBeam, Entity, World } from '../../core/types';
import { getForward } from '../physics';

// Re-export ActiveBeam for backward compatibility
export type { ActiveBeam } from '../../core/types';

import { dealDamage } from '../damage';
import {
  recordBeamFired,
  recordBeamHit,
  recordDamage,
  recordShotFired,
  recordShotHit,
} from '../stats';
import {
  BEAM_SPAWN_OFFSET,
  type BeamWeaponInfo,
  calculateFalloffDamage,
  createActiveBeam,
  findBeamHit,
  getBeamColor,
  getBeamWeaponInfo,
  resetBeamWeaponPool,
  shouldQueueBeamHit,
  updateFadingBeams,
} from './beam-helpers';
import { calculateBankOffset } from './weapon-spawning';

// Reusable objects
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const beamWeaponsCollector: BeamWeaponInfo[] = [];

/** Beam system - handles continuous beam damage */
export function beamSystem(world: World, dt: number): void {
  const activeBeams = world.systemState.beams.activeBeams;

  // Clear all beam states first
  for (const beams of activeBeams.values()) {
    for (const beam of beams) {
      beam.active = false;
    }
  }

  // Process each entity with primary weapons
  for (const entity of queryEntities(world, [
    'transform',
    'primaryWeapons',
    'heat',
  ])) {
    // Skip dead or dying entities (can't fire while exploding)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDead(health)) continue;

    // Query guarantees these components exist
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const weapons = getComponent<PrimaryWeapons>(
      world,
      entity,
      'primaryWeapons',
    ) as PrimaryWeapons;
    const heat = getComponent<Heat>(world, entity, 'heat') as Heat;
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );

    // Check if firing and calculate beam direction
    let isFiring = false;
    let beamDirection: THREE.Vector3 | null = null;

    if (player) {
      // Player uses ship forward direction
      isFiring = player.input.firePrimary;
      if (isFiring) {
        beamDirection = getForward(transform);
      }
    } else {
      // AI fires beams when engaging with valid target
      const ai = getComponent<AIControlled>(world, entity, 'aiControlled');
      if (
        ai &&
        ai.state === AIState.Engage &&
        ai.target !== null &&
        entityExists(world, ai.target)
      ) {
        // Fire beams if current link mode includes any beam weapons
        const indices = getWeaponIndicesForCurrentMode(weapons);
        for (const i of indices) {
          if (weapons.weapons[i]?.category === 'beam') {
            isFiring = true;
            break;
          }
        }

        if (isFiring) {
          // Beam fires in ship's forward direction (fixed mount)
          // Aim error is applied to ship rotation in AI pursuit
          beamDirection = getForward(transform);
        }
      }
    }

    if (!isFiring || !beamDirection) continue;

    // Fire beams matching current link mode
    fireBeamsByLinkMode(
      world,
      entity,
      transform,
      weapons,
      heat,
      dt,
      activeBeams,
      beamDirection,
    );
  }

  // Update fading beams (positions follow ship during fadeout)
  updateFadingBeams(world, activeBeams);
}

/** Fire beam weapons matching current link mode */
function fireBeamsByLinkMode(
  world: World,
  owner: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  dt: number,
  activeBeams: Map<Entity, ActiveBeam[]>,
  direction: THREE.Vector3,
): void {
  // Reset pool and clear collector (avoid per-frame allocations)
  resetBeamWeaponPool(world);
  beamWeaponsCollector.length = 0;

  // Find beam weapons matching current link mode
  const indices = getWeaponIndicesForCurrentMode(weapons);
  for (const i of indices) {
    const weapon = weapons.weapons[i];
    if (weapon && weapon.category === 'beam') {
      beamWeaponsCollector.push(getBeamWeaponInfo(world, weapon, i));
    }
  }

  if (beamWeaponsCollector.length === 0) return;

  // Calculate total heat per second for all beams (scaled by bank size)
  let totalHeat = 0;
  for (const { weapon } of beamWeaponsCollector) {
    totalHeat += getEffectiveHeat(weapon);
  }
  const heatToAdd = totalHeat * dt;

  // Check if we can add all the heat
  if (!addHeat(heat, heatToAdd)) return; // Overheated

  // Fire all matching beams
  const totalBanks = weapons.weapons.length;
  for (const { weapon, index } of beamWeaponsCollector) {
    fireBeam(
      world,
      owner,
      transform,
      weapon,
      index,
      totalBanks,
      dt,
      activeBeams,
      direction,
    );
  }
}

// Re-export BEAM_SPAWN_OFFSET for backward compatibility
export { BEAM_SPAWN_OFFSET } from './beam-helpers';

/** Fire a beam and process hits */
function fireBeam(
  world: World,
  owner: Entity,
  transform: Transform,
  weapon: PrimaryWeapon,
  weaponIndex: number,
  totalBanks: number,
  dt: number,
  activeBeams: Map<Entity, ActiveBeam[]>,
  direction: THREE.Vector3,
): void {
  const gameTime = world.systemState.gameTime;
  // Calculate beam origin with bank offset
  const origin = calculateBankOffset(
    transform,
    weaponIndex,
    totalBanks,
    BEAM_SPAWN_OFFSET,
  );
  rayOrigin.copy(origin);
  rayDirection.copy(direction); // Use provided direction (ship forward)

  // Get or create beam array for this entity
  let beams = activeBeams.get(owner);
  if (!beams) {
    beams = [];
    activeBeams.set(owner, beams);
  }

  // Find or create beam state for this weapon slot (loop instead of .find())
  let beam: ActiveBeam | undefined;
  for (let i = 0; i < beams.length; i++) {
    if (beams[i]?.weaponIndex === weaponIndex) {
      beam = beams[i];
      break;
    }
  }
  const isPulse = weapon.isPulseBeam === true;
  const isLance = weapon.name === 'Nuclear Lance';
  const isTorch = weapon.name === 'Torch';
  if (!beam) {
    beam = createActiveBeam(
      weapon.name,
      weaponIndex,
      weapon.beamWidth,
      isPulse,
      isLance,
      isTorch,
    );
    beams.push(beam);
  }

  beam.origin.copy(rayOrigin);
  beam.direction.copy(rayDirection);
  beam.active = true;
  beam.fadeStartTime = null; // Reset fade when beam becomes active
  beam.hitPoint = null;
  beam.color.copy(getBeamColor(weapon.name)); // Update color in case weapon changed
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
      const heat = getComponent<Heat>(world, owner, 'heat');
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
      dealDamage(
        world,
        hitResult.entity,
        damage,
        beam.hitPoint,
        weapon.shieldDamageMultiplier ?? 1,
        weapon.hullDamageMultiplier ?? 1,
      );

      // Queue hit visual effect with beam color
      // Throttle continuous beams to avoid spamming (pulse beams fire once per pulse)
      const shouldQueueHit =
        weapon.isPulseBeam || shouldQueueBeamHit(beam, gameTime);
      if (shouldQueueHit) {
        world.systemState.projectileHits.pending.push({
          x: beam.hitPoint.x,
          y: beam.hitPoint.y,
          z: beam.hitPoint.z,
          category: 'energy',
          color: { r: beam.color.r, g: beam.color.g, b: beam.color.b },
        });
        beam.lastHitEffectTime = gameTime;
      }

      // Track per-ship stats
      recordDamage(
        world,
        owner,
        hitResult.entity,
        weapon.name,
        'beam',
        damage,
        weapon.isPulseBeam,
      );
      if (weapon.isPulseBeam) {
        // Pulse beams track shots on target
        recordShotHit(world, owner, weapon.name, 'beam', true);
      } else {
        // Continuous beams track time on target
        recordBeamHit(world, owner, weapon.name, dt);
      }

      // Track aggregate beam damage stats (for balance analysis)
      if (world.systemState.combatStats) {
        const stats = world.systemState.combatStats;
        stats.beamDamage[weapon.name] =
          (stats.beamDamage[weapon.name] || 0) + damage;
      }
    }
  } else {
    // No hit - beam extends to max range (or shorter for off-target pulse beams)
    const range = weapon.isPulseBeam
      ? Math.min(weapon.range, 150) // Tesla arc into nothingness
      : weapon.range;
    beam.hitPoint.copy(rayDirection).multiplyScalar(range).add(rayOrigin);
  }
}

/** Get all active beams for rendering */
export function getActiveBeams(world: World): Map<Entity, ActiveBeam[]> {
  return world.systemState.beams.activeBeams;
}
