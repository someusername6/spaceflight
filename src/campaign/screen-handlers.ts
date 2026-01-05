/**
 * Screen Handlers - Functions for transitioning between campaign screens.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import { createHangarUI, updateHangarUI } from '../ui/hangar';
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
import { createNewCampaign } from './state';
import type { Contract } from './types';

/** Show results screen after mission */
export function showResults(
  controller: CampaignController,
  victory: boolean,
  contract: Contract,
  setupContractsScreen: (controller: CampaignController) => void,
): void {
  const { screenManager } = controller;
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  createResultsUI(
    resultsElement,
    victory,
    contract,
    screenManager.campaignState,
    () => {
      // Return to hangar
      goToHangar(screenManager);
      const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
      updateHangarUI(
        {
          element: hangarElement,
          onSelectContracts: () => {
            goToContracts(screenManager);
            setupContractsScreen(controller);
          },
        },
        screenManager.campaignState,
      );
    },
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

    // Go to hangar
    goToHangar(screenManager);
    const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
    createHangarUI(hangarElement, newState, () => {
      goToContracts(screenManager);
      setupContractsScreen(controller);
    });
  });

  goToGameOver(screenManager);
}
