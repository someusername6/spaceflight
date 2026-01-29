/**
 * Lobby Protocol Routing - Transport layer for lobby protocol messages.
 *
 * Responsibilities:
 * - Decode/encode game messages (binary protocol)
 * - Route incoming messages to appropriate handlers
 * - Setup message handling with LobbyContext
 */

import { getStoredCallsign } from '../../multiplayer/callsign-storage';
import { createCampaignSyncManager } from '../../multiplayer/campaign-sync';
import {
  handleCountdownAbort,
  handleCountdownTick,
} from '../../multiplayer/launch-flow';
import {
  createGuestLobbyPlayer,
  createShipAssignmentMessage,
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import { addPlayer, addSystemMessage } from '../../multiplayer/lobby-state';
import { hashCampaignState } from '../../multiplayer/mission-sync';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  CallsignAnnounceMessage,
  GameMessage,
  PlayerJoinedExtMessage,
  ShipAssignmentMessage,
  WelcomeMessage,
} from '../../multiplayer/protocol/messages';
import { createMessageRouter } from '../../multiplayer/protocol/router';
import { GameMessageType } from '../../multiplayer/protocol/types';
import { reconstituteCampaignState } from '../storage/campaign-utils';
import type { CampaignState } from '../types';
import { handlePlayerUnready, setLobbyState } from './lobby-actions';
import type { LobbyContext } from './lobby-context';

// =============================================================================
// Types
// =============================================================================

/** Configuration for setting up message handling */
export interface MessageHandlingConfig {
  connectionFlow: ConnectionFlow;
  hostPeerId: string;
  isHost: boolean;
  campaignState: CampaignState | null;
  onCampaignUpdate?: (state: CampaignState) => void;
}

/** Result of setting up message handling */
export interface MessageHandlingResult {
  cleanup: () => void;
  router: ReturnType<typeof createMessageRouter>;
  syncManager: ReturnType<typeof createCampaignSyncManager>;
}

// =============================================================================
// Message Handling Setup
// =============================================================================

/**
 * Setup message handling and return components needed for LobbyContext.
 * This is called during lobby setup to create the router and sync manager.
 */
export function setupMessageHandling(
  config: MessageHandlingConfig,
): MessageHandlingResult {
  const {
    connectionFlow,
    hostPeerId,
    isHost,
    campaignState,
    onCampaignUpdate,
  } = config;

  const transport = connectionFlow.getTransport();
  if (!transport) {
    throw new Error('Cannot setup message handling without transport');
  }

  // Store original handlers for cleanup
  const originalOnMessage = transport.onMessage;
  const originalOnConnect = transport.onConnect;

  // Create router and sync manager
  const router = createMessageRouter({ transport, hostPeerId, isHost });
  const syncManager = createCampaignSyncManager(router, isHost);

  // Set up campaign update callback
  if (onCampaignUpdate) {
    syncManager.onCampaignUpdate = onCampaignUpdate;
  }

  // Initialize with current campaign state (for host)
  if (isHost && campaignState) {
    syncManager.setCampaignState(campaignState);
  }

  return {
    cleanup: () => {
      router.unwireFromTransport(originalOnMessage ?? undefined);
      transport.onConnect = originalOnConnect;
      syncManager.dispose();
      router.dispose();
    },
    router,
    syncManager,
  };
}

/**
 * Wire up message handlers to the router using the LobbyContext.
 * Called after LobbyContext is created.
 *
 * Note: Transport handler management (onMessage, onConnect) is handled by
 * setupMessageHandling's cleanup function, not here.
 */
