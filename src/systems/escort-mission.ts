/**
 * Escort Mission System - Handles convoy escort mission logic.
 * Tracks convoy survival, jump charging, enemy spawning, and victory/defeat.
 */

import { Vector3 } from 'three';
import { isDead } from '../components/health';
import { createHyperspaceJump } from '../components/hyperspace-jump';
import {
  addComponent,
  getComponent,
  hasComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction, MissionResult } from '../core/types';
import { isDefeatConditionMet } from '../multiplayer/mission-setup';

/** Fixed delay before enemies start spawning (seconds) */
const INITIAL_SPAWN_DELAY = 10;

/**
 * Radius within which convoy ships can charge their hyperspace jump.
 * Ships enter the larger escape zone (for braking), but only start charging
 * when within this smaller radius of their destination.
 * This ensures ships jump from near the waypoint, not from the zone edge.
 *
 * At 50m, ships charge while nearly stopped at their destination.
 * convoy-autopilot.ts uses JUMP_CHARGE_RADIUS + 10 as its full brake distance.
 * Together this gives ~185s mission duration for the standard distance formula.
 *
 * @internal Used by convoy-autopilot.ts - change both together if adjusting.
 */
export const JUMP_CHARGE_RADIUS = 50;

/** Escort mission runtime state */
export interface EscortMissionState {
  /** Whether escort mission logic is active */
  active: boolean;
  /** Escape zone position */
  escapeZonePosition: Vector3;
  /** Escape zone radius */
  escapeZoneRadius: number;
  /** Time required to charge jump (seconds) */
  jumpChargeTime: number;
  /** Current jump charge progress (0 to 1) */
  jumpChargeProgress: number;
  /** Total convoy ships at start */
  totalConvoy: number;
  /** Convoy ships still alive */
  aliveConvoy: number;
  /** Convoy ships in escape zone */
  convoyInZone: number;
  /** Convoy ships that have completed their hyperspace jump */
  escapedConvoy: number;
  /** Player is in escape zone */
  playerInZone: boolean;
  /** Enemy spawn interval (seconds) */
  spawnInterval: number;
  /** Time since last spawn */
  timeSinceSpawn: number;
  /** Maximum concurrent enemies */
  maxConcurrentEnemies: number;
  /** Mission completed (prevents re-triggering) */
  completed: boolean;
  /** Initial delay before first enemies spawn */
  initialSpawnDelay: number;
  /** Enemies to spawn when initial delay ends */
  initialSpawnCount: number;
  /** Enemies to spawn per interval */
  spawnBatchSize: number;
  /** Whether initial spawn has occurred */
  initialSpawnDone: boolean;
}

/** Default enemies to spawn when initial delay ends */
const DEFAULT_INITIAL_SPAWN_COUNT = 2;
/** Default enemies to spawn per interval */
const DEFAULT_SPAWN_BATCH_SIZE = 1;

/** Create initial escort mission state */
export function createEscortMissionState(
  escapeZonePosition: Vector3,
  escapeZoneRadius: number,
  jumpChargeTime: number,
  convoySize: number,
  spawnInterval: number,
  maxConcurrentEnemies: number,
  initialSpawnCount = DEFAULT_INITIAL_SPAWN_COUNT,
  spawnBatchSize = DEFAULT_SPAWN_BATCH_SIZE,
): EscortMissionState {
  return {
    active: true,
    escapeZonePosition: escapeZonePosition.clone(),
    escapeZoneRadius,
    jumpChargeTime,
    jumpChargeProgress: 0,
    totalConvoy: convoySize,
    aliveConvoy: convoySize,
    convoyInZone: 0,
    escapedConvoy: 0,
    playerInZone: false,
    spawnInterval,
    timeSinceSpawn: 0,
    maxConcurrentEnemies,
    completed: false,
    initialSpawnDelay: INITIAL_SPAWN_DELAY,
    initialSpawnCount: Math.min(initialSpawnCount, maxConcurrentEnemies),
    spawnBatchSize: Math.max(1, spawnBatchSize),
    initialSpawnDone: false,
  };
}

