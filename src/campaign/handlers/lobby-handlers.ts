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
import {
  clearMultiplayerContext,
  setMultiplayerContext,
} from '../../multiplayer/multiplayer-context';
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
} from '../../ui/common/screens';
import {
  bindLobbyScreen,
  cleanupLobbyScreen,
  renderLobbyScreen,
} from '../../ui/screens/lobby';
import type { CampaignController } from '../controller-types';
import type { CampaignState } from '../types';
import {
  changePermissions,
  refreshCurrentScreen,
  sendChat,
  toggleReady,
  updateCampaignState as updateCampaignStateAction,
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
import {
  sendCallsignAnnounce,
  setupMessageHandling,
  wireMessageHandlers,
} from './lobby-protocol-routing';

// =============================================================================
// Re-exports for external use
// =============================================================================

export { getCampaignSyncManager, getLobbyState, getMessageRouter, isInLobby };

/**
 * Update campaign state and sync to all guests (host only).
 * Wrapper that gets context and calls the action.
 */
export function updateAndSyncCampaignState(newState: CampaignState): void {
  const ctx = getLobbyContext();
  if (ctx) {
    updateCampaignStateAction(ctx, newState);
  }
}

// =============================================================================
// Setup Functions
// =============================================================================

/**
 * Setup lobby screen for host.
 */
export function setupLobbyScreenForHost(
  controller: CampaignController,
  connectionResult: ConnectionResult,
  connectionFlow: ConnectionFlow,
  _onStartGameplay: () => void,
): void {
  const { screenManager } = controller;
  const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);
  const campaignState = screenManager.campaignState ?? null;

  // Create host player
  const hostCallsign = getStoredCallsign() ?? 'Host';
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
  });

  // Create the context
  const ctx: LobbyContext = {
    connectionFlow,
    router,
    syncManager,
    isHost: true,
    localPlayerId: connectionResult.localPeerId,
    lobbyState: initialLobbyState,
    campaignState,
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
  setMultiplayerContext({
    playerId: connectionResult.localPeerId,
    permissions: HOST_PERMISSIONS,
    isHost: true,
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
    onBack: () => handleLeave(controller),
    onPermissionChange: (playerId, permissions) => {
      const currentCtx = getLobbyContext();
      if (currentCtx) changePermissions(currentCtx, playerId, permissions);
    },
  });
}

/**
 * Setup lobby screen for guest.
 */
export function setupLobbyScreenForGuest(
  controller: CampaignController,
  connectionResult: ConnectionResult,
  connectionFlow: ConnectionFlow,
  _onStartGameplay: () => void,
): void {
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
    onCampaignUpdate: (newCampaignState) => {
      // Update context and screen manager when host syncs
      const ctx = getLobbyContext();
      if (ctx) {
        ctx.campaignState = newCampaignState;
      }
      screenManager.campaignState = newCampaignState;

      // Refresh current screen
      refreshCurrentScreen(newCampaignState);
    },
  });

  // Create the context
  const ctx: LobbyContext = {
    connectionFlow,
    router,
    syncManager,
    isHost: false,
    localPlayerId: connectionResult.localPeerId,
    lobbyState: initialLobbyState,
    campaignState: null,
    cleanup,
  };

  // Store the context
  setLobbyContext(ctx);

  // Wire message handlers
  wireMessageHandlers(ctx, connectionResult.hostPeerId);

  // Set multiplayer context
  setMultiplayerContext({
    playerId: connectionResult.localPeerId,
    permissions: DEFAULT_GUEST_PERMISSIONS,
    isHost: false,
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
    onBack: () => handleLeave(controller),
  });

  // Send CallsignAnnounce to host
  sendCallsignAnnounce(connectionFlow);
}

// =============================================================================
// Cleanup
// =============================================================================

/** Handle leave/back button */
function handleLeave(controller: CampaignController): void {
  cleanupLobby();
  goBackFromLobby(controller.screenManager);
}

/**
 * Cleanup lobby state and connections.
 */
export function cleanupLobby(): void {
  const ctx = getLobbyContext();
  if (ctx) {
    // Run cleanup (router, sync manager, transport handlers)
    ctx.cleanup();

    // Disconnect and dispose connection flow
    ctx.connectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    ctx.connectionFlow.dispose();
  }

  // Cleanup screen
  cleanupLobbyScreen();

  // Clear multiplayer context
  clearMultiplayerContext();

  // Clear lobby context
  setLobbyContext(null);
}
