/**
 * Mission System - Checks win/lose conditions.
 *
 * Slice 1: Simple destroy all enemies / player death.
 */

import { Faction, type FactionComponent } from '../components/faction';
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

  // Check for no enemies remaining (victory)
  let enemyCount = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    // Query guarantees this component exists
    const faction = getComponent<FactionComponent>(
      world,
      entity,
      'faction',
    ) as FactionComponent;
    if (faction.faction === Faction.Enemy) {
      enemyCount++;
    }
  }

  if (enemyCount === 0) {
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
