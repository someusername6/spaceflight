/**
 * Screen Handlers - Functions for transitioning between campaign screens.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import type { World } from '../core/types';
import {
  getScreenElement,
  goToContracts,
  goToGameOver,
  goToHangar,
  goToRoster,
  goToStore,
  Screen,
  updateCampaignState,
} from '../ui/common/screens';
import type { NavDestination } from '../ui/screens/hangar';
import { createHangarUI } from '../ui/screens/hangar';
import { createGameOverUI, createResultsUI } from '../ui/screens/results';
import { createRosterUI } from '../ui/screens/roster';
import { createStoreUI } from '../ui/store/store';
import type { CampaignController } from './controller';
import type { SalvageResult } from './salvage';
import { createNewCampaign } from './state';
import type { Contract } from './types';

/** Setup hangar screen */
export function setupHangarScreen(
  controller: CampaignController,
  hangarElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
): void {
  setupHangarScreenWithShip(controller, hangarElement, setupContractsScreen);
}

/** Setup hangar screen with optional initial ship selection */
export function setupHangarScreenWithShip(
  controller: CampaignController,
  hangarElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
  initialShipId?: string,
): void {
  const { screenManager } = controller;

  // Navigation handler for all screens
  const onNavigate = (destination: NavDestination) => {
    switch (destination) {
      case 'hangar':
        // Already on hangar, no-op
        break;
      case 'roster': {
        goToRoster(screenManager);
        const rosterElement = getScreenElement(screenManager, Screen.ROSTER);
        setupRosterScreen(controller, rosterElement, setupContractsScreen);
        break;
      }
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

  // Loadout change handler - updates campaign state
  const onStateUpdate = (newState: typeof screenManager.campaignState) => {
    updateCampaignState(screenManager, newState);
  };

  // View pilot handler - navigate to roster with pilot selected
  const onViewPilot = (pilotId: string) => {
    goToRoster(screenManager);
    const rosterElement = getScreenElement(screenManager, Screen.ROSTER);
    setupRosterScreenWithPilot(
      controller,
      rosterElement,
      setupContractsScreen,
      pilotId,
    );
  };

  createHangarUI(
    hangarElement,
    screenManager.campaignState,
    onNavigate,
    onStateUpdate,
    initialShipId,
    onViewPilot,
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
      case 'hangar': {
        goToHangar(screenManager);
        const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
        setupHangarScreen(controller, hangarElement, setupContractsScreen);
        break;
      }
      case 'roster': {
        goToRoster(screenManager);
        const rosterElement = getScreenElement(screenManager, Screen.ROSTER);
        setupRosterScreen(controller, rosterElement, setupContractsScreen);
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

/** Setup roster screen */
export function setupRosterScreen(
  controller: CampaignController,
  rosterElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
): void {
  setupRosterScreenWithPilot(controller, rosterElement, setupContractsScreen);
}

/** Setup roster screen with optional initial pilot selection */
export function setupRosterScreenWithPilot(
  controller: CampaignController,
  rosterElement: HTMLElement,
  setupContractsScreen: (controller: CampaignController) => void,
  initialPilotId?: string,
): void {
  const { screenManager } = controller;

  // Navigation handler for all screens
  const onNavigate = (destination: NavDestination) => {
    switch (destination) {
      case 'hangar': {
        goToHangar(screenManager);
        const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
        setupHangarScreen(controller, hangarElement, setupContractsScreen);
        break;
      }
      case 'roster':
        // Already on roster, no-op
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

  // View ship handler - navigate to hangar with ship selected
  const onViewShip = (shipId: string) => {
    goToHangar(screenManager);
    const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
    setupHangarScreenWithShip(
      controller,
      hangarElement,
      setupContractsScreen,
      shipId,
    );
  };

  createRosterUI(
    rosterElement,
    screenManager.campaignState,
    onNavigate,
    onStateUpdate,
    onViewShip,
    initialPilotId,
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
      // Return to hangar with resupply support
      goToHangar(screenManager);
      const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
      setupHangarScreen(controller, hangarElement, setupContractsScreen);
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

    // Go to hangar with resupply support
    goToHangar(screenManager);
    const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
    setupHangarScreen(controller, hangarElement, setupContractsScreen);
  });

  goToGameOver(screenManager);
}
