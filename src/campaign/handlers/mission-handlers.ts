/**
 * Mission Handlers - Post-mission special case handlers.
 *
 * Handles:
 * - Non-ironman defeat (checkpoint restore)
 * - Game over screen (ironman permadeath)
 * - Retirement screen (campaign victory)
 *
 * For regular results screens, see mission-results.ts
 */

import { logError } from '../../core/logger';
import type { World } from '../../core/types';
import {
  broadcastSessionEnded,
  triggerReturnToLobby,
} from '../../multiplayer/session-lifecycle';
import {
  getScreenElement,
  goToGameOver,
  goToSquadron,
  goToTitle,
  Screen,
  updateCampaignState,
} from '../../ui/common/screens';
import { collectDebriefData } from '../../ui/screens/results/debrief';
import {
  createGameOverUI,
  createResultsUI,
  createRetirementUI,
} from '../../ui/screens/results/results';
import { resetTitleScreen } from '../../ui/screens/title';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import {
  deleteCampaign,
  deleteCheckpoint,
  getActiveSlotId,
  loadCheckpoint,
} from '../storage';
import type { Contract } from '../types';
import { setupSquadronScreen } from './campaign-handlers';
import { sendChat } from './lobby-actions';
import { getLobbyContext, setLobbyContext } from './lobby-context';
import { rebindLobbyScreen } from './lobby-handlers';
import { setupTitleScreen } from './menu-handlers';

// Re-export results functions for backwards compatibility
export {
  type ShowResultsOptions,
  showMultiplayerResults,
  showResults,
} from './mission-results';

/**
 * Handle non-ironman defeat by showing debrief then restoring from checkpoint.
 * Shows results screen with combat stats, then returns to squadron (singleplayer)
 * or lobby (multiplayer) for retry.
 *
 * @param controller - Campaign controller instance
 * @param setupContractsScreen - Callback to setup contracts screen
 * @param contract - The contract that was attempted
 * @param world - World reference for debrief stats extraction
 */
export function handleNonIronmanDefeat(
  controller: CampaignController,
  setupContractsScreen: (controller: CampaignController) => void,
  contract: Contract,
  world: World,
): void {
  const { screenManager } = controller;
  const lobbyCtx = getLobbyContext();

  // Show results screen with debrief (no salvage on defeat)
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  // Restore checkpoint helper (shared between singleplayer and multiplayer)
  const restoreCheckpoint = async (): Promise<boolean> => {
    const slotId = getActiveSlotId();
    const checkpoint = slotId ? await loadCheckpoint(slotId) : null;

    if (checkpoint && slotId) {
      updateCampaignState(screenManager, checkpoint);
      await deleteCheckpoint(slotId);
      return true;
    }
    return false;
  };

  if (lobbyCtx) {
    // Multiplayer path: show results with chat, return to lobby on continue
    lobbyCtx.onReturnToLobby = async () => {
      // Restore checkpoint before returning to lobby
      const restored = await restoreCheckpoint();
      if (!restored) {
        logError('No checkpoint found for non-ironman defeat in multiplayer');
      }

      rebindLobbyScreen(controller, lobbyCtx);
    };

    const onContinue = () => {
      if (lobbyCtx.isHost) {
        triggerReturnToLobby(lobbyCtx);
      }
    };

    const onSendChat = (text: string) => {
      sendChat(lobbyCtx, text);
    };

    createResultsUI(
      resultsElement,
      false, // victory = false
      contract,
      screenManager.campaignState,
      onContinue,
      world,
      null, // no salvage on defeat
      undefined, // earnedReward
      undefined, // escortResults
      undefined, // ambushResults
      undefined, // stationDefenseResults
      undefined, // attackStationResults
      {
        isMultiplayer: true,
        isHost: lobbyCtx.isHost,
        chatMessages: lobbyCtx.lobbyState.chatMessages,
        onSendChat,
      },
    );
  } else {
    // Singleplayer path: return to squadron for retry
    createResultsUI(
      resultsElement,
      false, // victory = false
      contract,
      screenManager.campaignState,
      async () => {
        const restored = await restoreCheckpoint();
        if (restored) {
          goToSquadron(screenManager);
          const squadronElement = getScreenElement(
            screenManager,
            Screen.SQUADRON,
          );
          setupSquadronScreen(
            controller,
            squadronElement,
            setupContractsScreen,
          );
        } else {
          logError(
            'No checkpoint found for non-ironman defeat - falling back to game over',
          );
          await showGameOver(controller);
        }
      },
      world,
      null, // no salvage on defeat
    );
  }
}

