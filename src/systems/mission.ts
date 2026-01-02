/**
 * Mission System - Checks win/lose conditions.
 *
 * Slice 1: Simple destroy all enemies / player death.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent, countEntities } from '../core/ecs';
import { Faction, type FactionComponent } from '../components/faction';

/** Mission result */
export const enum MissionResult {
  InProgress = 'inProgress',
  Victory = 'victory',
  Defeat = 'defeat',
}

/** Current mission state (mutable singleton for simplicity) */
let currentResult: MissionResult = MissionResult.InProgress;

/** Mission system - checks win/lose conditions */
export function missionSystem(world: World, _dt: number): void {
  if (currentResult !== MissionResult.InProgress) {
    return; // Already ended
  }

  // Check for player death (defeat)
  const playerCount = countEntities(world, ['playerControlled', 'health']);
  if (playerCount === 0) {
    currentResult = MissionResult.Defeat;
    return;
  }

  // Check for no enemies remaining (victory)
  let enemyCount = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent<FactionComponent>(world, entity, 'faction')!;
    if (faction.faction === Faction.Enemy) {
      enemyCount++;
    }
  }

  if (enemyCount === 0) {
    currentResult = MissionResult.Victory;
  }
}

/** Get current mission result */
export function getMissionResult(): MissionResult {
  return currentResult;
}

/** Reset mission state (call when starting new mission) */
export function resetMission(): void {
  currentResult = MissionResult.InProgress;
}

/** Check if mission is still in progress */
export function isMissionInProgress(): boolean {
  return currentResult === MissionResult.InProgress;
}
