/**
 * Campaign Handlers - Squadron, store, and contracts screen setup.
 *
 * Handles:
 * - Squadron screen setup and navigation
 * - Store screen setup and navigation
 * - Contracts screen setup, navigation, and mission launching
 * - Syncing campaign state changes to multiplayer guests
 */

import { getGuestShipIds } from '../../multiplayer/mission-setup';
import type { NavDestination } from '../../ui/common/nav-bar';
import { showError } from '../../ui/common/notification';
import {
  getScreenElement,
  goToContracts,
  goToLobby,
  goToSquadron,
  goToStore,
  Screen,
  startMission,
  updateCampaignState,
} from '../../ui/common/screens';
import { createContractsUI } from '../../ui/screens/contracts';
import { forceRenderLobbyScreen } from '../../ui/screens/lobby';
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
import {
  startLaunchCountdown,
  updateAndSyncCampaignState,
} from './lobby-actions';
import { getLobbyContext, isInLobby } from './lobby-context';
import { handleRetirement } from './mission-handlers';

/**
 * Create a navigation handler for campaign screens.
 * Handles switching between lobby, squadron, store, and contracts.
 * The currentScreen destination is a no-op (already there).
 */
export function createNavigationHandler(
  controller: CampaignController,
  currentScreen: NavDestination,
  setupContracts: (ctrl: CampaignController) => void,
): (destination: NavDestination) => void {
  const { screenManager } = controller;

  return (destination: NavDestination) => {
    if (destination === currentScreen) return;

    switch (destination) {
      case 'lobby':
        goToLobby(screenManager);
        forceRenderLobbyScreen();
        break;
      case 'squadron': {
        goToSquadron(screenManager);
        const el = getScreenElement(screenManager, Screen.SQUADRON);
        setupSquadronScreen(controller, el, setupContracts);
        break;
      }
      case 'store': {
        goToStore(screenManager);
        const el = getScreenElement(screenManager, Screen.STORE);
        setupStoreScreen(controller, el, setupContracts);
        break;
      }
      case 'contracts':
        goToContracts(screenManager);
        setupContracts(controller);
        break;
    }
  };
}

/**
 * Update campaign state and sync to multiplayer guests if in lobby.
 * Captures old state before updating to detect player pilot unassignments.
 */
function updateStateWithSync(
  screenManager: CampaignController['screenManager'],
  newState: CampaignState,
): void {
  // Capture old state before updating (for detecting player pilot unassignments)
  const oldState = screenManager.campaignState;
  updateCampaignState(screenManager, newState);
  // Sync to multiplayer guests if in lobby
  if (isInLobby()) {
    updateAndSyncCampaignState(newState, oldState);
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
  const onNavigate = createNavigationHandler(
    controller,
    'squadron',
    setupContractsScreen,
  );

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
  const onNavigate = createNavigationHandler(
    controller,
    'store',
    setupContractsScreen,
  );

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

// =============================================================================
// Accept Mission Handlers
// =============================================================================

/**
 * Handle accept mission in multiplayer mode.
 * Routes through the launch countdown flow.
 */
function handleMultiplayerAccept(
  controller: CampaignController,
  contract: Contract,
  setupContracts: (ctrl: CampaignController) => void,
): void {
  const ctx = getLobbyContext();
  if (!ctx) return;

  const { screenManager } = controller;

  // All ships are deployed in multiplayer (no squad selection modal)
  const allShipIds = screenManager.campaignState.ships.map((s) => s.id);

  // Get guest ship IDs for spawning with PlayerControlled instead of AIControlled
  const guestShipIds = getGuestShipIds(
    ctx.lobbyState.players,
    ctx.localPlayerId,
  );

  startLaunchCountdown(ctx, contract.id, () => {
    // Countdown complete — launch the mission
    const stateWithAttempt = markContractAttempted(
      screenManager.campaignState,
      contract.id,
    );
    updateStateWithSync(screenManager, stateWithAttempt);
    void autoSave(stateWithAttempt, 'mission-started');

    startMission(screenManager, contract);
    launchMission(
      controller,
      contract,
      allShipIds,
      setupContracts,
      guestShipIds,
    );
  });
}

/**
 * Handle accept mission in single-player mode.
 * Shows squad selection modal, saves checkpoint, launches directly.
 */
async function handleSinglePlayerAccept(
  controller: CampaignController,
  contract: Contract,
  setupContracts: (ctrl: CampaignController) => void,
): Promise<void> {
  const { screenManager } = controller;

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
  launchMission(controller, contract, result.deployedShipIds, setupContracts);
}

// =============================================================================
// Screen Setup
// =============================================================================

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

  const onNavigate = createNavigationHandler(
    controller,
    'contracts',
    setupContracts,
  );

  createContractsUI(
    contractsElement,
    screenManager.campaignState,
    onNavigate,
    async (contract: Contract) => {
      // In multiplayer, route through the launch countdown flow
      if (isInLobby()) {
        handleMultiplayerAccept(controller, contract, setupContracts);
        return;
      }

      // Single-player: launch directly
      await handleSinglePlayerAccept(controller, contract, setupContracts);
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
