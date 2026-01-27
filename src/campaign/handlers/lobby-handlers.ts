/**
 * Lobby Handlers - Setup and manage lobby screen.
 *
 * Responsibilities:
 * - Initialize lobby state from connection result
 * - Subscribe to protocol message events
 * - Wire up callbacks: onReady, onSendChat, onBack
 * - Handle cleanup on leave
 */

import { getStoredCallsign } from '../../multiplayer/callsign-storage';
import { lobbyPlayerToGamePlayer } from '../../multiplayer/lobby-messages';
import {
  createLobbyState,
  type LobbyPlayer,
  type LobbyState,
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
  updateLobbyState,
} from '../../ui/screens/lobby';
import {
  isSquadronUIActive,
  refreshSquadronUI,
} from '../../ui/screens/squadron';
import { isStoreUIActive, refreshStoreUI } from '../../ui/screens/store/store';
import type { CampaignController } from '../controller-types';
import type { CampaignState } from '../types';
import {
  handlePermissionChange,
  handleReadyToggle,
  handleSendChat,
} from './lobby-callbacks';
import {
  type MessageHandlerContext,
  sendCallsignAnnounce,
  setupMessageHandling,
} from './lobby-protocol-routing';
import {
  setLobbyState as setLobbyStateWithEffects,
  updateAndSyncCampaignState,
} from './lobby-state-effects';
import {
  clearModuleState,
  getActiveCampaignState,
  getActiveConnectionFlow,
  getCampaignSyncManager,
  getLobbyState as getLobbyStateFromHolder,
  getMessageHandlingResult,
  getMessageRouter,
  isInLobby,
  setActiveCampaignStateInternal,
  setActiveConnectionFlow,
  setLobbyStateInternal,
  setMessageHandlingResult,
} from './lobby-state-holder';

// =============================================================================
// Re-exports for external use
// =============================================================================

export {
  getCampaignSyncManager,
  getMessageRouter,
  isInLobby,
  updateAndSyncCampaignState,
};

// =============================================================================
// Setup Functions
// =============================================================================

/**
 * Setup lobby screen for host.
 * Called after room is created and connection is established.
 */
export function setupLobbyScreenForHost(
  controller: CampaignController,
  connectionResult: ConnectionResult,
  connectionFlow: ConnectionFlow,
  _onStartGameplay: () => void,
): void {
  const { screenManager } = controller;
  const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);

  // Store connection flow for cleanup
  setActiveConnectionFlow(connectionFlow);

  // Store campaign state for sending to guests
  setActiveCampaignStateInternal(screenManager.campaignState ?? null);

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

  // Initialize lobby state
  const initialLobbyState = createLobbyState({
    roomCode: connectionResult.roomCode,
    localPlayerId: connectionResult.localPeerId,
    isHost: true,
    initialPlayers: [hostPlayer],
  });
  setLobbyStateInternal(initialLobbyState);

  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

  // Set multiplayer context for permission checks in other screens
  setMultiplayerContext({
    playerId: connectionResult.localPeerId,
    permissions: HOST_PERMISSIONS,
    isHost: true,
  });

  // Setup message handling (host handles peer connections)
  const ctx = createMessageHandlerContext();
  const handlingResult = setupMessageHandling(
    ctx,
    connectionResult.hostPeerId,
    true,
  );
  setMessageHandlingResult(handlingResult);

  // Register host player in sync manager
  const syncManager = getCampaignSyncManager();
  syncManager?.setPlayerInfo(
    connectionResult.localPeerId,
    lobbyPlayerToGamePlayer(hostPlayer),
  );

  // Bind screen callbacks
  bindLobbyScreen(lobbyElement, initialLobbyState, {
    onReady: (ready) => handleReadyToggle(connectionResult.localPeerId, ready),
    onSendChat: (text) => handleSendChat(connectionResult.localPeerId, text),
    onBack: () => handleLeave(controller),
    onPermissionChange: handlePermissionChange,
  });
}

/**
 * Setup lobby screen for guest.
 * Called after joining room and receiving Welcome message.
 */
