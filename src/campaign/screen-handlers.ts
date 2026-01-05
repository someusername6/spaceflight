/**
 * Screen Handlers - Functions for transitioning between campaign screens.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import type { World } from '../core/types';
import { createHangarUI } from '../ui/hangar';
import { createGameOverUI, createResultsUI } from '../ui/results';
import {
  getScreenElement,
  goToContracts,
  goToGameOver,
  goToHangar,
  Screen,
  updateCampaignState,
} from '../ui/screens';
import type { CampaignController } from './controller';
import { createNewCampaign, resupplyAllShips } from './state';
import type { Contract } from './types';

/** Setup hangar screen with resupply callback */
export function setupHangarScreen(
  controller: CampaignController,
  hangarElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
): void {
  const { screenManager } = controller;

  // Create handlers that reference current state
  const onSelectContracts = () => {
    goToContracts(screenManager);
    setupContractsScreen(controller);
  };

  // Resupply handler - updates state and re-renders
  const onResupply = () => {
    const newState = resupplyAllShips(screenManager.campaignState);
    updateCampaignState(screenManager, newState);
    // Re-setup hangar with updated state
    setupHangarScreen(controller, hangarElement, setupContractsScreen);
  };

  createHangarUI(
    hangarElement,
    screenManager.campaignState,
    onSelectContracts,
    onResupply,
  );
}

/** Show results screen after mission */
export function showResults(
  controller: CampaignController,
  victory: boolean,
  contract: Contract,
  setupContractsScreen: (controller: CampaignController) => void,
  world?: World,
): void {
  const { screenManager } = controller;
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  createResultsUI(
    resultsElement,
    victory,
    contract,
    screenManager.campaignState,
    () => {
      // Return to hangar with resupply support
      goToHangar(screenManager);
      const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
      setupHangarScreen(controller, hangarElement, setupContractsScreen);
    },
    world,
  );
}

/** Show game over screen */
export function showGameOver(
  controller: CampaignController,
  setupContractsScreen: (controller: CampaignController) => void,
): void {
  const { screenManager } = controller;
  const gameOverElement = getScreenElement(screenManager, Screen.GAME_OVER);

  createGameOverUI(gameOverElement, screenManager.campaignState, () => {
    // Restart campaign
    const newState = createNewCampaign();
    updateCampaignState(screenManager, newState);

    // Go to hangar with resupply support
    goToHangar(screenManager);
    const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
    setupHangarScreen(controller, hangarElement, setupContractsScreen);
  });

  goToGameOver(screenManager);
}
