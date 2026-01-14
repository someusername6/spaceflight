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
import { showCampaignCreateModal } from '../../ui/screens/campaign-create';
import { showLoadCampaignModal } from '../../ui/screens/load-campaign';
import {
  createGameOverUI,
  createResultsUI,
} from '../../ui/screens/results/results';
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
import {
  createAndSaveNewCampaign,
  syncAutoaimFromCampaign,
} from './menu-handlers';

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
 * Handle non-ironman defeat by restoring from checkpoint.
 * Returns the player to the pre-mission state.
 *
 * @param controller - Campaign controller instance
 * @param setupContractsScreen - Callback to setup contracts screen
 */
export async function handleNonIronmanDefeat(
  controller: CampaignController,
  setupContractsScreen: (controller: CampaignController) => void,
): Promise<void> {
  const { screenManager } = controller;

  // Try to restore from checkpoint
  const slotId = getActiveSlotId();
  const checkpoint = slotId ? await loadCheckpoint(slotId) : null;

  if (checkpoint && slotId) {
    // Restore the pre-mission state
    updateCampaignState(screenManager, checkpoint);

    // Clean up checkpoint
    await deleteCheckpoint(slotId);

    // Return to squadron screen (player can retry the mission)
    goToSquadron(screenManager);
    const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
    setupSquadronScreen(controller, squadronElement, setupContractsScreen);
  } else {
    // No checkpoint available - this shouldn't happen, but if it does,
    // fall back to game over screen (cannot proceed with dead commander)
    logError(
      'No checkpoint found for non-ironman defeat - falling back to game over',
    );
    await showGameOver(controller, setupContractsScreen);
  }
}

/**
 * Show game over screen (ironman mode only - permadeath).
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
  const currentSlotId = getActiveSlotId();
  if (currentSlotId) {
    try {
      await deleteCampaign(currentSlotId);
    } catch (error) {
      // Log but continue - old data will be overwritten on next save
      logError('Failed to delete campaign on game over:', error);
    }
  }

  createGameOverUI(gameOverElement, screenManager.campaignState, async () => {
    // Show load campaign modal for slot selection (same flow as title screen)
    const loadResult = await showLoadCampaignModal();

    if (loadResult.action === 'cancel') {
      // User cancelled - stay on game over screen
      return;
    }

    if (loadResult.action === 'load') {
      // User selected an existing campaign from another slot
      updateCampaignState(screenManager, loadResult.state);
      syncAutoaimFromCampaign(loadResult.state);
      goToSquadron(screenManager);
      const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
      setupSquadronScreen(controller, squadronElement, setupContractsScreen);
      return;
    }

    // User wants to create new campaign in selected slot
    const createResult = await showCampaignCreateModal({
      slotId: loadResult.slotId,
    });

    if (createResult.action === 'cancel') {
      // User cancelled creation - stay on game over screen
      return;
    }

    // Create and save new campaign
    const slotId = createResult.slotId ?? loadResult.slotId;
    await createAndSaveNewCampaign(
      screenManager,
      createResult.settings,
      slotId,
    );

    // Go to squadron screen
    goToSquadron(screenManager);
    const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
    setupSquadronScreen(controller, squadronElement, setupContractsScreen);
  });

  goToGameOver(screenManager);
}
