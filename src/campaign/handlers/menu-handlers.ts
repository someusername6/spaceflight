/**
 * Menu Handlers - Title screen and settings screen setup.
 *
 * Handles:
 * - Title screen rendering and callbacks (new game, continue, settings)
 * - Settings screen rendering and callbacks (back navigation, canvas transfer)
 */

import { resumeGame } from '../../game';
import {
  getScreenElement,
  goBackFromSettings,
  goToSettings,
  Screen,
  setCurrentSaveSlot,
  updateCampaignState,
} from '../../ui/common/screens';
import {
  bindSettingsScreen,
  cleanupSettingsScreen,
  renderSettingsScreen,
  storeBattleCanvas,
} from '../../ui/screens/settings';
import {
  bindTitleScreen,
  getBattleSimulationCanvas,
  hasBattleSimulation,
  renderTitleScreen,
} from '../../ui/screens/title';
import type { CampaignController } from '../controller-types';
import { createNewCampaign } from '../state';
import type { CampaignState } from '../types';

/**
 * Setup title screen with callbacks.
 *
 * @param controller - Campaign controller instance
 * @param onStartGameplay - Callback when user starts gameplay (new game or continue)
 */
export function setupTitleScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
): void {
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
      onStartGameplay();
    },
    onContinue: (state: CampaignState, slot: number) => {
      // Use loaded campaign state
      updateCampaignState(screenManager, state);
      setCurrentSaveSlot(screenManager, slot);

      // Transition to squadron
      onStartGameplay();
    },
    onSettings: () => {
      goToSettings(screenManager);
      setupSettingsScreen(controller, onStartGameplay);
    },
  });
}

/**
 * Setup settings screen with callbacks.
 *
 * @param controller - Campaign controller instance
 * @param onStartGameplay - Callback for starting gameplay (passed through for title re-setup)
 * @param setupSquadronScreen - Optional callback to re-setup squadron when returning from settings
 */
export function setupSettingsScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
  setupSquadronScreen?: (controller: CampaignController) => void,
): void {
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

      // Resume game if we came from a paused mission
      if (controller.pausedMissionForSettings && controller.game) {
        controller.pausedMissionForSettings = false;
        resumeGame(controller.game);
        return; // Mission screen doesn't need re-setup
      }

      // Re-setup the screen we're returning to
      const currentScreen = screenManager.currentScreen;
      if (currentScreen === Screen.TITLE) {
        setupTitleScreen(controller, onStartGameplay);
      } else if (currentScreen === Screen.SQUADRON && setupSquadronScreen) {
        setupSquadronScreen(controller);
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
