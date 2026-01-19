/**
 * Ambush Mission Launcher - Sets up convoy ambush missions.
 *
 * Handles:
 * - Spawning enemy convoy ships
 * - Spawning escort fighters with role-based behavior
 * - Positioning player to intercept the convoy
 * - Creating ambush mission state
 * - Mission end callbacks with reward calculation
 */

import { Quaternion, Vector3 } from 'three';
import { createDamageTracking } from '../../components/damage-tracking';
import { addComponent, getComponent } from '../../core/ecs';
import { logDebug } from '../../core/logger';
import { randomRange } from '../../core/prng';
import type { Entity, World } from '../../core/types';
import { Faction, MissionResult } from '../../core/types';
import { createConvoyShipEntity } from '../../factories/convoy-ship';
import { createEnemyShip } from '../../factories/ship';
import { createWaypointEntity } from '../../factories/waypoint';
import { type Game, TICK_SEC } from '../../game';
import {
  type AmbushMissionState,
  createAmbushMissionState,
  getAmbushRewardMultiplier,
  processAmbushMissionTick,
} from '../../systems/ambush-mission';
import type { CampaignController } from '../controller-types';
import type { AmbushEscort, AmbushMissionData, Contract } from '../types';
import { createMissionResultOverlay } from '../utils';
import { setFactionBehaviorMode } from './escort-launcher';
import { MISSION_END_DELAY, type MissionEndState } from './mission-waves';

/** Spacing between convoy ships in formation (X-axis) */
const CONVOY_SHIP_SPACING = 80;

/** Minimum spawn distance for escorts from convoy */
const ESCORT_MIN_DISTANCE = 100;
/** Maximum spawn distance for escorts from convoy */
const ESCORT_MAX_DISTANCE = 200;

interface AmbushSpawnPositions {
  convoyStart: Vector3;
  escapeZone: Vector3;
  playerSpawn: { position: Vector3; rotation: Quaternion };
  wingmenSpawns: Array<{ position: Vector3; rotation: Quaternion }>;
}

/**
 * Calculate spawn positions for ambush mission.
 *
 * Coordinate convention:
 * - Convoy starts at +Z (convoyStartDistance)
 * - Convoy travels toward -Z (escapeZoneDistance)
 * - Player spawns to the side, facing the convoy path
 */
function setupAmbushPositions(
  ambushData: AmbushMissionData,
  wingmenCount: number,
): AmbushSpawnPositions {
  const startDist = ambushData.convoyStartDistance ?? 500;
  const escapeDist = ambushData.escapeZoneDistance;

  // Convoy starts at +Z, escapes at -Z
  const convoyStart = new Vector3(0, 0, startDist);
  const escapeZone = new Vector3(0, 0, -escapeDist);

  // Player spawns to side of convoy path, equidistant from convoy and waypoint
  // Convoy at +startDist, waypoint at -escapeDist
  // Midpoint: (startDist - escapeDist) / 2
  const interceptZ = (startDist - escapeDist) / 2;
  const playerPos = new Vector3(1000, 0, interceptZ); // 1000m to the right of path

  // Face toward convoy path (toward -X direction, looking at convoy)
  const forward = new Vector3(0, 0, -1);
  const toConvoy = new Vector3(-1, 0, 0); // Looking left toward convoy
  const playerRot = new Quaternion().setFromUnitVectors(forward, toConvoy);

  // Wingmen spawn in formation near player (same pattern as other missions)
  const wingmenSpawns: Array<{ position: Vector3; rotation: Quaternion }> = [];
  for (let i = 0; i < wingmenCount; i++) {
    // Formation: staggered behind and beside player
    const offset = new Vector3(
      50 + (i % 2) * 30, // Slightly behind player (+X = right/back)
      (i - wingmenCount / 2) * 20, // Vertical spread
      50 * (Math.floor(i / 2) + 1), // Staggered Z (behind player)
    );
    wingmenSpawns.push({
      position: playerPos.clone().add(offset),
      rotation: playerRot.clone(),
    });
  }

  return {
    convoyStart,
    escapeZone,
    playerSpawn: { position: playerPos, rotation: playerRot },
    wingmenSpawns,
  };
}

