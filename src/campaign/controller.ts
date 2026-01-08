/**
 * Campaign controller - orchestrates campaign flow, screen transitions,
 * and mission spawning.
 */

import { initKeyBindings } from '../input/key-bindings';
import { initGameSettings } from '../settings/game-settings';
import { initInput } from '../systems/input';
import {
  createScreenManager,
  getScreenElement,
  goBackFromSettings,
  goToSettings,
  goToSquadron,
  goToStore,
  goToTitle,
  Screen,
  setCurrentSaveSlot,
  startMission,
  updateCampaignState,
} from '../ui/common/screens';
import { createContractsUI } from '../ui/screens/contracts';
import { showPauseMenu } from '../ui/screens/pause-menu';
import {
  bindSettingsScreen,
  cleanupSettingsScreen,
  renderSettingsScreen,
  storeBattleCanvas,
} from '../ui/screens/settings';
import { showSquadSelection } from '../ui/screens/squad-selection';
import {
  bindTitleScreen,
  cleanupTitleScreen,
  getBattleSimulationCanvas,
  hasBattleSimulation,
  renderTitleScreen,
  resetTitleScreen,
} from '../ui/screens/title';
import type { CampaignController } from './controller-types';
import { launchMission } from './mission-launcher';
import { setupSquadronScreen, setupStoreScreen } from './screen-handlers';
import { createNewCampaign } from './state';
import type { CampaignState, Contract } from './types';

export type { CampaignController } from './controller-types';

/** Create and start the campaign */
export function startCampaign(container: HTMLElement): CampaignController {
  // Initialize systems
  initKeyBindings();
  initGameSettings();
  initInput();

  // Create placeholder campaign state (will be replaced by new game or load)
  const campaignState = createNewCampaign();

  // Create screen manager
  const screenManager = createScreenManager(container, campaignState);

  // Create controller
  const controller: CampaignController = {
    container,
    screenManager,
    missionContainer: null,
    game: null,
    missionEnded: false,
  };

  // Setup title screen
  setupTitleScreen(controller);

  // Show title screen initially
  goToTitle(screenManager);

  console.log('Campaign initialized - showing title screen');

  return controller;
}

/** Setup title screen with callbacks */
function setupTitleScreen(controller: CampaignController): void {
  const { screenManager } = controller;
  const titleElement = getScreenElement(screenManager, Screen.TITLE);

  renderTitleScreen(titleElement);
  bindTitleScreen(titleElement, {
    onNewGame: () => {
      // Create fresh campaign state
      const newState = createNewCampaign();
      updateCampaignState(screenManager, newState);
      setCurrentSaveSlot(screenManager, null);

      // Transition to squadron
      startCampaignGameplay(controller);
    },
    onContinue: (state: CampaignState, slot: number) => {
      // Use loaded campaign state
      updateCampaignState(screenManager, state);
      setCurrentSaveSlot(screenManager, slot);

      // Transition to squadron
      startCampaignGameplay(controller);
    },
    onSettings: () => {
      goToSettings(screenManager);
      setupSettingsScreen(controller);
    },
  });
}

/** Setup settings screen with callbacks */
function setupSettingsScreen(controller: CampaignController): void {
  const { screenManager } = controller;
  const settingsElement = getScreenElement(screenManager, Screen.SETTINGS);
  const comingFromTitle = screenManager.previousScreen === Screen.TITLE;

  renderSettingsScreen(settingsElement);
  bindSettingsScreen(settingsElement, {
    onBack: () => {
      // Transfer canvas back to title if needed
      if (comingFromTitle && hasBattleSimulation()) {
        const canvas = getBattleSimulationCanvas();
        const titleBg = document.getElementById('title-battle-bg');
        if (canvas && titleBg) {
          titleBg.appendChild(canvas);
        }
      }

      cleanupSettingsScreen();
      goBackFromSettings(screenManager);

      // Re-setup the screen we're returning to
      const currentScreen = screenManager.currentScreen;
      if (currentScreen === Screen.TITLE) {
        setupTitleScreen(controller);
      } else if (currentScreen === Screen.SQUADRON) {
        const squadronElement = getScreenElement(
          screenManager,
          Screen.SQUADRON,
        );
        setupSquadronScreen(controller, squadronElement, () =>
          setupContractsScreen(controller),
        );
      }
    },
  });

  // Transfer battle simulation to settings background AFTER bind (which re-renders)
  if (comingFromTitle && hasBattleSimulation()) {
    const canvas = getBattleSimulationCanvas();
    const settingsScreen = settingsElement.querySelector('.settings-screen');
    const settingsBg = settingsElement.querySelector('#settings-battle-bg');

    if (canvas && settingsScreen && settingsBg) {
      settingsBg.appendChild(canvas);
      settingsScreen.classList.add('with-battle-bg');
      // Store canvas reference so settings screen can re-attach after tab switches
      storeBattleCanvas(canvas);
    }
  }
}

