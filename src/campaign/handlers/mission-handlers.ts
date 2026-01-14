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
  Screen,
  updateCampaignState,
} from '../../ui/common/screens';
import {
  createGameOverUI,
  createResultsUI,
} from '../../ui/screens/results/results';
import type { CampaignController } from '../controller-types';
import type { SalvageResult } from '../salvage';
import { createNewCampaign } from '../state';
import { deleteCampaign, forceSave } from '../storage';
import type { Contract } from '../types';
import { setupSquadronScreen } from './campaign-handlers';

/**
 * Show results screen after mission.
 *
 * @param controller - Campaign controller instance
 * @param victory - Whether the mission was won
 * @param contract - The contract that was completed
 * @param setupContractsScreen - Callback to setup contracts screen
 * @param world - Optional world reference for stats extraction
 * @param salvage - Optional salvage results from the mission
 */
export function showResults(
  controller: CampaignController,
  victory: boolean,
  contract: Contract,
  setupContractsScreen: (controller: CampaignController) => void,
  world?: World,
  salvage?: SalvageResult | null,
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
  );
}

/**
 * Show game over screen.
 *
 * @param controller - Campaign controller instance
 * @param setupContractsScreen - Callback to setup contracts screen
 */
export async function showGameOver(
  controller: CampaignController,
  setupContractsScreen: (controller: CampaignController) => void,
): Promise<void> {
  const { screenManager } = controller;
  const gameOverElement = getScreenElement(screenManager, Screen.GAME_OVER);

  // Delete the failed campaign from storage (permadeath)
  try {
    await deleteCampaign();
  } catch (error) {
    // Log but continue - old data will be overwritten on next save
    logError('Failed to delete campaign on game over:', error);
  }

  createGameOverUI(gameOverElement, screenManager.campaignState, async () => {
    // Start a fresh campaign
    const newState = createNewCampaign();
    updateCampaignState(screenManager, newState);

    // Save the new campaign
    try {
      await forceSave(newState, 'new-game-after-death');
    } catch (error) {
      // Log but continue - auto-save will pick it up later
      logError('Failed to save new campaign after game over:', error);
    }

    // Go to squadron screen
    goToSquadron(screenManager);
    const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
    setupSquadronScreen(controller, squadronElement, setupContractsScreen);
  });

  goToGameOver(screenManager);
}
