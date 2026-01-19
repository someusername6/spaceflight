/**
 * Mission Handlers - Post-mission results and game-over screen setup.
 *
 * Handles:
 * - Mission results display (victory/defeat, salvage)
 * - Game over screen with restart option
 */

import { logError } from '../../core/logger';
import type { World } from '../../core/types';
import {
  getScreenElement,
  goToGameOver,
  goToSquadron,
  goToTitle,
  Screen,
  updateCampaignState,
} from '../../ui/common/screens';
import { collectDebriefData } from '../../ui/screens/results/debrief';
import {
  type AmbushResultsDisplay,
  createGameOverUI,
  createResultsUI,
  type EscortResultsDisplay,
} from '../../ui/screens/results/results';
import { resetTitleScreen } from '../../ui/screens/title';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import type { SalvageResult } from '../salvage';
import {
  deleteCampaign,
  deleteCheckpoint,
  getActiveSlotId,
  loadCheckpoint,
} from '../storage';
import type { Contract } from '../types';
import { setupSquadronScreen } from './campaign-handlers';
import { setupTitleScreen } from './menu-handlers';

/**
 * Show results screen after mission.
 *
 * @param controller - Campaign controller instance
 * @param victory - Whether the mission was won
 * @param contract - The contract that was completed
 * @param setupContractsScreen - Callback to setup contracts screen
 * @param world - Optional world reference for stats extraction
 * @param salvage - Optional salvage results from the mission
 * @param earnedReward - Actual reward earned (with multipliers applied)
 * @param escortResults - Convoy survival results for escort missions
 * @param ambushResults - Convoy results for ambush missions
 */
export function showResults(
  controller: CampaignController,
  victory: boolean,
  contract: Contract,
  setupContractsScreen: (controller: CampaignController) => void,
  world?: World,
  salvage?: SalvageResult | null,
  earnedReward?: number,
  escortResults?: EscortResultsDisplay,
  ambushResults?: AmbushResultsDisplay,
): void {
  const { screenManager } = controller;
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  createResultsUI(
    resultsElement,
    victory,
    contract,
    screenManager.campaignState,
    () => {
      // Return to squadron screen (sector advancement is now manual via contracts)
      goToSquadron(screenManager);
      const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
      setupSquadronScreen(controller, squadronElement, setupContractsScreen);
    },
    world,
    salvage,
    earnedReward,
    escortResults,
    ambushResults,
  );
}

/**
 * Handle non-ironman defeat by showing debrief then restoring from checkpoint.
 * Shows results screen with combat stats, then returns to squadron for retry.
 *
 * @param controller - Campaign controller instance
 * @param setupContractsScreen - Callback to setup contracts screen
 * @param contract - The contract that was attempted
 * @param world - World reference for debrief stats extraction
 */
export function handleNonIronmanDefeat(
  controller: CampaignController,
  setupContractsScreen: (controller: CampaignController) => void,
  contract: Contract,
  world: World,
): void {
  const { screenManager } = controller;

  // Show results screen with debrief (no salvage on defeat)
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  createResultsUI(
    resultsElement,
    false, // victory = false
    contract,
    screenManager.campaignState,
    async () => {
      // On continue: restore checkpoint and return to squadron
      const slotId = getActiveSlotId();
      const checkpoint = slotId ? await loadCheckpoint(slotId) : null;

      if (checkpoint && slotId) {
        // Restore the pre-mission state
        updateCampaignState(screenManager, checkpoint);

        // Clean up checkpoint
        await deleteCheckpoint(slotId);

        // Return to squadron screen (player can retry the mission)
        goToSquadron(screenManager);
        const squadronElement = getScreenElement(
          screenManager,
          Screen.SQUADRON,
        );
        setupSquadronScreen(controller, squadronElement, setupContractsScreen);
      } else {
        // No checkpoint available - fall back to game over screen
        logError(
          'No checkpoint found for non-ironman defeat - falling back to game over',
        );
        await showGameOver(controller);
      }
    },
    world,
    null, // no salvage on defeat
  );
}

/**
 * Show game over screen (ironman mode only - permadeath).
 *
 * @param controller - Campaign controller instance
 * @param world - Optional world for collecting debrief stats
 */
export async function showGameOver(
  controller: CampaignController,
  world?: World,
): Promise<void> {
  const { screenManager } = controller;
  const gameOverElement = getScreenElement(screenManager, Screen.GAME_OVER);

  // Collect debrief data if world is available
  const debriefData = world ? collectDebriefData(world) : null;

  // Delete the failed campaign from storage (permadeath)
  const currentSlotId = getActiveSlotId();
  if (currentSlotId) {
    try {
      await deleteCampaign(currentSlotId);
    } catch (error) {
      // Log but continue - old data will be overwritten on next save
      logError('Failed to delete campaign on game over:', error);
    }
  }

  createGameOverUI(
    gameOverElement,
    screenManager.campaignState,
    async () => {
      // Return to title screen - user can start new game or load another campaign
      void resetTitleScreen();
      goToTitle(screenManager);

      // Setup title screen with gameplay callback
      const onStartGameplay = () => startCampaignGameplay(controller);
      await setupTitleScreen(controller, onStartGameplay);
    },
    debriefData,
  );

  goToGameOver(screenManager);
}
