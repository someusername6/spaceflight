/**
 * Screen state machine - manages transitions between game screens.
 *
 * Screens:
 * - SQUADRON: Unified pilot and ship management
 * - STORE: Equipment shop
 * - CONTRACTS: Mission selection
 * - MISSION: 3D combat (game running)
 * - RESULTS: Post-mission outcome
 * - GAME_OVER: Campaign ended
 */

import type { CampaignState, Contract } from '../../campaign/types';

/** Game screen states */
export enum Screen {
  SQUADRON = 'squadron',
  STORE = 'store',
  CONTRACTS = 'contracts',
  MISSION = 'mission',
  RESULTS = 'results',
  GAME_OVER = 'game_over',
}

/** Screen manager state */
export interface ScreenManager {
  currentScreen: Screen;
  container: HTMLElement;
  campaignState: CampaignState;
  selectedContract: Contract | null;
  lastMissionVictory: boolean;

  // Screen elements (created lazily)
  squadronElement: HTMLElement | null;
  storeElement: HTMLElement | null;
  contractsElement: HTMLElement | null;
  resultsElement: HTMLElement | null;
  gameOverElement: HTMLElement | null;
  missionContainer: HTMLElement | null;

  // Callbacks
  onStartMission?: (contract: Contract) => void;
  onMissionEnd?: (victory: boolean) => void;
}

/** Create screen manager */
export function createScreenManager(
  container: HTMLElement,
  campaignState: CampaignState,
): ScreenManager {
  return {
    currentScreen: Screen.SQUADRON,
    container,
    campaignState,
    selectedContract: null,
    lastMissionVictory: false,
    squadronElement: null,
    storeElement: null,
    contractsElement: null,
    resultsElement: null,
    gameOverElement: null,
    missionContainer: null,
  };
}

/** Get or create a screen element */
function getOrCreateScreen(
  manager: ScreenManager,
  screen: Screen,
): HTMLElement {
  const id = `screen-${screen}`;
  let element = manager.container.querySelector(`#${id}`) as HTMLElement | null;

  if (!element) {
    element = document.createElement('div');
    element.id = id;
    element.className = 'game-screen';
    element.style.display = 'none';
    manager.container.appendChild(element);
  }

  return element;
}

/** Hide all screens */
function hideAllScreens(manager: ScreenManager): void {
  const screens = manager.container.querySelectorAll('.game-screen');
  screens.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  // Also hide mission container if it exists
  if (manager.missionContainer) {
    manager.missionContainer.style.display = 'none';
  }
}

/** Show a specific screen */
function showScreen(manager: ScreenManager, screen: Screen): void {
  hideAllScreens(manager);

  if (screen === Screen.MISSION) {
    // Mission uses the 3D renderer container
    if (manager.missionContainer) {
      manager.missionContainer.style.display = 'block';
    }
  } else {
    const element = getOrCreateScreen(manager, screen);
    element.style.display = 'flex';
  }

  manager.currentScreen = screen;
}

/** Transition to squadron screen */
export function goToSquadron(manager: ScreenManager): void {
  showScreen(manager, Screen.SQUADRON);
}

/** Transition to store screen */
export function goToStore(manager: ScreenManager): void {
  showScreen(manager, Screen.STORE);
}

/** Transition to contracts screen */
export function goToContracts(manager: ScreenManager): void {
  showScreen(manager, Screen.CONTRACTS);
}

/** Start a mission with selected contract */
export function startMission(manager: ScreenManager, contract: Contract): void {
  manager.selectedContract = contract;
  showScreen(manager, Screen.MISSION);

  if (manager.onStartMission) {
    manager.onStartMission(contract);
  }
}

/** End the current mission */
export function endMission(manager: ScreenManager, victory: boolean): void {
  manager.lastMissionVictory = victory;
  showScreen(manager, Screen.RESULTS);

  if (manager.onMissionEnd) {
    manager.onMissionEnd(victory);
  }
}

/** Transition to game over screen */
export function goToGameOver(manager: ScreenManager): void {
  showScreen(manager, Screen.GAME_OVER);
}

/** Get the element for a screen (for UI rendering) */
export function getScreenElement(
  manager: ScreenManager,
  screen: Screen,
): HTMLElement {
  return getOrCreateScreen(manager, screen);
}

/** Set the mission container (3D renderer element) */
export function setMissionContainer(
  manager: ScreenManager,
  element: HTMLElement,
): void {
  manager.missionContainer = element;
}

/** Update campaign state */
export function updateCampaignState(
  manager: ScreenManager,
  state: CampaignState,
): void {
  manager.campaignState = state;
}
