/**
 * Pause Handler - Escape key handling and pause menu logic.
 *
 * Handles:
 * - Global escape key listener for campaign and mission screens
 * - Pause menu display and action handling
 * - Settings navigation from paused state
 * - Game quit and cleanup
 */

import { pauseGame, resumeGame, stopGame } from '../../game';
import { goToSettings, goToTitle, Screen } from '../../ui/common/screens';
import { showPauseMenu } from '../../ui/screens/pause-menu';
import { closePopovers } from '../../ui/screens/popover-layer';
import { cleanupTitleScreen, resetTitleScreen } from '../../ui/screens/title';
import type { CampaignController } from '../controller-types';
import { disposeMissionRenderers } from '../mission/mission-renderer';
import { getLobbyContext, isInLobby } from './lobby-context';
import {
  handleMultiplayerPause,
  storeMultiplayerPauseCallbacks,
} from './multiplayer-pause-handler';

/** Module-level escape key handler reference for cleanup */
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

/** Track if pause menu is currently open to prevent re-opening */
let pauseMenuOpen = false;

/**
 * Setup global escape key handler for pause menu.
 *
 * @param controller - Campaign controller instance
 * @param setupSettingsScreen - Callback to setup settings screen
 * @param setupTitleScreen - Callback to setup title screen after quit
 */
export function setupEscapeHandler(
  controller: CampaignController,
  setupSettingsScreen: (controller: CampaignController) => void | Promise<void>,
  setupTitleScreen: (controller: CampaignController) => Promise<void>,
): void {
  // Remove any existing handler
  cleanupEscapeHandler();

  // Store callbacks for multiplayer pause handling (externally triggered pauses)
  storeMultiplayerPauseCallbacks(setupSettingsScreen, setupTitleScreen);

  escapeHandler = async (e: KeyboardEvent) => {
    const { screenManager } = controller;

    // Handle escape on campaign screens and during missions
    const pauseableScreens = [
      Screen.SQUADRON,
      Screen.STORE,
      Screen.CONTRACTS,
      Screen.RESULTS,
      Screen.MISSION,
    ];

    if (
      e.code === 'Escape' &&
      pauseableScreens.includes(screenManager.currentScreen)
    ) {
      e.preventDefault();

      // Prevent re-opening pause menu if already open
      if (pauseMenuOpen) {
        return;
      }

      const inMission = screenManager.currentScreen === Screen.MISSION;

      // Check for multiplayer mission mode
      if (inMission && isInLobby()) {
        const lobbyContext = getLobbyContext();
        if (lobbyContext) {
          // Use multiplayer pause handler
          pauseMenuOpen = true;
          try {
            await handleMultiplayerPause(
              controller,
              lobbyContext,
              setupSettingsScreen,
              setupTitleScreen,
            );
          } finally {
            pauseMenuOpen = false;
          }
          return;
        }
      }

      // Single-player pause handling
      // Pause game during mission
      if (inMission && controller.game) {
        pauseGame(controller.game);
      }

      // Close any open popovers before showing pause menu
      closePopovers();

      pauseMenuOpen = true;
      try {
        await handlePauseMenu(
          controller,
          inMission,
          setupSettingsScreen,
          setupTitleScreen,
        );
      } finally {
        pauseMenuOpen = false;
      }

      // Resume game if still in mission (not quit)
      if (
        inMission &&
        controller.game &&
        screenManager.currentScreen === Screen.MISSION
      ) {
        resumeGame(controller.game);
      }
    }
  };

  document.addEventListener('keydown', escapeHandler);
}

/** Cleanup global escape key handler */
export function cleanupEscapeHandler(): void {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
}

/**
 * Handle pause menu from campaign screens.
 *
 * @param controller - Campaign controller instance
 * @param inMission - Whether currently in a mission
 * @param setupSettingsScreen - Callback to setup settings screen
 * @param setupTitleScreen - Callback to setup title screen after quit
 */
export async function handlePauseMenu(
  controller: CampaignController,
  inMission: boolean,
  setupSettingsScreen: (controller: CampaignController) => void | Promise<void>,
  setupTitleScreen: (controller: CampaignController) => Promise<void>,
): Promise<void> {
  const { screenManager } = controller;

  const result = await showPauseMenu();

  switch (result.action) {
    case 'resume':
      // Just close the menu, nothing to do
      break;

    case 'settings':
      // Track if we're going to settings from a paused mission
      if (inMission) {
        controller.pausedMissionForSettings = true;
      }
      goToSettings(screenManager);
      void setupSettingsScreen(controller);
      break;

    case 'quit':
      // Reset paused mission tracking
      controller.pausedMissionForSettings = false;

      // If in mission, stop the game and clean up mission resources
      if (inMission && controller.game) {
        stopGame(controller.game);
        controller.game = null;

        // Dispose renderer resources (WebGL context, etc.)
        if (controller.missionRenderers) {
          disposeMissionRenderers(controller.missionRenderers);
          controller.missionRenderers = null;
        }

        // Clear mission container
        if (controller.missionContainer) {
          controller.missionContainer.innerHTML = '';
        }
      }

      // Cleanup handlers and return to title
      cleanupEscapeHandler();
      cleanupTitleScreen();
      void resetTitleScreen();
      goToTitle(screenManager);
      void setupTitleScreen(controller);
      break;
  }
}
