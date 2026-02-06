/**
 * Mission Results - Post-mission results screen display.
 *
 * Handles displaying results screens for both singleplayer and multiplayer:
 * - showResults: Singleplayer results with squadron return
 * - showMultiplayerResults: Multiplayer results with chat and lobby return
 */

import type { World } from '../../core/types';
import { triggerReturnToLobby } from '../../multiplayer/session-lifecycle';
import {
  getScreenElement,
  goToLobby,
  goToSquadron,
  goToTitle,
  Screen,
} from '../../ui/common/screens';
import { bindLobbyScreen, renderLobbyScreen } from '../../ui/screens/lobby';
import {
  type AmbushResultsDisplay,
  type AttackStationResultsDisplay,
  createResultsUI,
  type EscortResultsDisplay,
  type StationDefenseResultsDisplay,
} from '../../ui/screens/results/results';
import type { SalaryInfo } from '../../ui/screens/results/results-rewards';
import { resetTitleScreen } from '../../ui/screens/title';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import type { SalvageResult } from '../salvage';
import type { Contract } from '../types';
import {
  createNavigationHandler,
  setupContractsScreen,
  setupSquadronScreen,
} from './campaign-handlers';
import {
  changeCallsign,
  changePermissions,
  isLaunchCountdownActive,
  sendChat,
  toggleReady,
} from './lobby-actions';
import { getLobbyContext } from './lobby-context';
import { cleanupLobby } from './lobby-handlers';
import { setupTitleScreen } from './menu-handlers';

/** Options for showing the singleplayer results screen */
export interface ShowResultsOptions {
  controller: CampaignController;
  victory: boolean;
  contract: Contract;
  setupContractsScreen: (controller: CampaignController) => void;
  world?: World | undefined;
  salvage?: SalvageResult | null | undefined;
  earnedReward?: number | undefined;
  escortResults?: EscortResultsDisplay | undefined;
  ambushResults?: AmbushResultsDisplay | undefined;
  stationDefenseResults?: StationDefenseResultsDisplay | undefined;
  attackStationResults?: AttackStationResultsDisplay | undefined;
  salaryInfo?: SalaryInfo | undefined;
}

/** Show results screen after mission (singleplayer). */
export function showResults(options: ShowResultsOptions): void {
  const {
    controller,
    victory,
    contract,
    setupContractsScreen,
    world,
    salvage,
    earnedReward,
    escortResults,
    ambushResults,
    stationDefenseResults,
    attackStationResults,
    salaryInfo,
  } = options;
  const { screenManager } = controller;
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  createResultsUI(
    resultsElement,
    victory,
    contract,
    screenManager.campaignState,
    () => {
      // Return to squadron screen (sector advancement is now manual via contracts)
      goToSquadron(screenManager);
      const squadronElement = getScreenElement(screenManager, Screen.SQUADRON);
      setupSquadronScreen(controller, squadronElement, setupContractsScreen);
    },
    world,
    salvage,
    earnedReward,
    escortResults,
    ambushResults,
    stationDefenseResults,
    attackStationResults,
    undefined, // multiplayerOptions
    salaryInfo,
  );
}

/**
 * Show multiplayer results screen after mission.
 * Similar to showResults but with chat footer and host/guest handling.
 *
 * - Host: Shows Continue button that returns all players to lobby
 * - Guest: Shows "Waiting for host..." message
 */
export function showMultiplayerResults(
  controller: CampaignController,
  victory: boolean,
  contract: Contract,
  _setupContractsScreen: (controller: CampaignController) => void,
  world?: World,
  salvage?: SalvageResult | null,
  earnedReward?: number,
  escortResults?: EscortResultsDisplay,
  ambushResults?: AmbushResultsDisplay,
  stationDefenseResults?: StationDefenseResultsDisplay,
  attackStationResults?: AttackStationResultsDisplay,
  salaryInfo?: SalaryInfo,
): void {
  const { screenManager } = controller;
  const resultsElement = getScreenElement(screenManager, Screen.RESULTS);

  const lobbyCtx = getLobbyContext();
  if (!lobbyCtx) {
    // Fallback to singleplayer results if no lobby context
    showResults({
      controller,
      victory,
      contract,
      setupContractsScreen,
      world,
      salvage,
      earnedReward,
      escortResults,
      ambushResults,
      stationDefenseResults,
      attackStationResults,
      salaryInfo,
    });
    return;
  }

  // Setup the return-to-lobby callback
  lobbyCtx.onReturnToLobby = () => {
    // Navigate to lobby and re-setup screen
    const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);
    const campaignState = screenManager.campaignState;

    renderLobbyScreen(lobbyElement);
    goToLobby(screenManager);

    // Re-bind lobby screen with callbacks
    const campaignInfo = campaignState
      ? {
          credits: campaignState.credits,
          currentSector: campaignState.currentSector,
        }
      : undefined;

    bindLobbyScreen(
      lobbyElement,
      lobbyCtx.lobbyState,
      {
        onReady: (ready) => {
          const ctx = getLobbyContext();
          if (ctx) toggleReady(ctx, ready);
        },
        onSendChat: (text) => {
          const ctx = getLobbyContext();
          if (ctx) sendChat(ctx, text);
        },
        onBack: () => {
          // Clean up lobby and return to title
          cleanupLobby();
          void resetTitleScreen();
          goToTitle(screenManager);
          const onStartGameplay = () => startCampaignGameplay(controller);
          void setupTitleScreen(controller, onStartGameplay);
        },
        onPermissionChange: (playerId, permissions) => {
          const ctx = getLobbyContext();
          if (ctx) changePermissions(ctx, playerId, permissions);
        },
        onCallsignChange: (newCallsign) => {
          const ctx = getLobbyContext();
          if (ctx) return changeCallsign(ctx, newCallsign);
          return { success: false, error: 'Not connected' };
        },
        onNavigate: createNavigationHandler(
          controller,
          'lobby',
          setupContractsScreen,
        ),
        isCountdownActive: isLaunchCountdownActive,
      },
      campaignInfo,
    );
  };

  // Create continue handler
  const onContinue = () => {
    if (lobbyCtx.isHost) {
      // Host triggers return to lobby for all players
      triggerReturnToLobby(lobbyCtx);
    }
    // Guest: no-op, waiting for host to continue
  };

  // Create chat send handler
  const onSendChat = (text: string) => {
    sendChat(lobbyCtx, text);
  };

  createResultsUI(
    resultsElement,
    victory,
    contract,
    screenManager.campaignState,
    onContinue,
    world,
    salvage,
    earnedReward,
    escortResults,
    ambushResults,
    stationDefenseResults,
    attackStationResults,
    {
      isMultiplayer: true,
      isHost: lobbyCtx.isHost,
      chatMessages: lobbyCtx.lobbyState.chatMessages,
      onSendChat,
    },
    salaryInfo,
  );
}
