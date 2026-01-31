/**
 * Campaign Menu Handlers - Load campaign, host game, join game, and room screens.
 *
 * Handles:
 * - Load campaign screen setup (for both normal play and hosting)
 * - Join game screen setup
 * - Room created screen setup (host flow)
 */

import { logError } from '../../core/logger';
import {
  type ConnectionFlow,
  createConnectionFlow,
} from '../../multiplayer/networking/connection-flow';
import type { ConnectionResult } from '../../multiplayer/networking/types';
import {
  getScreenElement,
  goBackFromJoinGame,
  goBackFromLoadCampaign,
  Screen,
  updateCampaignState,
} from '../../ui/common/screens';
import { showCampaignCreateModal } from '../../ui/screens/campaign-create';
import {
  bindJoinGameScreen,
  cleanupJoinGameScreen,
  renderJoinGameScreen,
} from '../../ui/screens/join-game';
import {
  bindLoadCampaignScreen,
  cleanupLoadCampaignScreen,
  type LoadCampaignCallbacks,
  renderLoadCampaignScreen,
  storeBattleCanvas as storeLoadCampaignBattleCanvas,
} from '../../ui/screens/load-campaign';
import {
  cleanupRoomCreatedScreen,
  renderRoomCreatedScreen,
} from '../../ui/screens/room-created';
import {
  getBattleSimulationCanvas,
  hasBattleSimulation,
} from '../../ui/screens/title';
import type { CampaignController } from '../controller-types';
import type { SlotId } from '../storage';
import {
  setupLobbyScreenForGuest,
  setupLobbyScreenForHost,
} from './lobby-handlers';
import {
  createAndSaveNewCampaign,
  setupTitleScreen,
  syncAutoaimFromCampaign,
} from './menu-handlers';

/**
 * Create the onBack callback for load campaign screens.
 * Shared between normal and hosting modes.
 */
function createLoadCampaignBackHandler(
  controller: CampaignController,
  onStartGameplay: () => void,
): () => void {
  const { screenManager } = controller;

  return () => {
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
  };
}

/**
 * Transfer battle canvas to load campaign screen background.
 */
function transferBattleCanvasToLoadCampaign(
  loadCampaignElement: HTMLElement,
): void {
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
      storeLoadCampaignBattleCanvas(canvas);
    }
  }
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
    onBack: createLoadCampaignBackHandler(controller, onStartGameplay),
    onLoad: (state, _slotId) => {
      cleanupLoadCampaignScreen();
      updateCampaignState(screenManager, state);
      syncAutoaimFromCampaign(state);
      onStartGameplay();
    },
    onCreate: async (slotId) => {
      const createResult = await showCampaignCreateModal({ slotId });
      if (createResult.action === 'cancel') {
        return;
      }

      const finalSlotId = (createResult.slotId ?? slotId) as SlotId;
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
  transferBattleCanvasToLoadCampaign(loadCampaignElement);
}

/**
 * Setup load campaign screen for hosting multiplayer.
 * Reuses the load campaign screen but loading triggers hosting instead of gameplay.
 */
export async function setupLoadCampaignScreenForHosting(
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
    onBack: createLoadCampaignBackHandler(controller, onStartGameplay),
    onLoad: (state, _slotId) => {
      cleanupLoadCampaignScreen();
      updateCampaignState(screenManager, state);
      syncAutoaimFromCampaign(state);
      // Start hosting flow instead of gameplay
      void setupRoomCreatedScreen(controller, onStartGameplay);
    },
    onCreate: async (slotId) => {
      const createResult = await showCampaignCreateModal({ slotId });
      if (createResult.action === 'cancel') {
        return;
      }

      const finalSlotId = (createResult.slotId ?? slotId) as SlotId;
      await createAndSaveNewCampaign(
        screenManager,
        createResult.settings,
        finalSlotId,
      );

      // Clean up load campaign screen before transitioning
      cleanupLoadCampaignScreen();

      // After creating, go directly to hosting
      void setupRoomCreatedScreen(controller, onStartGameplay);
    },
  };

  await bindLoadCampaignScreen(loadCampaignElement, callbacks);
  transferBattleCanvasToLoadCampaign(loadCampaignElement);
}

/**
 * Setup join game screen with callbacks.
 */
export function setupJoinGameScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
): void {
  const { screenManager } = controller;
  const joinGameElement = getScreenElement(screenManager, Screen.JOIN_GAME);

  renderJoinGameScreen(joinGameElement);
  bindJoinGameScreen(joinGameElement, {
    onBack: () => {
      cleanupJoinGameScreen();
      goBackFromJoinGame(screenManager);
      void setupTitleScreen(controller, onStartGameplay);
    },
    onJoined: (result: ConnectionResult, connectionFlow: ConnectionFlow) => {
      // Successfully joined - transition to multiplayer lobby
      cleanupJoinGameScreen();
      setupLobbyScreenForGuest(controller, result, connectionFlow);
    },
  });
}

/**
 * Setup room created screen with callbacks (host flow).
 * After creating room, transitions to lobby screen.
 */
export async function setupRoomCreatedScreen(
  controller: CampaignController,
  onStartGameplay: () => void,
): Promise<void> {
  const { screenManager } = controller;
  const roomCreatedElement = getScreenElement(
    screenManager,
    Screen.ROOM_CREATED,
  );

  renderRoomCreatedScreen(roomCreatedElement);

  try {
    const connectionFlow = createConnectionFlow();
    const result = await connectionFlow.createRoom();

    // Transition directly to lobby screen instead of room-created
    cleanupRoomCreatedScreen();
    setupLobbyScreenForHost(controller, result, connectionFlow);
  } catch (error) {
    // Failed to create room - stay on load campaign (hosting mode)
    logError('Failed to create room:', error);
    void setupLoadCampaignScreenForHosting(controller, onStartGameplay);
  }
}
