/**
 * Screen Handlers - Functions for transitioning between campaign screens.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import type { World } from '../core/types';
import type { NavDestination } from '../ui/common/nav-bar';
import {
  getScreenElement,
  goToContracts,
  goToGameOver,
  goToSquadron,
  goToStore,
  Screen,
  updateCampaignState,
} from '../ui/common/screens';
import { createGameOverUI, createResultsUI } from '../ui/screens/results';
import { createSquadronUI, type ListSelection } from '../ui/screens/squadron';
import { createStoreUI } from '../ui/store/store';
import type { CampaignController } from './controller';
import type { SalvageResult } from './salvage';
import { createNewCampaign } from './state';
import type { Contract } from './types';

/** Setup squadron screen */
export function setupSquadronScreen(
  controller: CampaignController,
  squadronElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
  initialSelection?: ListSelection,
): void {
  const { screenManager } = controller;

  // Navigation handler for all screens
  const onNavigate = (destination: NavDestination) => {
    switch (destination) {
      case 'squadron':
        // Already on squadron, no-op
        break;
      case 'store': {
        goToStore(screenManager);
        const storeElement = getScreenElement(screenManager, Screen.STORE);
        setupStoreScreen(controller, storeElement, setupContractsScreen);
        break;
      }
      case 'contracts':
        goToContracts(screenManager);
        setupContractsScreen(controller);
        break;
    }
  };

  // State update handler
  const onStateUpdate = (newState: typeof screenManager.campaignState) => {
    updateCampaignState(screenManager, newState);
  };

  createSquadronUI(
    squadronElement,
    screenManager.campaignState,
    onNavigate,
    onStateUpdate,
    initialSelection,
  );
}

/** Setup store screen */
export function setupStoreScreen(
  controller: CampaignController,
  storeElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
): void {
  const { screenManager } = controller;

  // Navigation handler for all screens
  const onNavigate = (destination: NavDestination) => {
    switch (destination) {
      case 'squadron': {
        goToSquadron(screenManager);
        const squadronElement = getScreenElement(
          screenManager,
          Screen.SQUADRON,
        );
        setupSquadronScreen(controller, squadronElement, setupContractsScreen);
        break;
      }
      case 'store':
        // Already on store, no-op
        break;
      case 'contracts':
        goToContracts(screenManager);
        setupContractsScreen(controller);
        break;
    }
  };

  // State update handler
  const onStateUpdate = (newState: typeof screenManager.campaignState) => {
    updateCampaignState(screenManager, newState);
  };

  createStoreUI(
    storeElement,
    screenManager.campaignState,
    onNavigate,
    onStateUpdate,
  );
}

/** Show results screen after mission */
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
      // Return to squadron screen
      goToSquadron(screenManager);
      const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
      setupSquadronScreen(controller, squadronElement, setupContractsScreen);
    },
    world,
    salvage,
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

    // Go to squadron screen
    goToSquadron(screenManager);
    const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
    setupSquadronScreen(controller, squadronElement, setupContractsScreen);
  });

  goToGameOver(screenManager);
}
