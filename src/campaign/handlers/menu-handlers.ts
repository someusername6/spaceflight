/**
 * Menu Handlers - Title screen and settings screen setup.
 *
 * Handles:
 * - Title screen rendering and callbacks (new game, continue, settings)
 * - Settings screen rendering and callbacks (back navigation, canvas transfer)
 * - Campaign creation flow with commander name, ironman mode, and autoaim
 */

import { resumeGame } from '../../game';
import { setPlayerAutoaim } from '../../settings/game-settings';
import {
  getScreenElement,
  goBackFromLoadCampaign,
  goBackFromReplays,
  goBackFromReplayViewer,
  goBackFromSettings,
  goToLoadCampaign,
  goToReplays,
  goToReplayViewer,
  goToSettings,
  Screen,
  type ScreenManager,
  updateCampaignState,
} from '../../ui/common/screens';
import { showCampaignCreateModal } from '../../ui/screens/campaign-create';
import {
  bindLoadCampaignScreen,
  cleanupLoadCampaignScreen,
  type LoadCampaignCallbacks,
  renderLoadCampaignScreen,
  storeBattleCanvas as storeLoadCampaignBattleCanvas,
} from '../../ui/screens/load-campaign';
import {
  bindReplaysScreen,
  cleanupReplaysScreen,
  renderReplaysScreen,
} from '../../ui/screens/replay/replay-list';
import {
  bindReplayViewer,
  cleanupReplayViewer,
  renderReplayViewer,
} from '../../ui/screens/replay/replay-viewer';
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
import {
  forceSave,
  type SlotId,
  setActiveSlotId,
  setCampaignCreatedAt,
} from '../storage';
import type { CampaignSettings, CampaignState } from '../types';

/**
 * Sync global autoaim setting with campaign autoaim.
 * Called when loading or creating a campaign.
 */
export function syncAutoaimFromCampaign(state: CampaignState): void {
  setPlayerAutoaim(state.settings.autoaimDegrees);
}

/**
 * Create a new campaign and save it to a slot.
 */
export async function createAndSaveNewCampaign(
  screenManager: ScreenManager,
  settings: CampaignSettings,
  slotId: SlotId,
): Promise<void> {
  // Create campaign state with user settings
  const newState = createNewCampaign(settings);
  updateCampaignState(screenManager, newState);

  // Set this slot as active
  setActiveSlotId(slotId);

  // Initialize creation timestamp for this slot
  setCampaignCreatedAt(slotId, Date.now());

  // Save to IndexedDB
  await forceSave(newState, 'new-campaign');

  // Sync autoaim setting
  syncAutoaimFromCampaign(newState);
}

/**
 * Setup title screen with callbacks.
 *
 * @param controller - Campaign controller instance
 * @param onStartGameplay - Callback when user starts gameplay (new game or continue)
 */
export async function setupTitleScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
): Promise<void> {
  const { screenManager } = controller;
  const titleElement = getScreenElement(screenManager, Screen.TITLE);

  renderTitleScreen(titleElement);
  await bindTitleScreen(titleElement, {
    onNewGame: () => {
      goToLoadCampaign(screenManager);
      void setupLoadCampaignScreen(controller, onStartGameplay);
    },
    onSettings: () => {
      goToSettings(screenManager);
      void setupSettingsScreen(controller, onStartGameplay);
    },
    onReplays: () => {
      goToReplays(screenManager);
      setupReplaysScreen(controller, onStartGameplay);
    },
  });
}

/**
 * Setup load campaign screen with callbacks.
 */
