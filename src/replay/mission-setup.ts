/**
 * Replay Mission Setup
 *
 * Reconstructs mission state from replay metadata.
 * Unlike launchMission(), this doesn't touch campaign state.
 */

import { Quaternion, Vector3 } from 'three';
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
import {
  setupStationDefenseMission,
  spawnReinforcementForReplay,
} from '../campaign/mission/station-defense-launcher';
import type { Contract, MissionType } from '../campaign/types';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { Faction } from '../core/types';
import {
  type EscortMissionState,
  processEscortMissionTick,
} from '../systems/escort-mission';
import {
  processStationDefenseMissionTick,
  type StationDefenseMissionState,
} from '../systems/station-defense';
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
  playerAutoaim: number,
  missionType?: MissionType,
): ReplayWorldSetup {
  // Find mission definition
  const mission = findMissionById(missionId);
  if (!mission) {
    throw new Error(`Mission not found: ${missionId}`);
  }

  // Create world with replay seed
  const world = createWorld(seed);

  // Set replay autoaim override (affects weapon-firing.ts)
  world.replayAutoaim = playerAutoaim;

  // Initialize match stats (for damage tracking)
  initMatchStats(world);

  // Calculate player spawn position
  // Station defense: 1500m from station, facing station
  // Other missions: spawn at origin
  let playerSpawnZ = 0;
  if (mission.stationDefenseData) {
    const stationZ = mission.stationDefenseData.stationDistance;
    playerSpawnZ = stationZ + 1500;
  }

  // Spawn player facing -Z
  const playerPos = new Vector3(0, 0, playerSpawnZ);
  const playerRot = new Quaternion();
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

  // Determine mission type (from replay metadata or contract, defaults to elimination)
  const effectiveMissionType =
    missionType ?? mission.missionType ?? 'elimination';

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
 * Process station defense mission logic during replay tick.
 * Uses shared processStationDefenseMissionTick for determinism with live gameplay.
 */
export function tickReplayStationDefense(
  world: World,
  stationState: StationDefenseMissionState,
  mission: Contract,
  dt: number,
): void {
  if (!mission.stationDefenseData) return;

  const stationDefenseData = mission.stationDefenseData;

  // Use shared station defense tick logic (identical to live gameplay)
  processStationDefenseMissionTick(world, stationState, mission, dt, () =>
    spawnReinforcementForReplay(
      world,
      stationState.stationPosition,
      stationDefenseData.reinforcementPool,
      stationState.reinforcementsSpawned,
    ),
  );
}

/**
 * Check if the station defense replay mission is complete.
 */
export function isReplayStationDefenseComplete(
  stationState: StationDefenseMissionState,
): boolean {
  return stationState.completed;
}
