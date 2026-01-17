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
import { createWaypointEntity } from '../../factories/waypoint';
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

/** Maximum ships per row (side by side) */
const SHIPS_PER_ROW = 3;

/** Z spacing between rows (front ships jump first) */
const ROW_Z_SPACING = 100;

/** Spawn convoy ships in formation that fits inside the waypoint structure */
export function spawnConvoyShips(
  world: World,
  escortData: EscortMissionData,
  escapeZonePosition: Vector3,
): Entity[] {
  const entities: Entity[] = [];
  const convoyRadius = getConvoyCollisionRadius(escortData.convoyType);

  // X spacing between ships in same row
  const xSpacing = convoyRadius * 2 + 10;

  for (let i = 0; i < escortData.convoySize; i++) {
    // Arrange in rows: first SHIPS_PER_ROW ships in front row, rest in back rows
    const row = Math.floor(i / SHIPS_PER_ROW);
    const posInRow = i % SHIPS_PER_ROW;
    const shipsInThisRow = Math.min(
      SHIPS_PER_ROW,
      escortData.convoySize - row * SHIPS_PER_ROW,
    );

    // X offset: center the row, alternate left/right from center
    // For odd count: 0, -1, +1 pattern. For even: -0.5, +0.5, -1.5, +1.5 pattern
    let xOffset: number;
    if (shipsInThisRow % 2 === 1) {
      // Odd number: center ship at 0, others alternate
      const centerIndex = Math.floor(shipsInThisRow / 2);
      const offsetFromCenter = posInRow - centerIndex;
      xOffset = offsetFromCenter * xSpacing;
    } else {
      // Even number: no center ship, straddle the center
      const halfIndex = posInRow - shipsInThisRow / 2 + 0.5;
      xOffset = halfIndex * xSpacing;
    }

    // Z offset: back rows start further back (they'll arrive and jump later)
    const zOffset = -row * ROW_Z_SPACING;

    const position = new Vector3(xOffset, 0, zOffset);

    // Destination maintains X offset (straight path, no turning)
    const shipDestination = escapeZonePosition.clone();
    shipDestination.x = xOffset;

    const entity = createConvoyShipEntity(
      world,
      escortData.convoyType,
      position,
      shipDestination,
      escortData.escapeZoneRadius,
      i,
      escortData.jumpChargeTime,
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

  // Spawn waypoint structure at escape zone
  createWaypointEntity(world, escapeZonePosition);
  logDebug('[ESCORT] Spawned waypoint structure at escape zone');

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

    // Victory if at least one convoy ship escaped (completed hyperspace jump)
    missionEndState.victory =
      escortState.completed && escortState.escapedConvoy > 0;
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;

    // Calculate reward multiplier based on convoy survival
    // escapedConvoy = ships that completed hyperspace jump
    if (escortState.totalConvoy > 0) {
      missionEndState.rewardMultiplier =
        escortState.escapedConvoy / escortState.totalConvoy;
    } else {
      missionEndState.rewardMultiplier = 0;
    }

    // Store escort results for display
    missionEndState.escortResults = {
      convoySurvived: escortState.escapedConvoy,
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
