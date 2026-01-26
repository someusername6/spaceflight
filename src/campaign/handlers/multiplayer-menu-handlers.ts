/**
 * Multiplayer Menu Handlers - Join game, host game, and room management screens.
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
  goBackFromRoomCreated,
  goToRoomCreated,
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
  bindRoomCreatedScreen,
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
  createAndSaveNewCampaign,
  setupTitleScreen,
  syncAutoaimFromCampaign,
} from './menu-handlers';

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

  // Transfer battle simulation to load campaign background AFTER bind
  transferBattleCanvasToLoadCampaign(loadCampaignElement);
}

/**
 * Setup load campaign screen for hosting multiplayer.
 * Reuses the load campaign screen but loading a slot triggers hosting instead of gameplay.
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
      // In hosting mode, loading triggers hosting instead of gameplay
      cleanupLoadCampaignScreen();
      updateCampaignState(screenManager, state);
      syncAutoaimFromCampaign(state);

      // Start hosting flow
      void setupRoomCreatedScreen(controller, onStartGameplay);
    },
    onCreate: async (slotId) => {
      // User wants to create new campaign - same as normal flow
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

      // After creating, go directly to hosting
      void setupRoomCreatedScreen(controller, onStartGameplay);
    },
  };

  await bindLoadCampaignScreen(loadCampaignElement, callbacks);

  // Transfer battle simulation to load campaign background AFTER bind
  transferBattleCanvasToLoadCampaign(loadCampaignElement);
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

      // Re-setup title screen
      void setupTitleScreen(controller, onStartGameplay);
    },
    onJoined: (_result: ConnectionResult, _connectionFlow: ConnectionFlow) => {
      // Successfully joined - transition to multiplayer lobby (Phase 7)
      // For now, just clean up and return to title
      cleanupJoinGameScreen();
      goBackFromJoinGame(screenManager);
      void setupTitleScreen(controller, onStartGameplay);
    },
  });
}

/**
 * Setup room created screen with callbacks (host flow).
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
    // Create connection flow and room
    const connectionFlow = createConnectionFlow();
    const result = await connectionFlow.createRoom();

    goToRoomCreated(screenManager);
    bindRoomCreatedScreen(roomCreatedElement, result.roomCode, connectionFlow, {
      onCancel: () => {
        cleanupRoomCreatedScreen();
        goBackFromRoomCreated(screenManager);

        // Re-setup load campaign screen in hosting mode
        void setupLoadCampaignScreenForHosting(controller, onStartGameplay);
      },
    });
  } catch (error) {
    // Failed to create room - stay on load campaign (hosting mode)
    // Don't call goBackFromRoomCreated since goToRoomCreated was never called
    // and the load campaign screen is still visible
    logError('Failed to create room:', error);
    void setupLoadCampaignScreenForHosting(controller, onStartGameplay);
  }
}
