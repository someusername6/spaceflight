/**
 * Lobby Host Handlers - Host-specific message handlers for lobby protocol.
 *
 * Handles player join flow, ship assignment, and callsign announce.
 */

import {
  createGuestLobbyPlayer,
  createShipAssignmentMessage,
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import { addPlayer, addSystemMessage } from '../../multiplayer/lobby-state';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  PlayerJoinedExtMessage,
  ShipAssignmentMessage,
  WelcomeMessage,
} from '../../multiplayer/protocol/messages';
import { GameMessageType } from '../../multiplayer/protocol/types';
import { setLobbyState } from './lobby-actions';
import type { LobbyContext } from './lobby-context';

// =============================================================================
// Ship Assignment
// =============================================================================

/**
 * Find first available wingman ship (not commander, not assigned to any player).
 * Returns null if no ship is available.
 */
function findAvailableWingmanShip(ctx: LobbyContext): string | null {
  const campaignState = ctx.screenManager.campaignState;
  if (!campaignState) return null;

  // Get IDs of ships already assigned to players
  const assignedShipIds = new Set(
    ctx.lobbyState.players.map((p) => p.shipId).filter(Boolean),
  );

  // Find first ship with a pilot that isn't the commander and isn't assigned
  for (const ship of campaignState.ships) {
    if (
      ship.pilot &&
      ship.pilot.id !== campaignState.commanderId &&
      !assignedShipIds.has(ship.id)
    ) {
      return ship.id;
    }
  }

  return null;
}

/**
 * Assign an available wingman ship to a new player.
 * Broadcasts ShipAssignment to all players and applies locally.
 */
export function assignShipToNewPlayer(
  ctx: LobbyContext,
  playerId: string,
): void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const availableShipId = findAvailableWingmanShip(ctx);
  if (!availableShipId) return;

  // Broadcast ShipAssignment to all players (including the new one)
  const shipAssignmentMsg: ShipAssignmentMessage = createShipAssignmentMessage(
    playerId,
    availableShipId,
  );
  transport.broadcast(encodeMessage(shipAssignmentMsg), true);

  // Apply ship assignment locally
  const assignResult = processLobbyMessage(
    ctx.lobbyState,
    shipAssignmentMsg,
    ctx.localPlayerId,
  );
  if (assignResult) {
    setLobbyState(ctx, assignResult.state);
  }
}

// =============================================================================
// Player Join Broadcasting
// =============================================================================

/**
 * Broadcast PlayerJoinedExt to all peers except the new player.
 */
export function broadcastPlayerJoined(
  ctx: LobbyContext,
  player: ReturnType<typeof lobbyPlayerToGamePlayer>,
  excludePeerId: string,
): void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const joinedMessage: PlayerJoinedExtMessage = {
    type: GameMessageType.PlayerJoinedExt,
    player,
  };
  const joinedData = encodeMessage(joinedMessage);
  for (const otherPeerId of transport.connectedPeers) {
    if (otherPeerId !== excludePeerId) {
      transport.send(otherPeerId, joinedData, true);
    }
  }
}

// =============================================================================
// Callsign Announce Handler
// =============================================================================

/**
 * Handle CallsignAnnounce from a newly connected guest.
 */
export function handleCallsignAnnounce(
  ctx: LobbyContext,
  peerId: string,
  callsign: string,
): void {
  if (!ctx.screenManager.campaignState) return;

  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  // Check for duplicate announce
  if (ctx.lobbyState.players.some((p) => p.playerId === peerId)) {
    return;
  }

  // Create new player and add to local state
  const newPlayer = createGuestLobbyPlayer(peerId, callsign);
  let newState = addPlayer(ctx.lobbyState, newPlayer);
  newState = addSystemMessage(newState, `${newPlayer.callsign} joined`);
  setLobbyState(ctx, newState);

  // Register in sync manager
  ctx.syncManager.setPlayerInfo(peerId, lobbyPlayerToGamePlayer(newPlayer));

  // Assign available ship to new player
  assignShipToNewPlayer(ctx, peerId);

  // Send Welcome to new peer (after ship assignment so player list is up to date)
  const welcomeMessage: WelcomeMessage = {
    type: GameMessageType.Welcome,
    playerId: peerId,
    campaignState: ctx.screenManager.campaignState,
    players: ctx.lobbyState.players.map((p) => lobbyPlayerToGamePlayer(p)),
  };
  transport.send(peerId, encodeMessage(welcomeMessage), true);

  // Broadcast PlayerJoinedExt to others
  const playerInfo = lobbyPlayerToGamePlayer(
    ctx.lobbyState.players.find((p) => p.playerId === peerId) ?? newPlayer,
  );
  broadcastPlayerJoined(ctx, playerInfo, peerId);
}
