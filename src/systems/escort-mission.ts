/**
 * Escort Mission System - Handles convoy escort mission logic.
 *
 * Tracks:
 * - Convoy ship survival
 * - Player position relative to escape zone
 * - Jump charge progress
 * - Continuous enemy spawning
 * - Victory/defeat conditions
 */

import type { Vector3 } from 'three';
import { isDead } from '../components/health';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';
import { Faction, MissionResult } from '../core/types';

/** Fixed delay before enemies start spawning (seconds) */
const INITIAL_SPAWN_DELAY = 10;

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
}

/** Create initial escort mission state */
export function createEscortMissionState(
  escapeZonePosition: Vector3,
  escapeZoneRadius: number,
  jumpChargeTime: number,
  convoySize: number,
  spawnInterval: number,
  maxConcurrentEnemies: number,
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
    playerInZone: false,
    spawnInterval,
    timeSinceSpawn: 0,
    maxConcurrentEnemies,
    completed: false,
    initialSpawnDelay: INITIAL_SPAWN_DELAY,
  };
}

/** Count living convoy ships */
function countLivingConvoy(world: World): number {
  let count = 0;
  for (const entity of queryEntities(world, ['convoyShip', 'health'])) {
    const health = getComponent(world, entity, 'health')!;
    if (!isDead(health)) count++;
  }
  return count;
}

/** Count convoy ships in escape zone */
function countConvoyInZone(world: World, state: EscortMissionState): number {
  let count = 0;
  for (const entity of queryEntities(world, [
    'convoyShip',
    'transform',
    'health',
  ])) {
    const health = getComponent(world, entity, 'health')!;
    if (isDead(health)) continue;

    const transform = getComponent(world, entity, 'transform')!;
    const distance = transform.position.distanceTo(state.escapeZonePosition);
    if (distance <= state.escapeZoneRadius) {
      count++;

      // Mark convoy ship as in zone (for UI/feedback)
      const convoyShip = getComponent(world, entity, 'convoyShip');
      if (convoyShip) {
        convoyShip.inEscapeZone = true;
      }
    }
  }
  return count;
}

/** Check if player is in escape zone (only actual player, not wingmen) */
function isPlayerInZone(world: World, state: EscortMissionState): boolean {
  for (const entity of queryEntities(world, [
    'playerControlled',
    'transform',
  ])) {
    const transform = getComponent(world, entity, 'transform')!;
    const distance = transform.position.distanceTo(state.escapeZonePosition);
    if (distance <= state.escapeZoneRadius) return true;
  }
  return false;
}

/** Check if the player is dead */
function isPlayerDead(world: World): boolean {
  for (const entity of queryEntities(world, ['playerControlled', 'health'])) {
    const health = getComponent(world, entity, 'health')!;
    if (!isDead(health)) return false; // Player is alive
  }
  // No living player found
  return true;
}

/** Count living enemy ships */
function countLivingEnemies(world: World): number {
  let count = 0;
  for (const entity of queryEntities(world, [
    'aiControlled',
    'health',
    'faction',
  ])) {
    const faction = getComponent(world, entity, 'faction')!;
    if (faction.faction !== Faction.Enemy) continue;

    const health = getComponent(world, entity, 'health')!;
    if (!isDead(health)) count++;
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

  // Count convoy
  const prevAlive = state.aliveConvoy;
  state.aliveConvoy = countLivingConvoy(world);
  if (state.aliveConvoy !== prevAlive) stateChanged = true;

  // Check defeat: all convoy destroyed
  if (state.aliveConvoy === 0) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Check defeat: player dead
  if (isPlayerDead(world)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Check positions
  const prevPlayerInZone = state.playerInZone;
  state.playerInZone = isPlayerInZone(world, state);
  state.convoyInZone = countConvoyInZone(world, state);
  if (state.playerInZone !== prevPlayerInZone) stateChanged = true;

  // Jump charge logic
  const prevCharge = state.jumpChargeProgress;
  if (state.playerInZone && state.convoyInZone > 0) {
    // Charging: player + at least one convoy in zone
    state.jumpChargeProgress += dt / state.jumpChargeTime;

    if (state.jumpChargeProgress >= 1) {
      // Victory!
      state.jumpChargeProgress = 1;
      state.completed = true;
      world.systemState.mission.result = MissionResult.Victory;
      return true;
    }
  } else {
    // Not charging: decay progress
    state.jumpChargeProgress = Math.max(
      0,
      state.jumpChargeProgress - dt * CHARGE_DECAY_RATE,
    );
  }
  if (Math.abs(state.jumpChargeProgress - prevCharge) > 0.001)
    stateChanged = true;

  // Enemy spawning (with initial delay before first enemies appear)
  if (state.initialSpawnDelay > 0) {
    state.initialSpawnDelay -= dt;
  } else {
    state.timeSinceSpawn += dt;

    // Only check enemy count when spawn interval has elapsed (avoid counting every tick)
    if (state.timeSinceSpawn >= state.spawnInterval) {
      const currentEnemies = countLivingEnemies(world);
      if (currentEnemies < state.maxConcurrentEnemies) {
        state.timeSinceSpawn = 0;
        spawnEnemy();
        stateChanged = true;
      }
    }
  }

  return stateChanged;
}

/** Get reward multiplier based on convoy survival */
export function getEscortRewardMultiplier(state: EscortMissionState): number {
  if (state.totalConvoy === 0) return 0;
  return state.convoyInZone / state.totalConvoy;
}

/** Get surviving convoy count (those that reached escape zone) */
export function getSurvivingConvoyCount(state: EscortMissionState): number {
  return state.convoyInZone;
}