/** Count living convoy ships */
function countLivingConvoy(world: World): number {
  let count = 0;
  for (const entity of queryEntities(world, ['convoyShip', 'health'])) {
    const health = getComponent(world, entity, 'health');
    if (health && !isDead(health)) count++;
  }
  return count;
}

/**
 * Initiate hyperspace jump for a convoy ship.
 * Adds the hyperspaceJump component which triggers the visual effect and removal.
 */
function initiateConvoyJump(world: World, entity: Entity): void {
  const transform = getComponent(world, entity, 'transform');
  if (!transform) return;

  // Compute forward direction from rotation (forward is -Z in local space)
  const direction = new Vector3(0, 0, -1).applyQuaternion(transform.rotation);

  // Add hyperspace jump component
  addComponent(
    world,
    entity,
    createHyperspaceJump(direction, world.systemState.gameTime),
  );
}

/**
 * Update convoy ship states and count ships in escape zone.
 * Returns object with in-zone count and number of NEW jumps initiated this frame.
 *
 * Note: escapedConvoy is a persistent counter maintained by the caller.
 * This function only returns how many NEW ships initiated jumps this frame,
 * so the caller can increment the persistent counter.
 */
function updateConvoyShips(
  world: World,
  state: EscortMissionState,
  dt: number,
): { inZone: number; newJumps: number } {
  let inZone = 0;
  let newJumps = 0;

  for (const entity of queryEntities(world, [
    'convoyShip',
    'transform',
    'health',
  ])) {
    const health = getComponent(world, entity, 'health');
    if (!health || isDead(health)) continue;

    const convoyShip = getComponent(world, entity, 'convoyShip');
    if (!convoyShip) continue;

    // Ships already jumping or jumped - skip (they're already counted in escapedConvoy)
    if (
      convoyShip.jumpInitiated ||
      hasComponent(world, entity, 'hyperspaceJump')
    ) {
      continue;
    }

    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;
    const distance = transform.position.distanceTo(state.escapeZonePosition);
    const isInZone = distance <= state.escapeZoneRadius;

    // For charge zone, check Z distance to waypoint (not 3D distance)
    // This ensures ships charge when they reach the waypoint Z coordinate,
    // regardless of their X offset. Back row ships charge later since they
    // start further back and take longer to reach the waypoint Z.
    const autopilot = getComponent(world, entity, 'convoyAutopilot');
    const zDistToWaypoint = autopilot
      ? autopilot.destination.z - transform.position.z
      : state.escapeZonePosition.z - transform.position.z;
    const isInChargeZone = zDistToWaypoint <= JUMP_CHARGE_RADIUS;

    convoyShip.inEscapeZone = isInZone;

    if (isInZone) {
      inZone++;

      // Only charge when within the smaller charge zone (near waypoint center)
      if (isInChargeZone && convoyShip.jumpChargeTime > 0) {
        convoyShip.jumpChargeProgress += dt / convoyShip.jumpChargeTime;

        // Initiate hyperspace jump when charge completes
        if (convoyShip.jumpChargeProgress >= 1) {
          convoyShip.jumpChargeProgress = 1;
          convoyShip.jumpInitiated = true;
          initiateConvoyJump(world, entity);
          newJumps++;
        }
      }
      // Ships in zone but not in charge zone: maintain charge (no decay)
    } else {
      // Decay charge when outside escape zone entirely
      convoyShip.jumpChargeProgress = Math.max(
        0,
        convoyShip.jumpChargeProgress - dt * CHARGE_DECAY_RATE,
      );
    }
  }

  return { inZone, newJumps };
}

/** Check if player is in escape zone (only actual player, not wingmen) */
function isPlayerInZone(world: World, state: EscortMissionState): boolean {
  for (const entity of queryEntities(world, [
    'playerControlled',
    'transform',
  ])) {
    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;
    const distance = transform.position.distanceTo(state.escapeZonePosition);
    if (distance <= state.escapeZoneRadius) return true;
  }
  return false;
}