/**
 * Show game over screen (ironman mode only - permadeath).
 *
 * In multiplayer, this ends the session for all players.
 *
 * @param controller - Campaign controller instance
 * @param world - Optional world for collecting debrief stats
 */
export async function showGameOver(
  controller: CampaignController,
  world?: World,
): Promise<void> {
  const { screenManager } = controller;
  const gameOverElement = getScreenElement(screenManager, Screen.GAME_OVER);

  // Collect debrief data if world is available
  const debriefData = world ? collectDebriefData(world) : null;

  // Delete the failed campaign from storage (permadeath)
  const currentSlotId = getActiveSlotId();
  if (currentSlotId) {
    try {
      await deleteCampaign(currentSlotId);
    } catch (error) {
      // Log but continue - old data will be overwritten on next save
      logError('Failed to delete campaign on game over:', error);
    }
  }

  // Show the game over screen FIRST (element must be visible for createScreen to render)
  goToGameOver(screenManager);

  createGameOverUI(
    gameOverElement,
    screenManager.campaignState,
    async () => {
      // In multiplayer, broadcast session end to guests when host clicks the button
      // (not earlier, so guests have time to show their own game over screen)
      const lobbyCtx = getLobbyContext();
      if (lobbyCtx?.isHost) {
        broadcastSessionEnded(lobbyCtx, 'Campaign ended (commander died)');
      }

      // Clean up lobby connection if in multiplayer
      if (lobbyCtx) {
        lobbyCtx.cleanup();
        lobbyCtx.connectionFlow.disconnect().catch(() => {
          // Ignore disconnect errors
        });
        lobbyCtx.connectionFlow.dispose();
        setLobbyContext(null);
      }

      // Return to title screen - user can start new game or load another campaign
      void resetTitleScreen();
      goToTitle(screenManager);

      // Setup title screen with gameplay callback
      const onStartGameplay = () => startCampaignGameplay(controller);
      await setupTitleScreen(controller, onStartGameplay);
    },
    debriefData,
  );
}

/**
 * Handle player retirement (sector 5 only - successful campaign end).
 *
 * Shows the retirement screen with tier achievement, then returns to title.
 * Campaign is deleted as it's complete.
 *
 * @param controller - Campaign controller instance
 */
export async function handleRetirement(
  controller: CampaignController,
): Promise<void> {
  const { screenManager } = controller;

  // Use game-over element for retirement screen (same slot)
  const retirementElement = getScreenElement(screenManager, Screen.GAME_OVER);

  // Delete the completed campaign from storage
  const currentSlotId = getActiveSlotId();
  if (currentSlotId) {
    try {
      await deleteCampaign(currentSlotId);
    } catch (error) {
      // Log but continue - player earned their retirement
      logError('Failed to delete campaign on retirement:', error);
    }
  }

  createRetirementUI(
    retirementElement,
    screenManager.campaignState,
    async () => {
      // Return to title screen
      void resetTitleScreen();
      goToTitle(screenManager);

      // Setup title screen with gameplay callback
      const onStartGameplay = () => startCampaignGameplay(controller);
      await setupTitleScreen(controller, onStartGameplay);
    },
  );

  goToGameOver(screenManager);
}
