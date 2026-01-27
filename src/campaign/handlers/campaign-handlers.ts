/**
 * Campaign Handlers - Squadron, store, and contracts screen setup.
 *
 * Handles:
 * - Squadron screen setup and navigation
 * - Store screen setup and navigation
 * - Contracts screen setup, navigation, and mission launching
 * - Syncing campaign state changes to multiplayer guests
 */

import type { NavDestination } from '../../ui/common/nav-bar';
import { showError } from '../../ui/common/notification';
import {
  getScreenElement,
  goToContracts,
  goToSquadron,
  goToStore,
  Screen,
  startMission,
  updateCampaignState,
} from '../../ui/common/screens';
import { createContractsUI } from '../../ui/screens/contracts';
import {
  createSquadronUI,
  type ListSelection,
} from '../../ui/screens/squadron';
import { showSquadSelection } from '../../ui/screens/squadron/selection';
import { createStoreUI } from '../../ui/screens/store/store';
import type { CampaignController } from '../controller-types';
import { launchMission } from '../mission/mission-launcher';
import {
  advanceSector,
  markContractAttempted,
  refreshContracts,
} from '../state';
import { autoSave, getActiveSlotId, saveCheckpoint } from '../storage';
import type { CampaignState, Contract } from '../types';
import { isInLobby, updateAndSyncCampaignState } from './lobby-handlers';
import { handleRetirement } from './mission-handlers';

/**
 * Update campaign state and sync to multiplayer guests if in lobby.
 */
function updateStateWithSync(
  screenManager: CampaignController['screenManager'],
  newState: CampaignState,
): void {
  updateCampaignState(screenManager, newState);
  // Sync to multiplayer guests if in lobby
  if (isInLobby()) {
    updateAndSyncCampaignState(newState);
  }
}

/**
 * Setup squadron screen.
 *
 * @param controller - Campaign controller instance
 * @param squadronElement - DOM element for squadron screen
 * @param setupContractsScreen - Callback to setup contracts screen
 * @param initialSelection - Optional initial list selection state
 */
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

  // State update handler with auto-save and multiplayer sync
  const onStateUpdate = (newState: typeof screenManager.campaignState) => {
    updateStateWithSync(screenManager, newState);
    void autoSave(newState, 'loadout-change');
  };

  createSquadronUI(
    squadronElement,
    screenManager.campaignState,
    onNavigate,
    onStateUpdate,
    initialSelection,
  );
}

/**
 * Setup store screen.
 *
 * @param controller - Campaign controller instance
 * @param storeElement - DOM element for store screen
 * @param setupContractsScreen - Callback to setup contracts screen
 */
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

  // State update handler with auto-save and multiplayer sync
  const onStateUpdate = (newState: typeof screenManager.campaignState) => {
    updateStateWithSync(screenManager, newState);
    void autoSave(newState, 'store-purchase');
  };

  createStoreUI(
    storeElement,
    screenManager.campaignState,
    onNavigate,
    onStateUpdate,
  );
}

/**
 * Setup contracts screen with callbacks.
 *
 * @param controller - Campaign controller instance
 */
export function setupContractsScreen(controller: CampaignController): void {
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

      // Save checkpoint for non-ironman campaigns (allows retry on defeat)
      if (!screenManager.campaignState.settings.ironmanMode) {
        const slotId = getActiveSlotId();
        if (slotId) {
          try {
            await saveCheckpoint(screenManager.campaignState, slotId);
          } catch {
            // Block mission start - don't risk campaign without checkpoint
            showError('Unable to save checkpoint. Please try again.', 5000);
            return;
          }
        }
      }

      // Mark contract as attempted (for "fresh" indicator)
      const stateWithAttempt = markContractAttempted(
        screenManager.campaignState,
        contract.id,
      );
      updateStateWithSync(screenManager, stateWithAttempt);

      // Await save before starting mission to ensure state is persisted
      await autoSave(stateWithAttempt, 'mission-started');

      // Start mission with selected ships
      startMission(screenManager, contract);
      launchMission(
        controller,
        contract,
        result.deployedShipIds,
        setupContracts,
      );
    },
    () => {
      // Advance to next sector
      const newState = advanceSector(screenManager.campaignState);
      updateStateWithSync(screenManager, newState);
      void autoSave(newState, 'sector-advance');
      // Refresh contracts screen with new sector's missions
      setupContractsScreen(controller);
    },
    () => {
      // Refresh contracts (pay credits, get new selection)
      const newState = refreshContracts(screenManager.campaignState);
      updateStateWithSync(screenManager, newState);
      void autoSave(newState, 'contracts-refresh');
      // Refresh contracts screen with new selection
      setupContractsScreen(controller);
    },
    () => {
      // Retire squadron (sector 5 only)
      void handleRetirement(controller);
    },
  );
}