/**
 * Spawn enemy convoy ships in formation.
 * IMPORTANT: Positioning logic MUST match setupAmbushMissionFromReplay()
 */
function spawnEnemyConvoyShips(
  world: World,
  positions: AmbushSpawnPositions,
  ambushData: AmbushMissionData,
): Entity[] {
  const entities: Entity[] = [];
  const escapeZone = positions.escapeZone;

  for (let i = 0; i < ambushData.convoySize; i++) {
    // Formation: X-axis spread, CONVOY_SHIP_SPACING between ships (deterministic)
    const offset = (i - (ambushData.convoySize - 1) / 2) * CONVOY_SHIP_SPACING;
    const position = positions.convoyStart
      .clone()
      .add(new Vector3(offset, 0, 0));

    const entity = createConvoyShipEntity(
      world,
      ambushData.convoyType,
      position,
      escapeZone,
      ambushData.escapeZoneRadius,
      i,
      8, // jumpChargeTime
      {
        faction: Faction.Neutral,
        stopDistance: ambushData.convoyStopDistance ?? 500,
        addDamageTracking: true,
      },
    );
    entities.push(entity);
  }

  return entities;
}

/**
 * Spawn escort fighters around the convoy.
 * Escorts are assigned behavior modes based on their role:
 * - aggressive: convoy-guard-aggressive (proactive + reactive)
 * - defensive: convoy-guard-defensive (reactive only)
 */
function spawnEscortFighters(
  world: World,
  escorts: AmbushEscort[],
  convoyPosition: Vector3,
): Entity[] {
  const entities: Entity[] = [];

  for (const spec of escorts) {
    for (let i = 0; i < spec.count; i++) {
      // Position uses PRNG - deterministic with same seed
      const angle = randomRange(world.prng, 0, Math.PI * 2);
      const distance = randomRange(
        world.prng,
        ESCORT_MIN_DISTANCE,
        ESCORT_MAX_DISTANCE,
      );
      const position = new Vector3(
        convoyPosition.x + Math.sin(angle) * distance,
        randomRange(world.prng, -20, 20),
        convoyPosition.z + Math.cos(angle) * distance,
      );

      const rotation = new Quaternion(); // Default facing
      const entity = createEnemyShip(
        world,
        spec.archetype,
        position,
        rotation,
        spec.skill,
      );

      // Set behavior mode based on role
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai) {
        ai.behaviorMode =
          spec.role === 'aggressive'
            ? 'convoy-guard-aggressive'
            : 'convoy-guard-defensive';
      }

      // Add damage tracking for reactive triggers
      addComponent(world, entity, createDamageTracking());

      entities.push(entity);
    }
  }

  return entities;
}

/** Setup ambush mission (called from mission launcher) */
export function setupAmbushMission(
  world: World,
  contract: Contract,
): AmbushMissionState {
  const ambushData = contract.ambushData;
  if (!ambushData) {
    throw new Error('Ambush mission requires ambushData');
  }

  // Mark as ambush mission
  world.systemState.mission.missionType = 'ambush';

  // Calculate positions
  const positions = setupAmbushPositions(ambushData, 0); // wingmen handled separately

  // Spawn enemy convoy ships
  const convoyEntities = spawnEnemyConvoyShips(world, positions, ambushData);
  logDebug(
    `[AMBUSH] Spawned ${convoyEntities.length} enemy convoy ships at Z=${positions.convoyStart.z}`,
  );

  // Spawn escort fighters around convoy
  const escortEntities = spawnEscortFighters(
    world,
    ambushData.escorts,
    positions.convoyStart,
  );
  const totalEscorts = escortEntities.length;
  logDebug(`[AMBUSH] Spawned ${totalEscorts} escort fighters`);

  // Spawn waypoint structure at escape zone
  createWaypointEntity(world, positions.escapeZone);
  logDebug(
    `[AMBUSH] Spawned waypoint structure at escape zone Z=${positions.escapeZone.z}`,
  );

  // Create mission state
  const state = createAmbushMissionState(
    positions.escapeZone,
    ambushData.escapeZoneRadius,
    ambushData.convoySize,
    ambushData.convoyStopDistance ?? 500,
  );

  // Set wingmen to convoy-interceptor mode
  // This makes them prioritize killing escorts, then approach convoy to stop it
  setFactionBehaviorMode(world, Faction.Player, 'convoy-interceptor');
  logDebug('[AMBUSH] Set wingmen to convoy-interceptor mode');

  logDebug('[AMBUSH] Mission setup complete');

  return state;
}

