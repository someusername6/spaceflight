/**
 * Lobby Handlers - Setup and manage lobby screen.
 *
 * This is the entry point for lobby functionality.
 * Creates LobbyContext and wires everything together.
 */

import { getStoredCallsign } from '../../multiplayer/callsign-storage';
import { lobbyPlayerToGamePlayer } from '../../multiplayer/lobby-messages';
import {
  createLobbyState,
  type LobbyPlayer,
} from '../../multiplayer/lobby-state';
import { setMultiplayerContext } from '../../multiplayer/multiplayer-context';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import type { ConnectionResult } from '../../multiplayer/networking/types';
import {
  DEFAULT_GUEST_PERMISSIONS,
  HOST_PERMISSIONS,
} from '../../multiplayer/permissions';
import {
  getScreenElement,
  goBackFromLobby,
  goToLobby,
  Screen,
  updateCampaignState,
} from '../../ui/common/screens';
import {
  bindLobbyScreen,
  renderLobbyScreen,
  updateLobbyCampaignInfo,
} from '../../ui/screens/lobby';
import { cleanupTitleScreen } from '../../ui/screens/title';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import type { CampaignState, Contract } from '../types';
import {
  createNavigationHandler,
  setupContractsScreen,
} from './campaign-handlers';
import { launchGuestMission } from './guest-mission';
import {
  changeCallsign,
  changePermissions,
  isLaunchCountdownActive,
  kickPlayer,
  refreshCurrentScreen,
  sendChat,
  toggleReady,
} from './lobby-actions';
import {
  getCampaignSyncManager,
  getLobbyContext,
  getLobbyState,
  getMessageRouter,
  isInLobby,
  type LobbyContext,
  setLobbyContext,
} from './lobby-context';
import { setupMultiplayerEscapeHandler } from './lobby-escape-handler';
import {
  sendCallsignAnnounce,
  setupMessageHandling,
  wireMessageHandlers,
} from './lobby-protocol-routing';
import { cleanupLobby, handleSessionEndedForGuest } from './lobby-session';

// =============================================================================
// Re-exports for external use
// =============================================================================

export { getCampaignSyncManager, getLobbyState, getMessageRouter, isInLobby };

// Re-export from lobby-actions (moved there to break circular dependencies)
export { updateAndSyncCampaignState } from './lobby-actions';

// Re-export from lobby-session
export { cleanupLobby } from './lobby-session';

// =============================================================================
// Campaign Update Handler
// =============================================================================

/**
 * Create a shared onCampaignUpdate callback for the sync manager.
 * Updates screenManager (single source of truth), refreshes UI.
 */
function createCampaignUpdateHandler(
  screenManager: CampaignController['screenManager'],
): (newCampaignState: CampaignState) => void {
  return (newCampaignState) => {
    updateCampaignState(screenManager, newCampaignState);
    refreshCurrentScreen(newCampaignState);
    updateLobbyCampaignInfo(
      newCampaignState.credits,
      newCampaignState.currentSector,
    );
  };
}

// =============================================================================
// Setup Functions
// =============================================================================

/**
 * Setup lobby screen for host.
 *
 * Note: onStartGameplay reserved for future gameplay start callback integration.
 */
