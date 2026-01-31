/**
 * Multiplayer Pause Handler - Mission-specific pause handling for multiplayer.
 *
 * Handles:
 * - Initializing pause coordination when mission starts
 * - Showing multiplayer pause modal on escape
 * - Processing pause results (resume, settings, quit)
 * - Cleaning up on mission end
 */

import { stopGame } from '../../game';
import { stopMultiplayerGameLoop } from '../../multiplayer/multiplayer-game-loop';
import {
  initPauseCoordination,
  type PauseCoordinatorConfig,
  type PauseCoordinatorHandle,
} from '../../multiplayer/pause-coordinator';
import { GameMessageType } from '../../multiplayer/protocol/types';
import {
  convertPlayerPilotToAI,
  convertPlayerShipToAIMission,
} from '../../multiplayer/ship-assignment';
import { goToSettings, goToTitle } from '../../ui/common/screens';
import {
  showMultiplayerPauseMenu,
  updatePauseModalState,
} from '../../ui/screens/multiplayer-pause';
import { showQuitConfirmModal } from '../../ui/screens/quit-confirm-modal';
import { cleanupTitleScreen, resetTitleScreen } from '../../ui/screens/title';
import type { CampaignController } from '../controller-types';
import { disposeMissionRenderers } from '../mission/mission-renderer';
import type { SkillLevel } from '../types';
import type { LobbyContext } from './lobby-context';

// =============================================================================
// Module State
// =============================================================================

/** Active pause coordinator for current mission */
let activePauseCoordinator: PauseCoordinatorHandle | null = null;

/** Flag to prevent multiple pause menus */
let pauseMenuOpen = false;

/** Stored context for showing pause menu from external triggers */
let storedController: CampaignController | null = null;
let storedLobbyContext: LobbyContext | null = null;
let storedSetupSettingsScreen:
  | ((c: CampaignController) => void | Promise<void>)
  | null = null;
let storedSetupTitleScreen: ((c: CampaignController) => Promise<void>) | null =
  null;

// =============================================================================
// Setup
// =============================================================================

/**
 * Setup multiplayer mission pause coordination.
 *
 * Call this when a multiplayer mission starts to enable pause handling.
 *
 * @param controller - Campaign controller
 * @param lobbyContext - Lobby context with session info
 * @returns Pause coordinator handle
 */
export function setupMultiplayerMissionPause(
  controller: CampaignController,
  lobbyContext: LobbyContext,
): PauseCoordinatorHandle {
  const { router } = lobbyContext;

  if (!controller.game) {
    throw new Error('Cannot setup pause handler without active game');
  }

  // Store context for external pause triggers
  storedController = controller;
  storedLobbyContext = lobbyContext;

  // Create pause coordinator
  const config: PauseCoordinatorConfig = {
    router,
    game: controller.game,
    lobbyContext,
    // Getter for multiplayer game state - coordinator uses this for pause/resume
    getMultiplayerGameState: () => controller.multiplayerGameState,
    onPauseTriggered: (_reason, _initiatedBy, _callsign) => {
      // Another player triggered pause - show our modal
      // This is called when we receive a PauseRequest from another player
      if (!pauseMenuOpen && storedController && storedLobbyContext) {
        void showPauseModalFromExternalTrigger();
      }
    },
    onResume: () => {
      // Resume is handled by the coordinator, just need to close modal
    },
    onPauseStateChange: (state) => {
      // Update the modal if it's open
      updatePauseModalState(state);
    },
    onPlayerDropped: (playerId, aiSkill) => {
      handlePlayerDropped(controller, lobbyContext, playerId, aiSkill);
    },
    onGuestQuit: (playerId) => {
      handleGuestQuit(controller, lobbyContext, playerId);
    },
  };

  const coordinator = initPauseCoordination(config);
  activePauseCoordinator = coordinator;

  return coordinator;
}

/**
 * Store setup callbacks for handling externally triggered pauses.
 * Call this when setting up the escape handler in multiplayer mode.
 */
export function storeMultiplayerPauseCallbacks(
  setupSettingsScreen: (c: CampaignController) => void | Promise<void>,
  setupTitleScreen: (c: CampaignController) => Promise<void>,
): void {
  storedSetupSettingsScreen = setupSettingsScreen;
  storedSetupTitleScreen = setupTitleScreen;
}

/**
 * Show pause modal when triggered by another player.
 */
async function showPauseModalFromExternalTrigger(): Promise<void> {
  if (
    pauseMenuOpen ||
    !activePauseCoordinator ||
    !storedController ||
    !storedLobbyContext
  ) {
    return;
  }

  // Capture local references (guaranteed non-null by check above)
  const coordinator = activePauseCoordinator;
  const controller = storedController;
  const lobbyContext = storedLobbyContext;

  // Use stored callbacks or create defaults
  const setupSettingsScreen = storedSetupSettingsScreen ?? (() => {});
  const setupTitleScreen = storedSetupTitleScreen ?? (async () => {});

  pauseMenuOpen = true;

  try {
    // Show the pause menu
    const result = await showMultiplayerPauseMenu(
      coordinator,
      (text) => {
        // Send chat message
        lobbyContext.router.broadcast({
          type: GameMessageType.ChatMessage,
          fromPlayerId: lobbyContext.localPlayerId,
          text,
          timestamp: Date.now(),
        });
      },
      (_state) => {
        // State change callback - modal handles this internally
      },
    );

    switch (result.action) {
      case 'resumed':
        // Game will resume via coordinator
        break;

      case 'settings':
        controller.pausedMissionForSettings = true;
        goToSettings(controller.screenManager);
        void setupSettingsScreen(controller);
        break;

      case 'quit':
        await handleQuit(controller, lobbyContext, setupTitleScreen);
        break;
    }
  } finally {
    pauseMenuOpen = false;
  }
}

