/**
 * Screen state machine - manages transitions between game screens.
 *
 * Screens:
 * - TITLE: Main menu (new game, continue, settings, replays)
 * - SQUADRON: Unified pilot and ship management
 * - STORE: Equipment shop
 * - CONTRACTS: Mission selection
 * - MISSION: 3D combat (game running)
 * - RESULTS: Post-mission outcome
 * - GAME_OVER: Campaign ended
 * - SETTINGS: Key bindings and options
 * - REPLAYS: Replay list and viewer
 */

import type { CampaignState, Contract } from '../../campaign/types';

/** Game screen states */
export enum Screen {
  TITLE = 'title',
  SQUADRON = 'squadron',
  STORE = 'store',
  CONTRACTS = 'contracts',
  MISSION = 'mission',
  RESULTS = 'results',
  GAME_OVER = 'game_over',
  SETTINGS = 'settings',
  REPLAYS = 'replays',
  REPLAY_VIEWER = 'replay_viewer',
}

/** Screen manager state */
export interface ScreenManager {
  currentScreen: Screen;
  container: HTMLElement;
  campaignState: CampaignState;
  selectedContract: Contract | null;
  lastMissionVictory: boolean;
  currentSaveSlot: number | null;

  // Screen elements (created lazily)
  titleElement: HTMLElement | null;
  squadronElement: HTMLElement | null;
  storeElement: HTMLElement | null;
  contractsElement: HTMLElement | null;
  resultsElement: HTMLElement | null;
  gameOverElement: HTMLElement | null;
  settingsElement: HTMLElement | null;
  replaysElement: HTMLElement | null;
  replayViewerElement: HTMLElement | null;
  missionContainer: HTMLElement | null;

  // Navigation history for settings (return to previous screen)
  previousScreen: Screen | null;

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
    currentScreen: Screen.TITLE,
    container,
    campaignState,
    selectedContract: null,
    lastMissionVictory: false,
    currentSaveSlot: null,
    titleElement: null,
    squadronElement: null,
    storeElement: null,
    contractsElement: null,
    resultsElement: null,
    gameOverElement: null,
    settingsElement: null,
    replaysElement: null,
    replayViewerElement: null,
    missionContainer: null,
    previousScreen: null,
  };
}

/** Get or create a screen element */
function getOrCreateScreen(
  manager: ScreenManager,
  screen: Screen,
): HTMLElement {
  const id = `screen-${screen}`;
  let element = manager.container.querySelector<HTMLElement>(`#${id}`);

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
  const screens =
    manager.container.querySelectorAll<HTMLElement>('.game-screen');
  screens.forEach((el) => {
    el.style.display = 'none';
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

/** Transition to title screen */
export function goToTitle(manager: ScreenManager): void {
  manager.currentSaveSlot = null;
  showScreen(manager, Screen.TITLE);
}

/** Transition to settings screen (remembers previous screen for back navigation) */
export function goToSettings(manager: ScreenManager): void {
  manager.previousScreen = manager.currentScreen;
  showScreen(manager, Screen.SETTINGS);
}

/** Return from settings to previous screen */
export function goBackFromSettings(manager: ScreenManager): void {
  const target = manager.previousScreen ?? Screen.TITLE;
  manager.previousScreen = null;
  showScreen(manager, target);
}

/** Set the current save slot (for auto-save tracking) */
export function setCurrentSaveSlot(
  manager: ScreenManager,
  slot: number | null,
): void {
  manager.currentSaveSlot = slot;
}

/** Transition to replays screen (remembers previous screen for back navigation) */
export function goToReplays(manager: ScreenManager): void {
  manager.previousScreen = manager.currentScreen;
  showScreen(manager, Screen.REPLAYS);
}

/** Return from replays to previous screen */
export function goBackFromReplays(manager: ScreenManager): void {
  const target = manager.previousScreen ?? Screen.TITLE;
  manager.previousScreen = null;
  showScreen(manager, target);
}

/** Transition to replay viewer (remembers replays screen for back navigation) */
export function goToReplayViewer(manager: ScreenManager): void {
  manager.previousScreen = manager.currentScreen;
  showScreen(manager, Screen.REPLAY_VIEWER);
}

/** Return from replay viewer to replays list */
export function goBackFromReplayViewer(manager: ScreenManager): void {
  const target = manager.previousScreen ?? Screen.REPLAYS;
  manager.previousScreen = null;
  showScreen(manager, target);
}
