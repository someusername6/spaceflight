/**
 * Escort Mission Launcher - Sets up convoy escort missions.
 *
 * Handles:
 * - Spawning convoy ships
 * - Setting wingman AI to defensive mode
 * - Setting enemy AI to convoy-hunter mode
 * - Creating escort mission state
 * - Spawning enemies continuously
 */

import { Quaternion, Vector3 } from 'three';
import type { AIBehaviorMode } from '../../components/ai';
import { getComponent, queryEntities } from '../../core/ecs';
import { logDebug } from '../../core/logger';
import { randomRange } from '../../core/prng';
import type { Entity, World } from '../../core/types';
import { Faction } from '../../core/types';
import {
  createConvoyShipEntity,
  getConvoyCollisionRadius,
} from '../../factories/convoy-ship';
import { createEnemyShip } from '../../factories/ship';
import { type Game, TICK_SEC } from '../../game';
import { getConvoyCentroid } from '../../systems/ai/ai-utils';
import {
  createEscortMissionState,
  type EscortMissionState,
  processEscortMissionTick,
} from '../../systems/escort-mission';
import type { CampaignController } from '../controller-types';
import type { Contract, ContractEnemy, EscortMissionData } from '../types';
import { createMissionResultOverlay } from '../utils';
import { MISSION_END_DELAY, type MissionEndState } from './mission-waves';

/** Set AI behavior mode for all entities with a given faction */
export function setFactionBehaviorMode(
  world: World,
  faction: Faction,
  mode: AIBehaviorMode,
): void {
  for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
    const entityFaction = getComponent(world, entity, 'faction')!;
    if (entityFaction.faction !== faction) continue;

    const ai = getComponent(world, entity, 'aiControlled')!;
    ai.behaviorMode = mode;
  }
}

/** Wingman spawn X offset (from mission-launcher.ts) */
const WINGMAN_X_OFFSET = 20;
/** Approximate wingman collision radius */
const WINGMAN_COLLISION_RADIUS = 5;
/** Safety margin between collision boundaries */
const SPAWN_SAFETY_MARGIN = 10;

/** Spawn convoy ships in formation alongside player/wingmen */
export function spawnConvoyShips(
  world: World,
  escortData: EscortMissionData,
  escapeZonePosition: Vector3,
): Entity[] {
  const entities: Entity[] = [];
  const convoyRadius = getConvoyCollisionRadius(escortData.convoyType);

  // Calculate spacing to avoid overlap:
  // - Wingmen are at X=±20m with ~5m radius (outer edge at ~25m)
  // - Convoy ships need center offset of: wingman_edge + convoy_radius + margin
  const wingmanOuterEdge = WINGMAN_X_OFFSET + WINGMAN_COLLISION_RADIUS;
  const baseXOffset = wingmanOuterEdge + convoyRadius + SPAWN_SAFETY_MARGIN;

  // Spacing between convoy ships: 2 * convoy_radius + margin
  const spacing = convoyRadius * 2 + SPAWN_SAFETY_MARGIN;

  for (let i = 0; i < escortData.convoySize; i++) {
    // Alternate left/right, spreading outward from base offset
    const side = i % 2 === 0 ? 1 : -1;
    const rank = Math.floor(i / 2);
    const xOffset = side * (baseXOffset + rank * spacing);
    const position = new Vector3(xOffset, 0, 0);

    // Each ship gets a destination that maintains their X offset
    // This prevents convoy ships from converging and colliding
    const shipDestination = escapeZonePosition.clone();
    shipDestination.x = xOffset;

    const entity = createConvoyShipEntity(
      world,
      escortData.convoyType,
      position,
      shipDestination,
      escortData.escapeZoneRadius,
      i,
    );
    entities.push(entity);
  }

  return entities;
}

/** Minimum spawn distance from convoy path (perpendicular) */
const MIN_SPAWN_DISTANCE = 1500;
/** Maximum spawn distance from convoy path (perpendicular) */
const MAX_SPAWN_DISTANCE = 2500;

/** Convoy path start position (always origin) */
const CONVOY_START = new Vector3(0, 0, 0);

// Reusable vectors to avoid allocations
const _pathDir = new Vector3();
const _right = new Vector3();
const _interceptPoint = new Vector3();
const _spawnPos = new Vector3();
const _toIntercept = new Vector3();

/**
 * Spawn an enemy for escort mission (random from pool).
 *
 * Enemies spawn perpendicular to the convoy path (start -> escape zone),
 * targeting a point along that path ahead of the convoy's current position.
 */