/** Create tick callback for ambush mission */
export function createAmbushTickCallback(
  controller: CampaignController,
  _game: Game,
  _contract: Contract,
  ambushState: AmbushMissionState,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): (world: World) => void {
  return (world: World) => {
    // Skip if mission already ended
    if (controller.missionEnded) return;

    // Handle mission end delay (same as wave missions)
    if (missionEndState.pending) {
      missionEndState.delayRemaining -= TICK_SEC;
      if (missionEndState.delayRemaining <= 0) {
        missionEndState.pending = false;
        executeMissionEnd().catch((e) => {
          throw e;
        });
      }
      return;
    }

    // Process ambush mission logic
    processAmbushMissionTick(world, ambushState);
  };
}

/** Create mission end callback for ambush mission */
export function createAmbushMissionEndCallback(
  controller: CampaignController,
  game: Game,
  ambushState: AmbushMissionState,
  missionEndState: MissionEndState,
): () => void {
  return () => {
    if (missionEndState.pending) return; // Already ending

    // Victory is determined by mission result (set by processAmbushMissionTick)
    missionEndState.victory =
      game.world.systemState.mission.result === MissionResult.Victory;
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;

    // Calculate reward multiplier based on convoy status
    if (missionEndState.victory) {
      missionEndState.rewardMultiplier = getAmbushRewardMultiplier(ambushState);
    } else {
      missionEndState.rewardMultiplier = 0;
    }

    // Store ambush results for display
    missionEndState.ambushResults = {
      convoyDestroyed: ambushState.destroyedConvoy,
      convoyStopped: ambushState.stoppedConvoy,
      convoyEscaped: ambushState.escapedConvoy,
      totalConvoy: ambushState.totalConvoy,
    };

    // Show VICTORY/DEFEAT overlay
    const isDefeat = !missionEndState.victory;
    const overlay = createMissionResultOverlay(isDefeat);
    controller.missionContainer?.appendChild(overlay);

    logDebug(
      `[AMBUSH] Mission ${missionEndState.victory ? 'Victory' : 'Defeat'} - ` +
        `Destroyed: ${ambushState.destroyedConvoy}, Stopped: ${ambushState.stoppedConvoy}, ` +
        `Escaped: ${ambushState.escapedConvoy} (${Math.round((missionEndState.rewardMultiplier ?? 0) * 100)}% reward)`,
    );
  };
}

/**
 * Get player spawn position for ambush mission.
 * Used by mission launcher to position player.
 */
export function getAmbushPlayerSpawn(ambushData: AmbushMissionData): {
  position: Vector3;
  rotation: Quaternion;
} {
  const positions = setupAmbushPositions(ambushData, 0);
  return positions.playerSpawn;
}

/**
 * Get wingmen spawn positions for ambush mission.
 * Used by mission launcher to position wingmen.
 */
export function getAmbushWingmenSpawns(
  ambushData: AmbushMissionData,
  wingmenCount: number,
): Array<{ position: Vector3; rotation: Quaternion }> {
  const positions = setupAmbushPositions(ambushData, wingmenCount);
  return positions.wingmenSpawns;
}
