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
  goToSquadron,
  Screen,
} from '../../ui/common/screens';
import {
  type AmbushResultsDisplay,
  type AttackStationResultsDisplay,
  createResultsUI,
  type EscortResultsDisplay,
  type StationDefenseResultsDisplay,
} from '../../ui/screens/results/results';
import type { SalaryInfo } from '../../ui/screens/results/results-rewards';
import type { CampaignController } from '../controller-types';
import type { SalvageResult } from '../salvage';
import type { Contract } from '../types';
import { setupSquadronScreen } from './campaign-handlers';
import { sendChat } from './lobby-actions';
import { getLobbyContext } from './lobby-context';
import { rebindLobbyScreen } from './lobby-handlers';

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
    {
      world,
      salvage,
      earnedReward,
      escortResults,
      ambushResults,
      stationDefenseResults,
      attackStationResults,
      salaryInfo,
    },
  );
}

/**
 * Show multiplayer results screen after mission.
 * Similar to showResults but with chat footer and host/guest handling.
 *
 * - Host: Shows Continue button that returns all players to lobby
 * - Guest: Shows "Waiting for host..." message
 */
export function showMultiplayerResults(options: ShowResultsOptions): void {
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
    rebindLobbyScreen(controller, lobbyCtx);
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
    {
      world,
      salvage,
      earnedReward,
      escortResults,
      ambushResults,
      stationDefenseResults,
      attackStationResults,
      multiplayerOptions: {
        isMultiplayer: true,
        isHost: lobbyCtx.isHost,
        chatMessages: lobbyCtx.lobbyState.chatMessages,
        onSendChat,
      },
      salaryInfo,
    },
  );
}
