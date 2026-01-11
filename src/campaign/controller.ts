/**
 * Campaign Controller - Thin orchestrator for campaign flow.
 *
 * This module:
 * - Initializes the campaign and screen manager
 * - Wires together screen handlers with proper callbacks
 * - Delegates all screen setup to handlers/ modules
 *
 * Handler Organization:
 * - handlers/menu-handlers.ts: Title screen, settings screen
 * - handlers/campaign-handlers.ts: Squadron, store, contracts screens
 * - handlers/mission-handlers.ts: Results, game-over screens
 * - handlers/pause-handler.ts: Escape key, pause menu
 */

import { initKeyBindings } from '../input/key-bindings';
import { initGameSettings } from '../settings/game-settings';
import { initInput } from '../systems/input';
import {
  createScreenManager,
  getScreenElement,
  goToSquadron,
  goToTitle,
  Screen,
} from '../ui/common/screens';
import { cleanupTitleScreen } from '../ui/screens/title';
import type { CampaignController } from './controller-types';
import {
  setupContractsScreen,
  setupSquadronScreen,
} from './handlers/campaign-handlers';
import {
  setupSettingsScreen,
  setupTitleScreen,
} from './handlers/menu-handlers';
import { setupEscapeHandler } from './handlers/pause-handler';
import { createNewCampaign } from './state';

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
    missionRenderers: null,
    missionEnded: false,
    pausedMissionForSettings: false,
  };

  // Setup title screen with gameplay transition callback
  const onStartGameplay = () => startCampaignGameplay(controller);
  setupTitleScreen(controller, onStartGameplay);

  // Show title screen initially
  goToTitle(screenManager);

  console.log('Campaign initialized - showing title screen');

  return controller;
}

/** Start gameplay (from new game or continue) */
function startCampaignGameplay(controller: CampaignController): void {
  const { screenManager } = controller;

  // Stop title screen battle simulation (it was running in the background)
  cleanupTitleScreen();

  // Create setup callbacks for handler wiring
  const setupContracts = (ctrl: CampaignController) =>
    setupContractsScreen(ctrl);

  // Create settings screen setup with squadron re-setup capability
  const setupSettings = (ctrl: CampaignController) => {
    const onStartGameplay = () => startCampaignGameplay(ctrl);
    const reSetupSquadron = (c: CampaignController) => {
      const squadronEl = getScreenElement(c.screenManager, Screen.SQUADRON);
      setupSquadronScreen(c, squadronEl, setupContracts);
    };
    setupSettingsScreen(ctrl, onStartGameplay, reSetupSquadron);
  };

  // Create title screen setup for quit handler
  const setupTitle = (ctrl: CampaignController) => {
    const onStartGameplay = () => startCampaignGameplay(ctrl);
    setupTitleScreen(ctrl, onStartGameplay);
  };

  // Setup squadron screen
  const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
  setupSquadronScreen(controller, squadronElement, setupContracts);

  // Show squadron
  goToSquadron(screenManager);

  // Setup global escape key handler for pause menu
  setupEscapeHandler(controller, setupSettings, setupTitle);

  const { campaignState } = screenManager;
  console.log('Campaign gameplay started');
  console.log(`Credits: ${campaignState.credits}`);
  console.log(`Ships: ${campaignState.ships.length}`);
}
