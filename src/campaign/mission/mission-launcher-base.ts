/**
 * Mission Launcher Base - Shared utilities for mission launchers.
 *
 * Provides common patterns used across all mission types:
 * - Faction behavior mode setting
 * - Mission end delay handling
 * - Mission end overlay display
 */

import type { AIBehaviorMode } from '../../components/ai';
import { getComponent, queryEntities } from '../../core/ecs';
import { logDebug } from '../../core/logger';
import type { Faction, World } from '../../core/types';
import { TICK_SEC } from '../../game';
import type { CampaignController } from '../controller-types';
import { createMissionResultOverlay } from '../utils';
import { MISSION_END_DELAY, type MissionEndState } from './mission-waves';

/**
 * Set AI behavior mode for all entities of a given faction.
 * Used to configure wingman/enemy behavior for specific mission types.
 */
export function setFactionBehaviorMode(
  world: World,
  faction: Faction,
  mode: AIBehaviorMode,
): void {
  for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
    const factionComp = getComponent(world, entity, 'faction');
    if (factionComp?.faction !== faction) continue;

    const ai = getComponent(world, entity, 'aiControlled');
    if (ai) {
      ai.behaviorMode = mode;
    }
  }
}

/**
 * Handle mission end delay countdown in tick callback.
 * Returns true if mission is ending (caller should return early).
 *
 * @param missionEndState - Shared mission end state
 * @param executeMissionEnd - Async function to execute when delay completes
 * @returns True if mission is in end delay (caller should skip processing)
 */
export function handleMissionEndDelay(
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): boolean {
  if (!missionEndState.pending) return false;

  missionEndState.delayRemaining -= TICK_SEC;
  if (missionEndState.delayRemaining <= 0) {
    missionEndState.pending = false;
    executeMissionEnd().catch((e) => {
      throw e;
    });
  }
  return true;
}

/**
 * Configuration for triggering mission end.
 */
export interface MissionEndTriggerConfig {
  /** Shared mission end state */
  missionEndState: MissionEndState;
  /** Campaign controller for overlay access */
  controller: CampaignController;
  /** Whether the mission was won */
  victory: boolean;
  /** Reward multiplier (0-1), defaults to 1 for victory, 0 for defeat */
  rewardMultiplier?: number | undefined;
  /** Log prefix for debug messages (e.g., "ESCORT", "AMBUSH") */
  logPrefix: string;
  /** Log details string for debug output */
  logDetails: string;
}

/**
 * Trigger mission end with standard delay, overlay, and logging.
 * Call this from mission end callbacks when victory/defeat is determined.
 *
 * @param config - Mission end configuration
 */
export function triggerMissionEnd(config: MissionEndTriggerConfig): void {
  const { missionEndState, controller, victory, logPrefix, logDetails } =
    config;

  if (missionEndState.pending) return;

  missionEndState.victory = victory;
  missionEndState.pending = true;
  missionEndState.delayRemaining = MISSION_END_DELAY;

  if (config.rewardMultiplier !== undefined) {
    missionEndState.rewardMultiplier = config.rewardMultiplier;
  }

  // Show VICTORY/DEFEAT overlay
  const overlay = createMissionResultOverlay(!victory);
  controller.missionContainer?.appendChild(overlay);

  logDebug(
    `[${logPrefix}] Mission ${victory ? 'Victory' : 'Defeat'} - ${logDetails}`,
  );
}