export async function setupLoadCampaignScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
): Promise<void> {
  const { screenManager } = controller;
  const loadCampaignElement = getScreenElement(
    screenManager,
    Screen.LOAD_CAMPAIGN,
  );

  renderLoadCampaignScreen(loadCampaignElement);

  const callbacks: LoadCampaignCallbacks = {
    onBack: () => {
      // Transfer canvas back to title if needed
      if (hasBattleSimulation()) {
        const canvas = getBattleSimulationCanvas();
        const titleBg = document.getElementById('title-battle-bg');
        if (canvas && titleBg) {
          titleBg.appendChild(canvas);
        }
      }

      cleanupLoadCampaignScreen();
      goBackFromLoadCampaign(screenManager);

      // Re-setup title screen
      void setupTitleScreen(controller, onStartGameplay);
    },
    onLoad: (state, _slotId) => {
      // User loaded existing campaign
      cleanupLoadCampaignScreen();
      updateCampaignState(screenManager, state);
      syncAutoaimFromCampaign(state);
      onStartGameplay();
    },
    onCreate: async (slotId) => {
      // User wants to create new campaign in selected slot
      const createResult = await showCampaignCreateModal({ slotId });
      if (createResult.action === 'cancel') {
        return; // User cancelled creation
      }

      // Create and save new campaign
      const finalSlotId = createResult.slotId ?? slotId;
      await createAndSaveNewCampaign(
        screenManager,
        createResult.settings,
        finalSlotId,
      );

      cleanupLoadCampaignScreen();
      onStartGameplay();
    },
  };

  await bindLoadCampaignScreen(loadCampaignElement, callbacks);

  // Transfer battle simulation to load campaign background AFTER bind
  if (hasBattleSimulation()) {
    const canvas = getBattleSimulationCanvas();
    const loadCampaignScreen = loadCampaignElement.querySelector(
      '.load-campaign-screen',
    );
    const loadCampaignBg = loadCampaignElement.querySelector(
      '#load-campaign-battle-bg',
    );

    if (canvas && loadCampaignScreen && loadCampaignBg) {
      loadCampaignBg.appendChild(canvas);
      loadCampaignScreen.classList.add('with-battle-bg');
      // Store canvas reference so screen can re-attach after re-renders
      storeLoadCampaignBattleCanvas(canvas);
    }
  }
}

/**
 * Setup replays screen with callbacks.
 */
export function setupReplaysScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
): void {
  const { screenManager } = controller;
  const replaysElement = getScreenElement(screenManager, Screen.REPLAYS);

  renderReplaysScreen(replaysElement);
  bindReplaysScreen(replaysElement, {
    onBack: () => {
      // Transfer canvas back to title if coming from there
      if (
        screenManager.previousScreen === Screen.TITLE &&
        hasBattleSimulation()
      ) {
        const canvas = getBattleSimulationCanvas();
        const titleBg = document.getElementById('title-battle-bg');
        if (canvas && titleBg) {
          titleBg.appendChild(canvas);
        }
      }

      cleanupReplaysScreen();
      goBackFromReplays(screenManager);

      // Re-setup the screen we're returning to
      const currentScreen = screenManager.currentScreen;
      if (currentScreen === Screen.TITLE) {
        void setupTitleScreen(controller, onStartGameplay);
      }
    },
    onWatch: (replayId: string) => {
      goToReplayViewer(screenManager);
      setupReplayViewer(controller, onStartGameplay, replayId);
    },
  });
}

/**
 * Setup replay viewer screen.
 */
export function setupReplayViewer(
  controller: CampaignController,
  onStartGameplay: () => void,
  replayId: string,
): void {
  const { screenManager } = controller;
  const viewerElement = getScreenElement(screenManager, Screen.REPLAY_VIEWER);

  renderReplayViewer(viewerElement);
  bindReplayViewer(viewerElement, replayId, {
    onBack: () => {
      cleanupReplayViewer();
      goBackFromReplayViewer(screenManager);

      // Re-setup replays list
      setupReplaysScreen(controller, onStartGameplay);
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
export async function setupSettingsScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
  setupSquadronScreen?: (controller: CampaignController) => void,
): Promise<void> {
  const { screenManager } = controller;
  const settingsElement = getScreenElement(screenManager, Screen.SETTINGS);
  const comingFromTitle = screenManager.previousScreen === Screen.TITLE;

  renderSettingsScreen(settingsElement);
  await bindSettingsScreen(settingsElement, {
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
        void setupTitleScreen(controller, onStartGameplay);
      } else if (currentScreen === Screen.SQUADRON && setupSquadronScreen) {
        setupSquadronScreen(controller);
      }
    },
    onCampaignImported: (state: CampaignState) => {
      // Update campaign state in screen manager when imported
      updateCampaignState(screenManager, state);
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
