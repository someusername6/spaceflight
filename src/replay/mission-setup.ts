/**
 * Replay Mission Setup
 *
 * Reconstructs mission state from replay metadata.
 * Unlike launchMission(), this doesn't touch campaign state.
 */

import { Quaternion, Vector3 } from 'three';
import {
  getAmbushPlayerSpawn,
  setupAmbushMission,
} from '../campaign/mission/ambush-launcher';
import {
  type AttackStationMissionState,
  processAttackStationMissionTick,
  setupAttackStationMission,
} from '../campaign/mission/attack-station-launcher';
import {
  setFactionBehaviorMode,
  setupEscortMission,
  spawnEscortEnemy,
} from '../campaign/mission/escort-launcher';
import {
  createWaveState,
  initializeFirstWave,
  processWaveTick,
  type WaveState,
} from '../campaign/mission/mission-waves';
import { setupStationDefenseMission } from '../campaign/mission/station-defense-launcher';
import type { Contract, MissionType } from '../campaign/types';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { Faction } from '../core/types';
import {
  type AmbushMissionState,
  processAmbushMissionTick,
} from '../systems/ambush-mission';
import {
  type EscortMissionState,
  processEscortMissionTick,
} from '../systems/escort-mission';
import type { StationDefenseMissionState } from '../systems/station-defense';
import { initMatchStats } from '../systems/stats';
import { getAllMissions } from '../ui/screens/contracts-data';
import {
  spawnPlayerFromReplayLoadout,
  spawnWingmanFromReplayLoadout,
} from './replay-ship-spawning';
import type { ReplayShipLoadout, ReplayWingman } from './types';

/**
 * Find mission contract by ID across all sectors.
 * Returns null if not found.
 */
export function findMissionById(missionId: string): Contract | null {
  const allMissions = getAllMissions();
  return allMissions.find((m) => m.id === missionId) ?? null;
}

/**
 * Result of setting up a replay world.
 */
export interface ReplayWorldSetup {
  world: World;
  mission: Contract;
  missionType: MissionType;
  /** Wave state for elimination missions */
  waveState?: WaveState;
  /** Escort state for escort missions */
  escortState?: EscortMissionState;
  /** Station defense state for station defense missions */
  stationState?: StationDefenseMissionState;
  /** Ambush state for ambush missions */
  ambushState?: AmbushMissionState;
  /** Attack station state for attack station missions */
  attackStationState?: AttackStationMissionState;
}

/**
 * Set up world for replay playback.
 * Creates player ship and wingmen using exact loadout from replay data.
 */
export function setupReplayWorld(
  seed: number,
  missionId: string,
  playerLoadout: ReplayShipLoadout,
  wingmen: ReplayWingman[],
  missionType?: MissionType,
): ReplayWorldSetup {
  // Find mission definition
  const mission = findMissionById(missionId);
  if (!mission) {
    throw new Error(`Mission not found: ${missionId}`);
  }

  // Create world with replay seed
  const world = createWorld(seed);

  // Initialize match stats (for damage tracking)
  initMatchStats(world);

  // Determine mission type early (needed for spawn position)
  const effectiveMissionType =
    missionType ?? mission.missionType ?? 'elimination';

  // Calculate player spawn position based on mission type
  let playerPos: Vector3;
  let playerRot: Quaternion;

  if (effectiveMissionType === 'ambush' && mission.ambushData) {
    // Ambush: spawn to side of convoy path
    const spawn = getAmbushPlayerSpawn(mission.ambushData);
    playerPos = spawn.position;
    playerRot = spawn.rotation;
  } else if (
    effectiveMissionType === 'attack-station' &&
    mission.attackStationData
  ) {
    // Attack station: spawn at origin facing -Z (toward station)
    playerPos = new Vector3(0, 0, 0);
    playerRot = new Quaternion();
  } else if (mission.stationDefenseData) {
    // Station defense: 1500m from station, facing station
    const stationZ = mission.stationDefenseData.stationDistance;
    playerPos = new Vector3(0, 0, stationZ + 1500);
    playerRot = new Quaternion();
  } else {
    // Other missions: spawn at origin facing -Z
    playerPos = new Vector3(0, 0, 0);
    playerRot = new Quaternion();
  }

  spawnPlayerFromReplayLoadout(world, playerLoadout, playerPos, playerRot);

  // Spawn wingmen from replay data
  for (const wingman of wingmen) {
    const pos = new Vector3(
      wingman.position.x,
      wingman.position.y,
      wingman.position.z,
    );
    spawnWingmanFromReplayLoadout(
      world,
      wingman.loadout,
      pos,
      playerRot,
      wingman.pilotName,
      wingman.pilotSkill,
    );
  }

  if (effectiveMissionType === 'ambush' && mission.ambushData) {
    // Setup ambush mission (spawns enemy convoy, escorts)
    const ambushState = setupAmbushMission(world, mission);

    return { world, mission, missionType: 'ambush', ambushState };
  }

  if (effectiveMissionType === 'escort' && mission.escortData) {
    // Set wingmen to defensive mode (same as live gameplay)
    setFactionBehaviorMode(world, Faction.Player, 'defensive');

    // Setup escort mission (spawns convoy, initial enemies)
    const escortState = setupEscortMission(world, mission);

    return { world, mission, missionType: 'escort', escortState };
  }

  if (
    effectiveMissionType === 'station-defense' &&
    mission.stationDefenseData
  ) {
    // Setup station defense mission (spawns station, initializes waves)
    const stationState = setupStationDefenseMission(world, mission);

    return { world, mission, missionType: 'station-defense', stationState };
  }

  if (effectiveMissionType === 'attack-station' && mission.attackStationData) {
    // Setup attack station mission (spawns enemy station, defenders)
    const attackStationState = setupAttackStationMission(world, mission);

    return {
      world,
      mission,
      missionType: 'attack-station',
      attackStationState,
    };
  }

  // Default: elimination mission with wave-based spawning
  const waves = mission.waves ?? [];
  const waveState = createWaveState(waves.length);
  initializeFirstWave(world, waveState, waves);

  return { world, mission, missionType: 'elimination', waveState };
}