/**
 * Handle player being dropped (convert to AI).
 */
function handlePlayerDropped(
  controller: CampaignController,
  lobbyContext: LobbyContext,
  playerId: string,
  aiSkill: SkillLevel,
): void {
  const { screenManager } = lobbyContext;
  const campaignState = screenManager.campaignState;

  if (!campaignState || !controller.game) return;

  // Update campaign state
  const newState = convertPlayerPilotToAI(campaignState, playerId, aiSkill);
  screenManager.campaignState = newState;

  // Update ECS entity if mission is running
  const world = controller.game.world;
  // Get playerEntityMap from multiplayer session if available
  const mpState = controller.multiplayerGameState;
  if (mpState) {
    const playerEntityMap = mpState.session.gameAdapter.getPlayerEntityMap();
    // PlayerId from rollback-netcode is a number, convert string playerId
    for (const [pid, entity] of playerEntityMap) {
      // Compare as strings since pid is PlayerId (number) but we have string
      if (String(pid) === playerId) {
        convertPlayerShipToAIMission(world, entity, aiSkill);
        break;
      }
    }
  }
}

/**
 * Handle guest quitting (same as drop with regular skill).
 */
function handleGuestQuit(
  controller: CampaignController,
  lobbyContext: LobbyContext,
  playerId: string,
): void {
  // Convert to AI with regular skill
  handlePlayerDropped(controller, lobbyContext, playerId, 'regular');
}

// =============================================================================
// Pause Menu Handling
// =============================================================================

/**
 * Handle multiplayer pause from escape key.
 *
 * Shows the multiplayer pause modal and processes the result.
 *
 * @param controller - Campaign controller
 * @param lobbyContext - Lobby context
 * @param setupSettingsScreen - Callback to setup settings screen
 * @param setupTitleScreen - Callback to setup title screen after quit
 */
export async function handleMultiplayerPause(
  controller: CampaignController,
  lobbyContext: LobbyContext,
  setupSettingsScreen: (controller: CampaignController) => void | Promise<void>,
  setupTitleScreen: (controller: CampaignController) => Promise<void>,
): Promise<void> {
  if (pauseMenuOpen || !activePauseCoordinator) {
    return;
  }

  const coordinator = activePauseCoordinator;

  // Set this early to prevent onPauseTriggered from showing a second modal
  pauseMenuOpen = true;

  // Request pause if not already paused
  if (!coordinator.isPaused()) {
    coordinator.requestPause();
  }

  try {
    // Show the pause menu
    const result = await showMultiplayerPauseMenu(
      coordinator,
      (text) => {
        // Send chat message
        lobbyContext.router.broadcast({
          type: GameMessageType.ChatMessage,
          fromPlayerId: lobbyContext.localPlayerId,
          text,
          timestamp: Date.now(),
        });
      },
      (_state) => {
        // State change callback - modal handles this internally
      },
    );

    switch (result.action) {
      case 'resumed':
        // Game will resume via coordinator
        break;

      case 'settings':
        // Mark that we're going to settings from mission
        controller.pausedMissionForSettings = true;
        goToSettings(controller.screenManager);
        void setupSettingsScreen(controller);
        break;

      case 'quit':
        await handleQuit(controller, lobbyContext, setupTitleScreen);
        break;
    }
  } finally {
    pauseMenuOpen = false;
  }
}

/**
 * Handle quit action from pause menu.
 */
async function handleQuit(
  controller: CampaignController,
  lobbyContext: LobbyContext,
  setupTitleScreen: (controller: CampaignController) => Promise<void>,
): Promise<void> {
  // Show confirmation for guests
  if (!lobbyContext.isHost) {
    const { confirmed } = await showQuitConfirmModal();
    if (!confirmed) return;

    // Send quit request to host
    activePauseCoordinator?.requestQuit();
  }

  // Clean up mission
  controller.pausedMissionForSettings = false;

  // Stop the appropriate game loop
  if (controller.multiplayerGameState) {
    stopMultiplayerGameLoop(controller.multiplayerGameState);
    controller.multiplayerGameState = null;
  }
  if (controller.game) {
    stopGame(controller.game);
    controller.game = null;
  }

  if (controller.missionRenderers) {
    disposeMissionRenderers(controller.missionRenderers);
    controller.missionRenderers = null;
  }

  if (controller.missionContainer) {
    controller.missionContainer.innerHTML = '';
  }

  // Clean up pause coordinator
  cleanupMultiplayerPause();

  // Return to title
  cleanupTitleScreen();
  void resetTitleScreen();
  goToTitle(controller.screenManager);
  void setupTitleScreen(controller);
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Clean up multiplayer pause handler.
 *
 * Call this when mission ends or player leaves.
 */
export function cleanupMultiplayerPause(): void {
  if (activePauseCoordinator) {
    activePauseCoordinator.destroy();
    activePauseCoordinator = null;
  }
  pauseMenuOpen = false;
  storedController = null;
  storedLobbyContext = null;
  storedSetupSettingsScreen = null;
  storedSetupTitleScreen = null;
}

/**
 * Get the active pause coordinator.
 */
export function getActivePauseCoordinator(): PauseCoordinatorHandle | null {
  return activePauseCoordinator;
}

/**
 * Check if multiplayer pause is currently active.
 */
export function isMultiplayerPauseActive(): boolean {
  return activePauseCoordinator?.isPaused() ?? false;
}