export function wireMessageHandlers(
  ctx: LobbyContext,
  hostPeerId: string,
): void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  // Create standard lobby message handler
  const handler = (msg: GameMessage) => {
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }
  };

  // Register handlers
  ctx.router.onChatMessage(handler);
  ctx.router.onPermissionUpdate(handler);
  ctx.router.onPlayerJoined(handler);
  ctx.router.onPlayerLeft(handler);
  ctx.router.onShipAssignment(handler);

  // ReadyState handler: process lobby state AND check countdown abort
  ctx.router.onReadyState((msg) => {
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }

    // Host: check if this unready should abort a countdown
    if (ctx.isHost && 'playerId' in msg && 'ready' in msg) {
      const readyMsg = msg as { playerId: string; ready: boolean };
      if (!readyMsg.ready) {
        handlePlayerUnready(ctx, readyMsg.playerId);
      }
    }
  });

  // Welcome handler: process lobby state AND feed campaign state to sync manager
  // (Router only supports one handler per type, so we must combine both here
  // instead of relying on CampaignSyncManager's separate onWelcome handler)
  ctx.router.onWelcome((msg) => {
    // Update lobby state (players list)
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }

    // Feed campaign state to sync manager (guest only)
    if (!ctx.isHost && msg.campaignState) {
      const reconstituted = reconstituteCampaignState(msg.campaignState);
      ctx.syncManager.setCampaignState(reconstituted);
      for (const player of msg.players) {
        ctx.syncManager.setPlayerInfo(player.playerId, player);
      }
      ctx.syncManager.onCampaignUpdate?.(reconstituted);
    }
  });

  // Host-specific: handle CallsignAnnounce
  if (ctx.isHost) {
    ctx.router.onCallsignAnnounce((msg, peerId) => {
      handleCallsignAnnounce(ctx, peerId, msg.callsign);
    });
  }

  // Launch countdown handlers (guest only - host manages countdown locally)
  if (!ctx.isHost) {
    ctx.router.onLaunchCountdown((msg) => {
      handleCountdownTick(msg.secondsRemaining, null);
      // Display countdown in chat
      if (msg.secondsRemaining > 0) {
        const newState = addSystemMessage(
          ctx.lobbyState,
          `Launching in ${msg.secondsRemaining}...`,
        );
        setLobbyState(ctx, newState);
      }
    });

    ctx.router.onLaunchAborted((msg) => {
      handleCountdownAbort(msg.reason);
      const newState = addSystemMessage(
        ctx.lobbyState,
        `Launch aborted: ${msg.reason}`,
      );
      setLobbyState(ctx, newState);
    });

    ctx.router.onContractAccepted((msg) => {
      const newState = addSystemMessage(
        ctx.lobbyState,
        `Contract selected: ${msg.contractId}`,
      );
      setLobbyState(ctx, newState);
    });

    ctx.router.onMissionStarted((msg) => {
      // Verify campaign state hash matches local state
      if (ctx.screenManager.campaignState) {
        const localHash = hashCampaignState(ctx.screenManager.campaignState);
        if (msg.campaignStateHash !== localHash) {
          console.warn(
            `[lobby-routing] Campaign state hash mismatch at mission start: host=${msg.campaignStateHash}, local=${localHash}`,
          );
          const warnState = addSystemMessage(
            ctx.lobbyState,
            'Warning: Campaign state may be out of sync with host',
          );
          setLobbyState(ctx, warnState);
        }
      }

      // Mission start will be handled by the campaign controller
      const newState = addSystemMessage(ctx.lobbyState, 'Mission starting...');
      setLobbyState(ctx, newState);
    });
  }

  // Wire router to transport (cleanup handled by setupMessageHandling)
  ctx.router.wireToTransport(transport.onMessage ?? undefined);
}

// =============================================================================
// Host Message Handlers
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
function assignShipToNewPlayer(ctx: LobbyContext, playerId: string): void {
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

/**
 * Broadcast PlayerJoinedExt to all peers except the new player.
 */
function broadcastPlayerJoined(
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

/**
 * Handle CallsignAnnounce from a newly connected guest.
 */
function handleCallsignAnnounce(
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

// =============================================================================
// Guest Message Sending
// =============================================================================

/**
 * Send CallsignAnnounce to host (guest only).
 */
export function sendCallsignAnnounce(connectionFlow: ConnectionFlow): void {
  const transport = connectionFlow.getTransport();
  if (!transport) return;

  const callsign = getStoredCallsign() ?? 'Guest';
  const message: CallsignAnnounceMessage = {
    type: GameMessageType.CallsignAnnounce,
    callsign,
  };

  transport.broadcast(encodeMessage(message), true);
}
