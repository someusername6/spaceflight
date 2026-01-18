/**
 * Mission System - Checks win/lose conditions.
 *
 * Slice 1: Simple destroy all enemies / player death.
 */

import { Faction } from '../components/faction';
import { isDead } from '../components/health';
import { countEntities, getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';
import { MissionResult } from '../core/types';

// Re-export MissionResult for consumers
export { MissionResult };

/** Mission system - checks win/lose conditions */
export function missionSystem(world: World, _dt: number): void {
  const mission = world.systemState.mission;

  if (mission.result !== MissionResult.InProgress) {
    return; // Already ended
  }

  // Check for player death (defeat)
  const playerCount = countEntities(world, ['playerControlled', 'health']);
  if (playerCount === 0) {
    mission.result = MissionResult.Defeat;
    return;
  }

  // Check for no living enemy ships remaining (victory)
  // Skip this check for non-elimination missions - they have different win conditions
  if (
    mission.missionType === 'elimination' &&
    countLivingEnemyShips(world) === 0
  ) {
    mission.result = MissionResult.Victory;
  }
}

/** Get current mission result */
export function getMissionResult(world: World): MissionResult {
  return world.systemState.mission.result;
}

/** Check if mission is still in progress */
export function isMissionInProgress(world: World): boolean {
  return world.systemState.mission.result === MissionResult.InProgress;
}

/** Reset mission state to in-progress (for multi-wave missions) */
export function resetMissionState(world: World): void {
  world.systemState.mission.result = MissionResult.InProgress;
}

/** Count living enemy ships (not missiles, not dead/dying) */
export function countLivingEnemyShips(world: World): number {
  let count = 0;
  for (const entity of queryEntities(world, [
    'faction',
    'health',
    'shipIdentity',
  ])) {
    // Query guarantees these components exist
    const health = getComponent(world, entity, 'health')!;
    const faction = getComponent(world, entity, 'faction')!;
    if (isDead(health)) continue;
    if (faction.faction === Faction.Enemy) {
      count++;
    }
  }
  return count;
}