/** Count living enemy ships */
function countLivingEnemies(world: World): number {
  let count = 0;
  for (const entity of queryEntities(world, [
    'aiControlled',
    'health',
    'faction',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    if (!faction || faction.faction !== Faction.Enemy) continue;

    const health = getComponent(world, entity, 'health');
    if (health && !isDead(health)) count++;
  }
  return count;
}

/** Charge decay rate when not in zone (per second) */
const CHARGE_DECAY_RATE = 0.3;

/**
 * Process escort mission tick.
 *
 * @param world - Game world
 * @param state - Escort mission state
 * @param dt - Delta time
 * @param spawnEnemy - Callback to spawn an enemy (called when spawn timer fires)
 * @returns true if state changed (for UI updates)
 */
export function processEscortMissionTick(
  world: World,
  state: EscortMissionState,
  dt: number,
  spawnEnemy: () => void,
): boolean {
  if (!state.active || state.completed) return false;

  let stateChanged = false;

  // Check defeat: player dead (check first, before convoy updates)
  if (isDefeatConditionMet(world)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Check player position
  const prevPlayerInZone = state.playerInZone;
  state.playerInZone = isPlayerInZone(world, state);
  if (state.playerInZone !== prevPlayerInZone) stateChanged = true;

  // Update individual convoy ship states and jump charges
  // This must happen BEFORE the defeat check so we count new escapes
  const prevConvoyInZone = state.convoyInZone;
  const prevEscaped = state.escapedConvoy;
  const convoyStatus = updateConvoyShips(world, state, dt);
  state.convoyInZone = convoyStatus.inZone;
  // Increment persistent escaped count (never decrements)
  state.escapedConvoy += convoyStatus.newJumps;
  if (
    state.convoyInZone !== prevConvoyInZone ||
    state.escapedConvoy !== prevEscaped
  ) {
    stateChanged = true;
  }

  // Count living convoy (entities still in world, not yet jumped)
  const prevAlive = state.aliveConvoy;
  state.aliveConvoy = countLivingConvoy(world);
  if (state.aliveConvoy !== prevAlive) stateChanged = true;

  // Check end conditions when all convoy ships are gone
  if (state.aliveConvoy === 0) {
    state.convoyInZone = 0;
    state.completed = true;

    if (state.escapedConvoy > 0) {
      // Victory: at least one convoy escaped
      world.systemState.mission.result = MissionResult.Victory;
    } else {
      // Defeat: all convoy destroyed, none escaped
      world.systemState.mission.result = MissionResult.Defeat;
    }
    return true;
  }

  // Enemy spawning (with initial delay before first enemies appear)
  if (state.initialSpawnDelay > 0) {
    state.initialSpawnDelay -= dt;
  } else if (!state.initialSpawnDone) {
    // Initial spawn: spawn a batch when delay first ends
    state.initialSpawnDone = true;
    const currentEnemies = countLivingEnemies(world);
    const toSpawn = Math.min(
      state.initialSpawnCount,
      state.maxConcurrentEnemies - currentEnemies,
    );
    for (let i = 0; i < toSpawn; i++) {
      spawnEnemy();
    }
    if (toSpawn > 0) stateChanged = true;
  } else {
    state.timeSinceSpawn += dt;

    // Spawn up to batchSize enemies per interval (respecting max)
    if (state.timeSinceSpawn >= state.spawnInterval) {
      const currentEnemies = countLivingEnemies(world);
      const toSpawn = Math.min(
        state.spawnBatchSize,
        state.maxConcurrentEnemies - currentEnemies,
      );
      if (toSpawn > 0) {
        state.timeSinceSpawn = 0;
        for (let i = 0; i < toSpawn; i++) {
          spawnEnemy();
        }
        stateChanged = true;
      }
    }
  }

  return stateChanged;
}