/** Global escape key handler reference for cleanup */
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

/** Start gameplay (from new game or continue) */
function startCampaignGameplay(controller: CampaignController): void {
  const { screenManager } = controller;

  // Setup squadron screen
  const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
  setupSquadronScreen(controller, squadronElement, () =>
    setupContractsScreen(controller),
  );

  // Show squadron
  goToSquadron(screenManager);

  // Setup global escape key handler for pause menu
  setupEscapeHandler(controller);

  const { campaignState } = screenManager;
  console.log('Campaign gameplay started');
  console.log(`Credits: ${campaignState.credits}`);
  console.log(`Ships: ${campaignState.ships.length}`);
}

/** Setup global escape key handler for pause menu */
function setupEscapeHandler(controller: CampaignController): void {
  // Remove any existing handler
  cleanupEscapeHandler();

  escapeHandler = async (e: KeyboardEvent) => {
    const { screenManager } = controller;

    // Only handle escape on campaign screens (not title, settings, or mission)
    const campaignScreens = [
      Screen.SQUADRON,
      Screen.STORE,
      Screen.CONTRACTS,
      Screen.RESULTS,
    ];

    if (
      e.code === 'Escape' &&
      campaignScreens.includes(screenManager.currentScreen)
    ) {
      e.preventDefault();
      // Can save on pre-mission screens, not during results
      const canSave = screenManager.currentScreen !== Screen.RESULTS;
      await handlePauseMenu(controller, canSave);
    }
  };

  document.addEventListener('keydown', escapeHandler);
}

/** Cleanup global escape key handler */
function cleanupEscapeHandler(): void {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
}

/** Handle pause menu from campaign screens */
export async function handlePauseMenu(
  controller: CampaignController,
  canSave: boolean,
): Promise<void> {
  const { screenManager } = controller;

  const result = await showPauseMenu(screenManager.campaignState, canSave);

  switch (result.action) {
    case 'resume':
      // Just close the menu, nothing to do
      break;

    case 'save':
      if (result.saveSlot) {
        setCurrentSaveSlot(screenManager, result.saveSlot);
        console.log(`Game saved to slot ${result.saveSlot}`);
      }
      break;

    case 'settings':
      goToSettings(screenManager);
      setupSettingsScreen(controller);
      break;

    case 'quit':
      // Cleanup handlers and return to title
      cleanupEscapeHandler();
      cleanupTitleScreen();
      resetTitleScreen();
      goToTitle(screenManager);
      setupTitleScreen(controller);
      break;
  }
}

/** Setup contracts screen with callbacks */
function setupContractsScreen(controller: CampaignController): void {
  const { screenManager } = controller;
  const contractsElement = getScreenElement(screenManager, Screen.CONTRACTS);

  // Create wrapper for recursive setup call
  const setupContracts = (ctrl: CampaignController) =>
    setupContractsScreen(ctrl);

  createContractsUI(
    contractsElement,
    screenManager.campaignState,
    (destination) => {
      // Navigation handler for contracts screen
      switch (destination) {
        case 'squadron': {
          goToSquadron(screenManager);
          const squadronElement = getScreenElement(
            screenManager,
            Screen.SQUADRON,
          );
          setupSquadronScreen(controller, squadronElement, setupContracts);
          break;
        }
        case 'store': {
          goToStore(screenManager);
          const storeElement = getScreenElement(screenManager, Screen.STORE);
          setupStoreScreen(controller, storeElement, setupContracts);
          break;
        }
        case 'contracts':
          // Already on contracts, no-op
          break;
      }
    },
    async (contract: Contract) => {
      // Show squad selection modal
      const result = await showSquadSelection(
        screenManager.campaignState,
        contract,
      );

      if (!result.confirmed) {
        // User cancelled, stay on contracts screen
        return;
      }

      // Start mission with selected ships
      startMission(screenManager, contract);
      launchMission(
        controller,
        contract,
        result.deployedShipIds,
        setupContracts,
      );
    },
  );
}
