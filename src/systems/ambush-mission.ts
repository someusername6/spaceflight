/**
 * Ambush Mission System - Handles convoy ambush mission logic.
 *
 * Victory conditions:
 * - All convoy destroyed → immediate victory (no need to kill escorts)
 * - All convoy destroyed or stopped AND all escorts dead → victory
 *
 * Defeat: Player dies OR any convoy ship escapes (reaches waypoint)
 */

import type { Vector3 } from 'three';
import { isDead } from '../components/health';
import { getComponent, hasComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction, MissionResult } from '../core/types';
import { isDefeatConditionMet } from '../multiplayer/mission-setup';

export interface AmbushMissionState {
  active: boolean;
  escapeZonePosition: Vector3;
  escapeZoneRadius: number;
  totalConvoy: number;
  aliveConvoy: number;
  stoppedConvoy: number;
  destroyedConvoy: number;
  escapedConvoy: number; // Triggers defeat if > 0
  convoyStopDistance: number;
  completed: boolean;
}

export function createAmbushMissionState(
  escapeZonePosition: Vector3,
  escapeZoneRadius: number,
  convoySize: number,
  convoyStopDistance: number,
): AmbushMissionState {
  return {
    active: true,
    escapeZonePosition: escapeZonePosition.clone(),
    escapeZoneRadius,
    totalConvoy: convoySize,
    aliveConvoy: convoySize,
    stoppedConvoy: 0,
    destroyedConvoy: 0,
    escapedConvoy: 0,
    convoyStopDistance,
    completed: false,
  };
}

/**
 * Count convoy status - alive, stopped, escaped.
 * Escape is detected when convoy enters escape zone and completes jump charge.
 *
 * Unlike escort missions where convoy escaping is good, here it's defeat.
 * Convoy ships are Enemy faction in ambush missions (enables weapon targeting).
 */