export function setupLobbyScreenForHost(
  controller: CampaignController,
  connectionResult: ConnectionResult,
  connectionFlow: ConnectionFlow,
): void {
  // Free title screen WebGL resources before entering lobby
  // This reduces GPU contention when mission renderer is created later
  cleanupTitleScreen();

  const { screenManager } = controller;
  const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);
  const campaignState = screenManager.campaignState ?? null;

  // Create host player - use commander name from campaign if available
  const hostCallsign =
    campaignState?.settings.commanderName ?? getStoredCallsign() ?? 'Host';
  const hostPlayer: LobbyPlayer = {
    playerId: connectionResult.localPeerId,
    callsign: hostCallsign,
    shipId: null,
    isReady: false,
    isHost: true,
    ping: 0,
    permissions: HOST_PERMISSIONS,
  };

  // Create initial lobby state
  const initialLobbyState = createLobbyState({
    roomCode: connectionResult.roomCode,
    localPlayerId: connectionResult.localPeerId,
    isHost: true,
    initialPlayers: [hostPlayer],
  });

  // Setup message handling (creates router and sync manager)
  const { cleanup, router, syncManager } = setupMessageHandling({
    connectionFlow,
    hostPeerId: connectionResult.hostPeerId,
    isHost: true,
    campaignState,
    onCampaignUpdate: createCampaignUpdateHandler(screenManager),
    getLobbyState,
  });

  // Create the context
  const ctx: LobbyContext = {
    connectionFlow,
    router,
    syncManager,
    isHost: true,
    localPlayerId: connectionResult.localPeerId,
    lobbyState: initialLobbyState,
    screenManager,
    cleanup,
  };

  // Store the context
  setLobbyContext(ctx);

  // Wire message handlers now that context exists
  wireMessageHandlers(ctx, connectionResult.hostPeerId);

  // Register host player in sync manager
  syncManager.setPlayerInfo(
    connectionResult.localPeerId,
    lobbyPlayerToGamePlayer(hostPlayer),
  );

  // Set multiplayer context for permission checks
  // Host doesn't have an assigned ship (they control the commander)
  setMultiplayerContext({
    playerId: connectionResult.localPeerId,
    permissions: HOST_PERMISSIONS,
    isHost: true,
    assignedShipId: null,
  });

  // Render and navigate
  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

  // Bind screen callbacks
  const campaignInfo = campaignState
    ? {
        credits: campaignState.credits,
        currentSector: campaignState.currentSector,
      }
    : undefined;

  bindLobbyScreen(
    lobbyElement,
    initialLobbyState,
    {
      onReady: (ready) => {
        const currentCtx = getLobbyContext();
        if (currentCtx) toggleReady(currentCtx, ready);
      },
      onSendChat: (text) => {
        const currentCtx = getLobbyContext();
        if (currentCtx) sendChat(currentCtx, text);
      },
      onBack: () => void handleLeave(controller),
      onPermissionChange: (playerId, permissions) => {
        const currentCtx = getLobbyContext();
        if (currentCtx) changePermissions(currentCtx, playerId, permissions);
      },
      onKick: (playerId) => {
        const currentCtx = getLobbyContext();
        if (currentCtx) void kickPlayer(currentCtx, playerId);
      },
      onCallsignChange: (newCallsign) => {
        const currentCtx = getLobbyContext();
        if (currentCtx) return changeCallsign(currentCtx, newCallsign);
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

  // Setup escape handler for multiplayer pause
  setupMultiplayerEscapeHandler(controller);
}

/**
 * Setup lobby screen for guest.
 *
 * Note: onStartGameplay reserved for future gameplay start callback integration.
 */
export function setupLobbyScreenForGuest(
  controller: CampaignController,
  connectionResult: ConnectionResult,
  connectionFlow: ConnectionFlow,
): void {
  // Free title screen WebGL resources before entering lobby
  // This reduces GPU contention when mission renderer is created later
  cleanupTitleScreen();

  const { screenManager } = controller;
  const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);

  // Create guest player (will be updated when Welcome is received)
  const guestCallsign = getStoredCallsign() ?? 'Guest';
  const guestPlayer: LobbyPlayer = {
    playerId: connectionResult.localPeerId,
    callsign: guestCallsign,
    shipId: null,
    isReady: false,
    isHost: false,
    ping: 0,
    permissions: DEFAULT_GUEST_PERMISSIONS,
  };

  // Create initial lobby state
  const initialLobbyState = createLobbyState({
    roomCode: connectionResult.roomCode,
    localPlayerId: connectionResult.localPeerId,
    isHost: false,
    initialPlayers: [guestPlayer],
  });

  // Setup message handling with campaign update callback
  const { cleanup, router, syncManager } = setupMessageHandling({
    connectionFlow,
    hostPeerId: connectionResult.hostPeerId,
    isHost: false,
    campaignState: null,
    onCampaignUpdate: createCampaignUpdateHandler(screenManager),
  });

  // Create the context
  const ctx: LobbyContext = {
    connectionFlow,
    router,
    syncManager,
    isHost: false,
    localPlayerId: connectionResult.localPeerId,
    lobbyState: initialLobbyState,
    screenManager,
    cleanup,
    // Mission start callback for guests - called when MissionStarted received
    onMissionStart: (contract: Contract, _seed: number) => {
      launchGuestMission(controller, contract);
    },
    // Session ended callback for guests - called when host quits or campaign ends
    onSessionEnded: (reason: string) => {
      void handleSessionEndedForGuest(controller, reason);
    },
  };

  // Store the context
  setLobbyContext(ctx);

  // Wire message handlers
  wireMessageHandlers(ctx, connectionResult.hostPeerId);

  // Set multiplayer context (shipId will be updated via ShipAssignment message)
  setMultiplayerContext({
    playerId: connectionResult.localPeerId,
    permissions: DEFAULT_GUEST_PERMISSIONS,
    isHost: false,
    assignedShipId: null,
  });

  // Render and navigate
  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

  // Bind screen callbacks
  bindLobbyScreen(lobbyElement, initialLobbyState, {
    onReady: (ready) => {
      const currentCtx = getLobbyContext();
      if (currentCtx) toggleReady(currentCtx, ready);
    },
    onSendChat: (text) => {
      const currentCtx = getLobbyContext();
      if (currentCtx) sendChat(currentCtx, text);
    },
    onBack: () => void handleLeave(controller),
    onCallsignChange: (newCallsign) => {
      const currentCtx = getLobbyContext();
      if (currentCtx) return changeCallsign(currentCtx, newCallsign);
      return { success: false, error: 'Not connected' };
    },
    onNavigate: createNavigationHandler(
      controller,
      'lobby',
      setupContractsScreen,
    ),
    isCountdownActive: isLaunchCountdownActive,
  });

  // Setup escape handler for multiplayer pause
  setupMultiplayerEscapeHandler(controller);

  // Send CallsignAnnounce to host
  sendCallsignAnnounce(connectionFlow);
}

// =============================================================================
// Cleanup
// =============================================================================

/** Handle leave/back button */
async function handleLeave(controller: CampaignController): Promise<void> {
  cleanupLobby();
  goBackFromLobby(controller.screenManager);

  // Re-setup title screen event handlers (they were destroyed when entering lobby)
  const { setupTitleScreen } = await import('./menu-handlers');
  const onStartGameplay = () => startCampaignGameplay(controller);
  void setupTitleScreen(controller, onStartGameplay);
}
