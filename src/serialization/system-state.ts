/**
 * SystemState Serialization - Beam and system state handling for world snapshots.
 */

import type { ActiveBeam, Entity, SystemState } from '../core/types';
import {
  deserializeColor,
  deserializeVector3,
  type SerializedColor,
  type SerializedVector3,
  serializeColor,
  serializeVector3,
} from './primitives';

// =============================================================================
// Serialized Types
// =============================================================================

/** Serialized active beam state */
export interface SerializedActiveBeam {
  origin: SerializedVector3;
  direction: SerializedVector3;
  hitPoint: SerializedVector3 | null;
  color: SerializedColor;
  active: boolean;
  weaponIndex: number;
  isPulseBeam?: boolean;
  pulseActive?: boolean;
  lastPulseTime?: number;
  isLance?: boolean;
  lanceFireTime?: number;
  isTorch?: boolean;
  weaponName?: string;
  beamWidth?: number;
  fadeStartTime: number | null;
  lastHitEffectTime?: number;
  isInstantBeam?: boolean;
  lastInstantFireTime?: number;
}

/** Serialized simulation-critical system state */
export interface SerializedSystemState {
  gameTime: number;
  weapons: {
    prevInput: {
      cyclePrimary: boolean;
      cycleSecondary: boolean;
      fireSecondary: boolean;
      launchDecoy: boolean;
    };
    lastDecoyFireTime: number;
  };
  targeting: {
    prevInput: {
      cycleTargetNext: boolean;
      cycleTargetPrev: boolean;
      targetNearest: boolean;
    };
  };
  flightAssist: {
    prevInput: {
      toggleMatchSpeed: boolean;
    };
  };
  beams: {
    activeBeams: Array<[Entity, SerializedActiveBeam[]]>;
    prevFireState: Array<[Entity, boolean]>;
  };
  mission: {
    result: import('../core/types').MissionResult;
    missionType:
      | 'elimination'
      | 'escort'
      | 'station-defense'
      | 'ambush'
      | 'attack-station';
  };
  shipIdentity: {
    callsignCounters: Record<string, number>;
  };
  pools: {
    beamWeapon: number;
    collidable: number;
    targetCollector: number;
  };
}

// =============================================================================
// Beam Serialization
// =============================================================================

function serializeActiveBeam(beam: ActiveBeam): SerializedActiveBeam {
  const result: SerializedActiveBeam = {
    origin: serializeVector3(beam.origin),
    direction: serializeVector3(beam.direction),
    hitPoint: beam.hitPoint ? serializeVector3(beam.hitPoint) : null,
    color: serializeColor(beam.color),
    active: beam.active,
    weaponIndex: beam.weaponIndex,
    fadeStartTime: beam.fadeStartTime,
  };
  if (beam.isPulseBeam !== undefined) result.isPulseBeam = beam.isPulseBeam;
  if (beam.pulseActive !== undefined) result.pulseActive = beam.pulseActive;
  if (beam.lastPulseTime !== undefined)
    result.lastPulseTime = beam.lastPulseTime;
  if (beam.isLance !== undefined) result.isLance = beam.isLance;
  if (beam.lanceFireTime !== undefined)
    result.lanceFireTime = beam.lanceFireTime;
  if (beam.isTorch !== undefined) result.isTorch = beam.isTorch;
  if (beam.weaponName !== undefined) result.weaponName = beam.weaponName;
  if (beam.beamWidth !== undefined) result.beamWidth = beam.beamWidth;
  if (beam.lastHitEffectTime !== undefined)
    result.lastHitEffectTime = beam.lastHitEffectTime;
  if (beam.isInstantBeam !== undefined)
    result.isInstantBeam = beam.isInstantBeam;
  if (beam.lastInstantFireTime !== undefined)
    result.lastInstantFireTime = beam.lastInstantFireTime;
  return result;
}

