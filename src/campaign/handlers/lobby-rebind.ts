/**
 * Lobby Re-bind Helper - Re-binds the lobby screen after returning from a mission.
 *
 * Extracted from lobby-handlers.ts to keep file sizes manageable.
 * Shared by multiplayer results and non-ironman defeat flows.
 */

import {
  getScreenElement,
  goToLobby,
  goToTitle,
  Screen,
} from '../../ui/common/screens';
import { bindLobbyScreen, renderLobbyScreen } from '../../ui/screens/lobby';
import { resetTitleScreen } from '../../ui/screens/title';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import {
  createNavigationHandler,
  setupContractsScreen,
} from './campaign-handlers';
import {
  changeCallsign,
  changePermissions,
  isLaunchCountdownActive,
  sendChat,
  toggleReady,
} from './lobby-actions';
import { getLobbyContext, type LobbyContext } from './lobby-context';
import { cleanupLobby } from './lobby-session';
import { setupTitleScreen } from './menu-handlers';

/**
 * Render and re-bind the lobby screen after returning from a mission.
 * Shared by multiplayer results and non-ironman defeat flows.
 */
export function rebindLobbyScreen(
  controller: CampaignController,
  lobbyCtx: LobbyContext,
): void {
  const { screenManager } = controller;
  const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);
  const campaignState = screenManager.campaignState;

  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

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
}
