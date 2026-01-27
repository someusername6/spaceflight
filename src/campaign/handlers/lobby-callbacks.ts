/**
 * Lobby Callbacks - Handle user interactions in lobby.
 *
 * Extracted from lobby-handlers.ts to keep file under 400 lines.
 */

import {
  createChatMessageMessage,
  createPermissionUpdateMessage,
  createReadyStateMessage,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import type { Permission } from '../../multiplayer/protocol/types';
import { updateLobbyState } from '../../ui/screens/lobby';
import { broadcastMessage } from './lobby-protocol-routing';
import {
  getActiveConnectionFlow,
  getLobbyState,
  setLobbyStateInternal,
} from './lobby-state-sync';

/**
 * Handle ready button toggle.
 */
export function handleReadyToggle(playerId: string, ready: boolean): void {
  const lobbyState = getLobbyState();
  const connectionFlow = getActiveConnectionFlow();
  if (!lobbyState || !connectionFlow) return;

  // Create and send ready state message
  const message = createReadyStateMessage(playerId, ready);
  broadcastMessage(connectionFlow, message);

  // Update local state immediately (optimistic update)
  const result = processLobbyMessage(
    lobbyState,
    message,
    lobbyState.isHost ? playerId : '',
  );
  if (result) {
    setLobbyStateInternal(result.state);
    updateLobbyState(result.state);
  }
}

/**
 * Handle chat message send.
 */
export function handleSendChat(playerId: string, text: string): void {
  const lobbyState = getLobbyState();
  const connectionFlow = getActiveConnectionFlow();
  if (!lobbyState || !connectionFlow) return;

  // Create and send chat message
  const message = createChatMessageMessage(playerId, text);
  broadcastMessage(connectionFlow, message);

  // Update local state immediately (optimistic update)
  const result = processLobbyMessage(
    lobbyState,
    message,
    lobbyState.isHost ? playerId : '',
  );
  if (result) {
    setLobbyStateInternal(result.state);
    updateLobbyState(result.state);
  }
}

/**
 * Handle permission change (host only).
 */
export function handlePermissionChange(
  playerId: string,
  permissions: Permission,
): void {
  const lobbyState = getLobbyState();
  const connectionFlow = getActiveConnectionFlow();
  if (!lobbyState || !connectionFlow) return;

  // Only host can change permissions
  if (!lobbyState.isHost) return;

  // Don't allow changing host permissions
  const targetPlayer = lobbyState.players.find((p) => p.playerId === playerId);
  if (!targetPlayer || targetPlayer.isHost) return;

  // Create and send permission update message
  const message = createPermissionUpdateMessage(playerId, permissions);
  broadcastMessage(connectionFlow, message);

  // Update local state immediately (optimistic update)
  const result = processLobbyMessage(
    lobbyState,
    message,
    lobbyState.localPlayerId,
  );
  if (result) {
    setLobbyStateInternal(result.state);
    updateLobbyState(result.state);
  }
}