function deserializeActiveBeam(s: SerializedActiveBeam): ActiveBeam {
  const result: ActiveBeam = {
    origin: deserializeVector3(s.origin),
    direction: deserializeVector3(s.direction),
    hitPoint: s.hitPoint ? deserializeVector3(s.hitPoint) : null,
    color: deserializeColor(s.color),
    active: s.active,
    weaponIndex: s.weaponIndex,
    fadeStartTime: s.fadeStartTime,
  };
  if (s.isPulseBeam !== undefined) result.isPulseBeam = s.isPulseBeam;
  if (s.pulseActive !== undefined) result.pulseActive = s.pulseActive;
  if (s.lastPulseTime !== undefined) result.lastPulseTime = s.lastPulseTime;
  if (s.isLance !== undefined) result.isLance = s.isLance;
  if (s.lanceFireTime !== undefined) result.lanceFireTime = s.lanceFireTime;
  if (s.isTorch !== undefined) result.isTorch = s.isTorch;
  if (s.weaponName !== undefined) result.weaponName = s.weaponName;
  if (s.beamWidth !== undefined) result.beamWidth = s.beamWidth;
  if (s.lastHitEffectTime !== undefined)
    result.lastHitEffectTime = s.lastHitEffectTime;
  if (s.isInstantBeam !== undefined) result.isInstantBeam = s.isInstantBeam;
  if (s.lastInstantFireTime !== undefined)
    result.lastInstantFireTime = s.lastInstantFireTime;
  return result;
}

// =============================================================================
// SystemState Serialization
// =============================================================================

export function serializeSystemState(
  state: SystemState,
): SerializedSystemState {
  // Convert activeBeams Map to array
  const activeBeamsArray: Array<[Entity, SerializedActiveBeam[]]> = [];
  for (const [entity, beams] of state.beams.activeBeams) {
    activeBeamsArray.push([entity, beams.map(serializeActiveBeam)]);
  }

  // Convert prevFireState Map to array
  const prevFireStateArray: Array<[Entity, boolean]> = [];
  for (const [entity, fired] of state.beams.prevFireState) {
    prevFireStateArray.push([entity, fired]);
  }

  return {
    gameTime: state.gameTime,
    weapons: {
      prevInput: { ...state.weapons.prevInput },
      lastDecoyFireTime: state.weapons.lastDecoyFireTime,
    },
    targeting: {
      prevInput: { ...state.targeting.prevInput },
    },
    flightAssist: {
      prevInput: { ...state.flightAssist.prevInput },
    },
    beams: {
      activeBeams: activeBeamsArray,
      prevFireState: prevFireStateArray,
    },
    mission: {
      result: state.mission.result,
      missionType: state.mission.missionType,
    },
    shipIdentity: {
      callsignCounters: { ...state.shipIdentity.callsignCounters },
    },
    pools: { ...state.pools },
  };
}

export function deserializeSystemState(
  s: SerializedSystemState,
  target: SystemState,
): void {
  target.gameTime = s.gameTime;

  // Weapons
  target.weapons.prevInput.cyclePrimary = s.weapons.prevInput.cyclePrimary;
  target.weapons.prevInput.cycleSecondary = s.weapons.prevInput.cycleSecondary;
  target.weapons.prevInput.fireSecondary = s.weapons.prevInput.fireSecondary;
  target.weapons.prevInput.launchDecoy = s.weapons.prevInput.launchDecoy;
  target.weapons.lastDecoyFireTime = s.weapons.lastDecoyFireTime;

  // Targeting
  target.targeting.prevInput.cycleTargetNext =
    s.targeting.prevInput.cycleTargetNext;
  target.targeting.prevInput.cycleTargetPrev =
    s.targeting.prevInput.cycleTargetPrev;
  target.targeting.prevInput.targetNearest =
    s.targeting.prevInput.targetNearest;

  // Flight assist
  target.flightAssist.prevInput.toggleMatchSpeed =
    s.flightAssist.prevInput.toggleMatchSpeed;

  // Beams - reconstruct Maps
  target.beams.activeBeams.clear();
  for (const [entity, beams] of s.beams.activeBeams) {
    target.beams.activeBeams.set(entity, beams.map(deserializeActiveBeam));
  }
  target.beams.prevFireState.clear();
  for (const [entity, fired] of s.beams.prevFireState) {
    target.beams.prevFireState.set(entity, fired);
  }

  // Mission
  target.mission.result = s.mission.result;
  target.mission.missionType = s.mission.missionType;

  // Ship identity - clear and copy counters
  for (const key of Object.keys(target.shipIdentity.callsignCounters)) {
    delete target.shipIdentity.callsignCounters[key];
  }
  for (const [key, value] of Object.entries(s.shipIdentity.callsignCounters)) {
    target.shipIdentity.callsignCounters[key] = value;
  }

  // Pools
  target.pools.beamWeapon = s.pools.beamWeapon;
  target.pools.collidable = s.pools.collidable;
  target.pools.targetCollector = s.pools.targetCollector;
}