function countConvoyStatus(world: World): {
  alive: number;
  stopped: number;
  escaped: number;
  destroyed: number;
} {
  let alive = 0;
  let stopped = 0;
  let escaped = 0;
  let destroyed = 0;

  for (const entity of queryEntities(world, [
    'convoyShip',
    'faction',
    'health',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Enemy) continue;

    const health = getComponent(world, entity, 'health');
    if (!health || isDead(health)) {
      destroyed++;
      continue;
    }

    alive++;

    const convoyShip = getComponent(world, entity, 'convoyShip');
    if (!convoyShip) continue;

    if (convoyShip.isStopped) {
      stopped++;
    } else if (convoyShip.jumpInitiated) {
      // Convoy completed jump charge and escaped - DEFEAT trigger
      escaped++;
    }
  }

  return { alive, stopped, escaped, destroyed };
}

/**
 * Check if any enemy escorts are still alive.
 * Escorts are Enemy faction ships that are NOT convoy ships.
 */
function hasLivingEnemyEscorts(world: World): boolean {
  for (const entity of queryEntities(world, [
    'faction',
    'health',
    'shipIdentity',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Enemy) continue;

    // Skip convoy ships (they're Neutral now, but double-check)
    if (hasComponent(world, entity, 'convoyShip')) continue;

    const health = getComponent(world, entity, 'health');
    if (health && !isDead(health)) return true;
  }
  return false;
}

/**
 * Check if convoy should stop (ambush mission only).
 * Convoy stops permanently when:
 * - No enemy escorts within stopDistance AND
 * - Player ship within stopDistance
 *
 * Once stopped, convoy never restarts.
 * Convoy ships are Enemy faction in ambush missions.
 */
export function checkConvoyStop(world: World, entity: Entity): boolean {
  // Only for enemy faction convoys (ambush missions)
  const faction = getComponent(world, entity, 'faction');
  if (faction?.faction !== Faction.Enemy) return false;

  const convoyShip = getComponent(world, entity, 'convoyShip');
  if (!convoyShip) return false;
  if (convoyShip.isStopped) return true; // Already stopped, stay stopped

  // Stop distance stored on component (set during entity creation)
  const stopDistance = convoyShip.stopDistance;
  if (stopDistance === undefined) return false; // No stop behavior configured

  const transform = getComponent(world, entity, 'transform');
  if (!transform) return false;

  const pos = transform.position;

  // Check for nearby enemy escorts
  let hasNearbyEscort = false;
  for (const other of queryEntities(world, [
    'aiControlled',
    'faction',
    'health',
    'shipIdentity',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    if (otherFaction?.faction !== Faction.Enemy) continue;

    // Skip convoy ships themselves
    if (hasComponent(world, other, 'convoyShip')) continue;

    const health = getComponent(world, other, 'health');
    if (!health || isDead(health)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    if (!otherTransform) continue;

    if (pos.distanceTo(otherTransform.position) <= stopDistance) {
      hasNearbyEscort = true;
      break;
    }
  }

  if (hasNearbyEscort) return false; // Escorts nearby, keep moving

  // Check for nearby player threats
  for (const other of queryEntities(world, [
    'faction',
    'health',
    'transform',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    if (otherFaction?.faction !== Faction.Player) continue;

    const health = getComponent(world, other, 'health');
    if (!health || isDead(health)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    if (!otherTransform) continue;
    if (pos.distanceTo(otherTransform.position) <= stopDistance) {
      // Stop permanently
      convoyShip.isStopped = true;
      return true;
    }
  }

  return false;
}

/**
 * Process ambush mission tick.
 *
 * Victory: All convoy destroyed or stopped (none escaped)
 * Defeat: Player dies OR any convoy escapes
 */
export function processAmbushMissionTick(
  world: World,
  state: AmbushMissionState,
): boolean {
  if (!state.active || state.completed) return false;

  // Check player death first
  if (isDefeatConditionMet(world)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Check convoy stop behavior for each convoy ship
  // Convoy ships are Enemy faction in ambush missions (enables weapon targeting)
  for (const entity of queryEntities(world, ['convoyShip', 'faction'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction === Faction.Enemy) {
      checkConvoyStop(world, entity);
    }
  }

  // Update convoy counts
  const convoyStatus = countConvoyStatus(world);

  // DEFEAT: Any convoy escaped
  if (convoyStatus.escaped > 0) {
    state.escapedConvoy = convoyStatus.escaped;
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Update state
  state.aliveConvoy = convoyStatus.alive;
  state.stoppedConvoy = convoyStatus.stopped;
  state.destroyedConvoy = convoyStatus.destroyed;

  // VICTORY CONDITIONS:
  // 1. All convoy destroyed → immediate victory (no need to kill escorts)
  // 2. All convoy destroyed or stopped AND all escorts dead → victory
  const activeConvoy = state.aliveConvoy - state.stoppedConvoy;
  if (activeConvoy === 0 && state.escapedConvoy === 0) {
    // All convoy handled - check if we need escorts dead
    if (state.aliveConvoy === 0) {
      // All convoy destroyed - immediate victory
      state.completed = true;
      world.systemState.mission.result = MissionResult.Victory;
      return true;
    }
    // Some convoy stopped (captured) - need escorts dead to secure capture
    const hasLivingEscorts = hasLivingEnemyEscorts(world);
    if (!hasLivingEscorts) {
      state.completed = true;
      world.systemState.mission.result = MissionResult.Victory;
      return true;
    }
  }

  return false;
}

/**
 * Calculate reward multiplier based on mission performance.
 * - Stopped convoy ships: full credit (cargo captured intact)
 * - Destroyed convoy ships: partial credit (50%, cargo lost)
 * - Escaped convoy ships: no credit (but mission is defeat anyway)
 *
 * Base reward * (stoppedPct + destroyedPct * 0.5)
 */
export function getAmbushRewardMultiplier(state: AmbushMissionState): number {
  if (state.totalConvoy === 0) return 0;

  const destroyedPct = state.destroyedConvoy / state.totalConvoy;
  const stoppedPct = state.stoppedConvoy / state.totalConvoy;

  // Stopped = full credit (captured), Destroyed = 50% credit (cargo lost)
  return stoppedPct + destroyedPct * 0.5;
}
