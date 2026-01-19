/**
 * Beam System - Handles continuous beam weapon firing and damage.
 * Instant beams (Nuclear Lance) are handled by beam-instant.ts.
 */

import type * as THREE from 'three';
import { AIState } from '../../components/ai';
import { isDead } from '../../components/health';
import type { Heat } from '../../components/heat';
import { addHeat } from '../../components/heat';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapons } from '../../components/weapons';
import {
  getEffectiveHeat,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import type { ActiveBeam, Entity, World } from '../../core/types';
import { getForward } from '../physics';
import { fireContinuousBeam } from './beam-continuous';
import {
  type BeamWeaponInfo,
  getBeamWeaponInfo,
  resetBeamWeaponPool,
  updateFadingBeams,
} from './beam-helpers';
import { handleInstantBeams } from './beam-instant';

// Re-export ActiveBeam for backward compatibility
export type { ActiveBeam } from '../../core/types';

// Reusable collectors (avoid per-frame allocations)
const beamWeaponsCollector: BeamWeaponInfo[] = [];
const instantBeamCollector: BeamWeaponInfo[] = [];

/** Beam system - handles continuous and instant beam damage */
export function beamSystem(world: World, dt: number): void {
  const activeBeams = world.systemState.beams.activeBeams;
  const prevFireState = world.systemState.beams.prevFireState;

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
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent(world, entity, 'transform');
    const heat = getComponent(world, entity, 'heat');
    if (!transform || !heat) continue;
    const weapons = getComponent(
      world,
      entity,
      'primaryWeapons',
    ) as PrimaryWeapons;
    const player = getComponent(world, entity, 'playerControlled');

    // Check if firing and calculate beam direction
    let isFiring = false;
    let beamDirection: THREE.Vector3 | null = null;
    let targetEntity: Entity | undefined;

    if (player) {
      // Player uses ship forward direction
      isFiring = player.input.firePrimary;
      if (isFiring) {
        beamDirection = getForward(transform);
        // Get player's current target for autoaim
        const targeting = getComponent(world, entity, 'targeting');
        targetEntity = targeting?.currentTarget;
      }
    } else {
      // AI fires beams when engaging with valid target
      const ai = getComponent(world, entity, 'aiControlled');
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
          targetEntity = ai.target;
        }
      }
    }

    // Get previous fire state for edge-triggering instant beams
    const wasFiring = prevFireState.get(entity) ?? false;

    if (isFiring && beamDirection) {
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
        wasFiring,
        targetEntity,
        !!player, // isPlayer - gets autoaim bonus
      );
    }

    // Update previous fire state
    prevFireState.set(entity, isFiring);
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
  wasFiring: boolean,
  targetEntity: Entity | undefined,
  isPlayer: boolean,
): void {
  // Reset pool and clear collectors (avoid per-frame allocations)
  resetBeamWeaponPool(world);
  beamWeaponsCollector.length = 0;
  instantBeamCollector.length = 0;

  // Find beam weapons matching current link mode, separate instant from continuous
  const indices = getWeaponIndicesForCurrentMode(weapons);
  for (const i of indices) {
    const weapon = weapons.weapons[i];
    if (weapon && weapon.category === 'beam') {
      const info = getBeamWeaponInfo(world, weapon, i);
      if (weapon.isInstantBeam) {
        instantBeamCollector.push(info);
      } else {
        beamWeaponsCollector.push(info);
      }
    }
  }

  // Handle instant beams (edge-triggered, fire only ONE, no linking)
  handleInstantBeams(
    world,
    owner,
    transform,
    weapons,
    heat,
    activeBeams,
    direction,
    instantBeamCollector,
    wasFiring,
    targetEntity,
    isPlayer,
  );

  // Handle continuous beams (existing logic)
  if (beamWeaponsCollector.length === 0) return;

  // Calculate total heat per second for all beams (scaled by bank size)
  let totalHeat = 0;
  for (const { weapon } of beamWeaponsCollector) {
    totalHeat += getEffectiveHeat(weapon);
  }
  const heatToAdd = totalHeat * dt;

  // Check if we can add all the heat
  if (!addHeat(heat, heatToAdd)) return; // Overheated

  // Fire all matching continuous beams
  const totalBanks = weapons.weapons.length;
  for (const { weapon, index } of beamWeaponsCollector) {
    fireContinuousBeam(
      world,
      owner,
      transform,
      weapon,
      index,
      totalBanks,
      dt,
      activeBeams,
      direction,
      targetEntity,
      isPlayer,
    );
  }
}

// Re-export BEAM_SPAWN_OFFSET for backward compatibility
export { BEAM_SPAWN_OFFSET } from './beam-helpers';

/** Get all active beams for rendering */
export function getActiveBeams(world: World): Map<Entity, ActiveBeam[]> {
  return world.systemState.beams.activeBeams;
}
