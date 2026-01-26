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
import {
  createChatMessageMessage,
  createReadyStateMessage,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import {
  createLobbyState,
  type LobbyPlayer,
  type LobbyState,
} from '../../multiplayer/lobby-state';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import type { ConnectionResult } from '../../multiplayer/networking/types';
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
import type { CampaignController } from '../controller-types';
import type { CampaignState } from '../types';
import {
  broadcastMessage,
  type MessageHandlerContext,
  sendCallsignAnnounce,
  setupMessageHandling,
} from './lobby-protocol-routing';

// =============================================================================
// Module State
// =============================================================================

/** Active connection flow */
let activeConnectionFlow: ConnectionFlow | null = null;

/** Current lobby state */
let lobbyState: LobbyState | null = null;

/** Current campaign state (for sending to guests) */
let activeCampaignState: CampaignState | null = null;

/** Message handler cleanup function */
let messageHandlerCleanup: (() => void) | null = null;

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
  activeConnectionFlow = connectionFlow;

  // Store campaign state for sending to guests
  activeCampaignState = screenManager.campaignState ?? null;

  // Create host player
  const hostCallsign = getStoredCallsign() ?? 'Host';
  const hostPlayer: LobbyPlayer = {
    playerId: connectionResult.localPeerId,
    callsign: hostCallsign,
    shipId: null,
    isReady: false,
    isHost: true,
    ping: 0,
  };

  // Initialize lobby state
  lobbyState = createLobbyState({
    roomCode: connectionResult.roomCode,
    localPlayerId: connectionResult.localPeerId,
    isHost: true,
    initialPlayers: [hostPlayer],
  });

  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

  // Setup message handling (host handles peer connections)
  const ctx = createMessageHandlerContext();
  messageHandlerCleanup = setupMessageHandling(
    ctx,
    connectionResult.hostPeerId,
    true,
  );

  // Bind screen callbacks
  bindLobbyScreen(lobbyElement, lobbyState, {
    onReady: (ready) => handleReadyToggle(connectionResult.localPeerId, ready),
    onSendChat: (text) => handleSendChat(connectionResult.localPeerId, text),
    onBack: () => handleLeave(controller),
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
  activeConnectionFlow = connectionFlow;

  // Create guest player (will be updated when Welcome is received)
  const guestCallsign = getStoredCallsign() ?? 'Guest';
  const guestPlayer: LobbyPlayer = {
    playerId: connectionResult.localPeerId,
    callsign: guestCallsign,
    shipId: null,
    isReady: false,
    isHost: false,
    ping: 0,
  };

  // Initialize lobby state (players will be updated from Welcome message)
  lobbyState = createLobbyState({
    roomCode: connectionResult.roomCode,
    localPlayerId: connectionResult.localPeerId,
    isHost: false,
    initialPlayers: [guestPlayer],
  });

  renderLobbyScreen(lobbyElement);
  goToLobby(screenManager);

  // Setup message handling (guest doesn't need to handle peer connections)
  const ctx = createMessageHandlerContext();
  messageHandlerCleanup = setupMessageHandling(
    ctx,
    connectionResult.hostPeerId,
    false,
  );

  // Bind screen callbacks
  bindLobbyScreen(lobbyElement, lobbyState, {
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
function createMessageHandlerContext(): MessageHandlerContext {
  if (!activeConnectionFlow) {
    throw new Error('Connection flow not initialized');
  }
  return {
    connectionFlow: activeConnectionFlow,
    campaignState: activeCampaignState,
    getLobbyState: () => lobbyState,
    setLobbyState: (state: LobbyState) => {
      lobbyState = state;
    },
    updateUI: () => {
      if (lobbyState) {
        updateLobbyState(lobbyState);
      }
    },
  };
}

// =============================================================================
// Callbacks
// =============================================================================

/**
 * Handle ready button toggle.
 */
function handleReadyToggle(playerId: string, ready: boolean): void {
  if (!lobbyState || !activeConnectionFlow) return;

  // Create and send ready state message
  const message = createReadyStateMessage(playerId, ready);
  broadcastMessage(activeConnectionFlow, message);

  // Update local state immediately (optimistic update)
  const result = processLobbyMessage(
    lobbyState,
    message,
    lobbyState.isHost ? playerId : '',
  );
  if (result) {
    lobbyState = result.state;
    updateLobbyState(lobbyState);
  }
}

/**
 * Handle chat message send.
 */
function handleSendChat(playerId: string, text: string): void {
  if (!lobbyState || !activeConnectionFlow) return;

  // Create and send chat message
  const message = createChatMessageMessage(playerId, text);
  broadcastMessage(activeConnectionFlow, message);

  // Update local state immediately (optimistic update)
  const result = processLobbyMessage(
    lobbyState,
    message,
    lobbyState.isHost ? playerId : '',
  );
  if (result) {
    lobbyState = result.state;
    updateLobbyState(lobbyState);
  }
}

/**
 * Handle leave/back button.
 */
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
  // Cleanup message handler
  messageHandlerCleanup?.();
  messageHandlerCleanup = null;

  // Disconnect and dispose connection flow
  if (activeConnectionFlow) {
    activeConnectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    activeConnectionFlow.dispose();
    activeConnectionFlow = null;
  }

  // Cleanup screen
  cleanupLobbyScreen();

  // Clear state
  lobbyState = null;
  activeCampaignState = null;
}

/**
 * Get current lobby state (for testing).
 */
export function getLobbyState(): LobbyState | null {
  return lobbyState;
}

/**
 * Update lobby state externally (for protocol handlers).
 */
export function setLobbyState(state: LobbyState): void {
  lobbyState = state;
  updateLobbyState(state);
}