export function spawnEscortEnemy(
  world: World,
  escortData: EscortMissionData,
  escapeZonePosition: Vector3,
): Entity | null {
  if (escortData.enemyPool.length === 0) return null;

  // Pick random enemy from pool
  const index = Math.floor(
    randomRange(world.prng, 0, escortData.enemyPool.length),
  );
  const spec = escortData.enemyPool[index] as ContractEnemy;

  // Convoy path is always from origin (0,0,0) to escape zone
  // This is the fixed geometry enemies spawn relative to
  _pathDir.copy(escapeZonePosition).sub(CONVOY_START).normalize();

  // Calculate right vector (perpendicular to convoy path, in XZ plane)
  _right.crossVectors(_pathDir, new Vector3(0, 1, 0)).normalize();

  // Get convoy's current position along the path
  const convoyCenter = getConvoyCentroid(world);
  const convoyProgress = convoyCenter
    ? convoyCenter.dot(_pathDir) / escapeZonePosition.length()
    : 0;

  // Pick an intercept point along the path, ahead of convoy
  // Random point between convoy position and 80% of the way to escape zone
  const minProgress = Math.max(0.1, convoyProgress + 0.1);
  const maxProgress = Math.min(0.8, convoyProgress + 0.4);
  const interceptProgress = randomRange(world.prng, minProgress, maxProgress);
  _interceptPoint
    .copy(CONVOY_START)
    .addScaledVector(escapeZonePosition, interceptProgress);

  // Random perpendicular distance from path
  const perpDistance = randomRange(
    world.prng,
    MIN_SPAWN_DISTANCE,
    MAX_SPAWN_DISTANCE,
  );

  // Random side (left or right of path)
  const side = randomRange(world.prng, 0, 1) > 0.5 ? 1 : -1;

  // Spawn position: perpendicular to path at intercept point
  _spawnPos.copy(_interceptPoint).addScaledVector(_right, perpDistance * side);

  // Face toward intercept point
  _toIntercept.copy(_interceptPoint).sub(_spawnPos).normalize();
  const forward = new Vector3(0, 0, -1);
  const rotation = new Quaternion().setFromUnitVectors(forward, _toIntercept);

  const entity = createEnemyShip(
    world,
    spec.archetype,
    _spawnPos.clone(), // Clone because createEnemyShip may store reference
    rotation,
    spec.skill,
  );

  // Set convoy-hunter mode
  const ai = getComponent(world, entity, 'aiControlled');
  if (ai) {
    ai.behaviorMode = 'convoy-hunter';
  }

  return entity;
}

/** Setup escort mission (called from mission launcher) */
export function setupEscortMission(
  world: World,
  contract: Contract,
): EscortMissionState {
  const escortData = contract.escortData;
  if (!escortData) {
    throw new Error('Escort mission requires escortData');
  }

  // Mark as escort mission (disables standard "no enemies = victory" check)
  world.systemState.mission.isEscortMission = true;

  // Calculate escape zone position
  const escapeZonePosition = new Vector3(0, 0, escortData.escapeZoneDistance);

  // Spawn convoy ships
  const convoyEntities = spawnConvoyShips(
    world,
    escortData,
    escapeZonePosition,
  );
  logDebug(
    `[ESCORT] Spawned ${convoyEntities.length} convoy ships heading to escape zone`,
  );

  // Set wingmen to defensive mode
  setFactionBehaviorMode(world, Faction.Player, 'defensive');
  logDebug('[ESCORT] Set wingmen to defensive mode');

  // Create escort state (enemies will spawn after initial delay)
  const state = createEscortMissionState(
    escapeZonePosition,
    escortData.escapeZoneRadius,
    escortData.jumpChargeTime,
    escortData.convoySize,
    escortData.spawnInterval,
    escortData.maxConcurrentEnemies,
    escortData.initialSpawnCount,
    escortData.spawnBatchSize,
  );

  logDebug('[ESCORT] Mission setup complete - enemies will spawn after delay');

  return state;
}

/** Create tick callback for escort mission */
export function createEscortTickCallback(
  _controller: CampaignController,
  _game: Game,
  contract: Contract,
  escortState: EscortMissionState,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): (world: World) => void {
  const escortData = contract.escortData!;
  const escapeZonePosition = escortState.escapeZonePosition.clone();

  return (world: World) => {
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

    // Process escort mission logic
    processEscortMissionTick(world, escortState, TICK_SEC, () =>
      spawnEscortEnemy(world, escortData, escapeZonePosition),
    );
  };
}

/** Create mission end callback for escort mission */
export function createEscortMissionEndCallback(
  controller: CampaignController,
  escortState: EscortMissionState,
  missionEndState: MissionEndState,
): () => void {
  return () => {
    if (missionEndState.pending) return; // Already ending

    missionEndState.victory =
      escortState.completed && escortState.jumpChargeProgress >= 1;
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;

    // Calculate reward multiplier based on convoy survival
    // Surviving convoy = those in escape zone when jump completed
    if (escortState.totalConvoy > 0) {
      missionEndState.rewardMultiplier =
        escortState.convoyInZone / escortState.totalConvoy;
    } else {
      missionEndState.rewardMultiplier = 0;
    }

    // Store escort results for display
    missionEndState.escortResults = {
      convoySurvived: escortState.convoyInZone,
      convoyTotal: escortState.totalConvoy,
    };

    // Show VICTORY/DEFEAT overlay (same as wave missions)
    const isDefeat = !missionEndState.victory;
    const overlay = createMissionResultOverlay(isDefeat);
    controller.missionContainer?.appendChild(overlay);

    logDebug(
      `[ESCORT] Mission ${missionEndState.victory ? 'Victory' : 'Defeat'} - ` +
        `${escortState.convoyInZone}/${escortState.totalConvoy} convoy survived (${Math.round((missionEndState.rewardMultiplier ?? 0) * 100)}% reward)`,
    );
  };
}