/**
 * Process wave logic during replay tick.
 * Uses shared processWaveTick for determinism with live gameplay.
 */
export function tickReplayWaves(
  world: World,
  waveState: WaveState,
  mission: Contract,
  dt: number,
): void {
  // Use shared wave tick logic (identical to live gameplay)
  processWaveTick(world, waveState, mission, dt);
}

/**
 * Process escort mission logic during replay tick.
 * Uses shared processEscortMissionTick for determinism with live gameplay.
 */
export function tickReplayEscort(
  world: World,
  escortState: EscortMissionState,
  mission: Contract,
  dt: number,
): void {
  if (!mission.escortData) return;

  const escortData = mission.escortData;
  const escapeZonePosition = escortState.escapeZonePosition.clone();

  // Use shared escort tick logic (identical to live gameplay)
  processEscortMissionTick(world, escortState, dt, () => {
    spawnEscortEnemy(world, escortData, escapeZonePosition);
  });
}

/**
 * Check if the replay mission is complete (elimination missions).
 */
export function isReplayMissionComplete(waveState: WaveState): boolean {
  return (
    waveState.waveCleared && waveState.currentWave >= waveState.totalWaves - 1
  );
}

/**
 * Check if the escort replay mission is complete.
 */
export function isReplayEscortComplete(
  escortState: EscortMissionState,
): boolean {
  return escortState.completed;
}

/**
 * Process ambush mission logic during replay tick.
 * Uses shared processAmbushMissionTick for determinism with live gameplay.
 */
export function tickReplayAmbush(
  world: World,
  ambushState: AmbushMissionState,
): void {
  // Use shared ambush tick logic (identical to live gameplay)
  processAmbushMissionTick(world, ambushState);
}

/**
 * Check if the ambush replay mission is complete.
 */
export function isReplayAmbushComplete(
  ambushState: AmbushMissionState,
): boolean {
  return ambushState.completed;
}

/**
 * Process attack station mission logic during replay tick.
 * Uses shared processAttackStationMissionTick for determinism with live gameplay.
 */
export function tickReplayAttackStation(
  world: World,
  attackStationState: AttackStationMissionState,
  mission: Contract,
  dt: number,
): void {
  if (!mission.attackStationData) return;

  // Use shared attack station tick logic (identical to live gameplay)
  processAttackStationMissionTick(world, attackStationState, mission, dt);
}

/**
 * Check if the attack station replay mission is complete.
 */
export function isReplayAttackStationComplete(
  attackStationState: AttackStationMissionState,
): boolean {
  return attackStationState.completed;
}