export function setupLobbyScreenForGuest(
  controller: CampaignController,
  connectionResult: ConnectionResult,
  connectionFlow: ConnectionFlow,
  _onStartGameplay: () => void,
): void {
  const { screenManager } = controller;
  const lobbyElement = getScreenElement(screenManager, Screen.LOBBY);

  // Store connection flow for cleanup
  setActiveConnectionFlow(connectionFlow);

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

  // Initialize lobby state (players will be updated from Welcome message)
  const initialLobbyState = createLobbyState({
    roomCode: connectionResult.roomCode,
    localPlayerId: connectionResult.localPeerId,
    isHost: false,
    initialPlayers: [guestPlayer],
  });
  setLobbyStateInternal(initialLobbyState);

  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

  // Set multiplayer context for permission checks in other screens
  setMultiplayerContext({
    playerId: connectionResult.localPeerId,
    permissions: DEFAULT_GUEST_PERMISSIONS,
    isHost: false,
  });

  // Setup message handling with campaign update callback
  const ctx = createMessageHandlerContext((newCampaignState) => {
    // Update screen manager's campaign state when host syncs
    screenManager.campaignState = newCampaignState;
    setActiveCampaignStateInternal(newCampaignState);

    // Refresh the current screen if it's active
    if (isStoreUIActive()) {
      refreshStoreUI(newCampaignState);
    } else if (isSquadronUIActive()) {
      refreshSquadronUI(newCampaignState);
    }
  });
  const handlingResult = setupMessageHandling(
    ctx,
    connectionResult.hostPeerId,
    false,
  );
  setMessageHandlingResult(handlingResult);

  // Bind screen callbacks
  bindLobbyScreen(lobbyElement, initialLobbyState, {
    onReady: (ready) => handleReadyToggle(connectionResult.localPeerId, ready),
    onSendChat: (text) => handleSendChat(connectionResult.localPeerId, text),
    onBack: () => handleLeave(controller),
  });

  // Send CallsignAnnounce to host - this signals we're ready to receive Welcome
  sendCallsignAnnounce(connectionFlow);
}

// =============================================================================
// Message Handler Context
// =============================================================================

/**
 * Create context for message handler.
 */
function createMessageHandlerContext(
  onCampaignUpdate?: (state: CampaignState) => void,
): MessageHandlerContext {
  const connectionFlow = getActiveConnectionFlow();
  if (!connectionFlow) {
    throw new Error('Connection flow not initialized');
  }
  const ctx: MessageHandlerContext = {
    connectionFlow,
    campaignState: getActiveCampaignState(),
    getLobbyState: () => getLobbyStateFromHolder(),
    setLobbyState: (state: LobbyState) => {
      setLobbyStateInternal(state);
    },
    updateUI: () => {
      const lobbyState = getLobbyStateFromHolder();
      if (lobbyState) {
        updateLobbyState(lobbyState);
      }
    },
  };
  if (onCampaignUpdate) {
    ctx.onCampaignUpdate = onCampaignUpdate;
  }
  return ctx;
}

// =============================================================================
// Internal Callbacks
// =============================================================================

/** Handle leave/back button */
function handleLeave(controller: CampaignController): void {
  cleanupLobby();
  goBackFromLobby(controller.screenManager);
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Cleanup lobby state and connections.
 */
export function cleanupLobby(): void {
  // Cleanup message handling (router, sync manager)
  const handlingResult = getMessageHandlingResult();
  handlingResult?.cleanup();

  // Disconnect and dispose connection flow
  const connectionFlow = getActiveConnectionFlow();
  if (connectionFlow) {
    connectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    connectionFlow.dispose();
  }

  // Cleanup screen
  cleanupLobbyScreen();

  // Clear multiplayer context (returns to single-player mode)
  clearMultiplayerContext();

  // Clear all module state
  clearModuleState();
}

/** Get current lobby state (for testing) */
export function getLobbyState(): LobbyState | null {
  return getLobbyStateFromHolder();
}

/** Update lobby state externally (for protocol handlers) */
export function setLobbyState(state: LobbyState): void {
  setLobbyStateWithEffects(state);
}
