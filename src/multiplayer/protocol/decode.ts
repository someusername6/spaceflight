/**
 * Message Decoding - Converts binary data back to game messages.
 */

import type { CampaignState } from '../../campaign/types';
import {
  createReadBuffer,
  decodeJson,
  type ReadBuffer,
  readBool,
  readByte,
  readFloat64,
  readPermission,
  readPlayerInfo,
  readString,
  readUint16,
  readUint32,
} from './buffer-utils';
import {
  type ActionRequestData,
  type ActionRequestMessage,
  type ActionResponseMessage,
  type CallsignAnnounceMessage,
  type CallsignUpdateMessage,
  type CampaignSyncMessage,
  type ChatMessage,
  type ContractAcceptedMessage,
  type GameMessage,
  GameMessageType,
  type GamePlayerInfo,
  type GuestQuitRequestMessage,
  type KickNotificationMessage,
  type LaunchAbortedMessage,
  type LaunchCountdownMessage,
  type LeaveReason,
  type MissionEndedMessage,
  type MissionOutcomeData,
  type MissionStartedMessage,
  type PauseReadyStateMessage,
  type PauseRequestMessage,
  type PermissionUpdateMessage,
  type PlayerDroppedMessage,
  type PlayerJoinedExtMessage,
  type PlayerLeftExtMessage,
  type ReadyStateMessage,
  type SessionEndedMessage,
  type ShipAssignmentMessage,
  type WelcomeMessage,
} from './messages';

// =============================================================================
// Constants
// =============================================================================

/** Derived range of GameMessageType values (auto-updated when enum changes) */
const _gameMessageTypeValues = Object.values(GameMessageType).filter(
  (v): v is number => typeof v === 'number',
);
const GAME_MSG_MIN = Math.min(..._gameMessageTypeValues);
const GAME_MSG_MAX = Math.max(..._gameMessageTypeValues);

// =============================================================================
// Decoding
// =============================================================================

/**
 * Decode a binary message to a game message object.
 */
export function decodeMessage(data: Uint8Array): GameMessage {
  const rb = createReadBuffer(data);
  const typeByte = readByte(rb);

  // Validate that the byte is in the game message range before casting
  if (typeByte < GAME_MSG_MIN || typeByte > GAME_MSG_MAX) {
    throw new Error(`Invalid game message type: 0x${typeByte.toString(16)}`);
  }
  const type = typeByte as GameMessageType;

  switch (type) {
    case GameMessageType.Welcome:
      return decodeWelcome(rb);
    case GameMessageType.PlayerJoinedExt:
      return decodePlayerJoined(rb);
    case GameMessageType.PlayerLeftExt:
      return decodePlayerLeft(rb);
    case GameMessageType.ChatMessage:
      return decodeChatMessage(rb);
    case GameMessageType.ReadyState:
      return decodeReadyState(rb);
    case GameMessageType.PermissionUpdate:
      return decodePermissionUpdate(rb);
    case GameMessageType.ShipAssignment:
      return decodeShipAssignment(rb);
    case GameMessageType.CampaignSync:
      return decodeCampaignSync(rb);
    case GameMessageType.ActionRequest:
      return decodeActionRequest(rb);
    case GameMessageType.ActionResponse:
      return decodeActionResponse(rb);
    case GameMessageType.ContractAccepted:
      return decodeContractAccepted(rb);
    case GameMessageType.LaunchCountdown:
      return decodeLaunchCountdown(rb);
    case GameMessageType.LaunchAborted:
      return decodeLaunchAborted(rb);
    case GameMessageType.MissionStarted:
      return decodeMissionStarted(rb);
    case GameMessageType.MissionEnded:
      return decodeMissionEnded(rb);
    case GameMessageType.SessionEnded:
      return decodeSessionEnded(rb);
    case GameMessageType.KickNotification:
      return decodeKickNotification(rb);
    case GameMessageType.CallsignAnnounce:
      return decodeCallsignAnnounce(rb);
    case GameMessageType.CallsignUpdate:
      return decodeCallsignUpdate(rb);
    case GameMessageType.PauseReadyState:
      return decodePauseReadyState(rb);
    case GameMessageType.PlayerDropped:
      return decodePlayerDropped(rb);
    case GameMessageType.GuestQuitRequest:
      return decodeGuestQuitRequest(rb);
    case GameMessageType.PauseRequest:
      return decodePauseRequest(rb);
    default: {
      // Cast to number for error message (type is 'never' due to exhaustive switch)
      const unknownType = type as number;
      throw new Error(`Unknown message type: 0x${unknownType.toString(16)}`);
    }
  }
}

// =============================================================================
// Individual Decoders
// =============================================================================

function decodeWelcome(rb: ReadBuffer): WelcomeMessage {
  const playerId = readString(rb);
  const campaignJson = readString(rb);
  const campaignState = decodeJson<CampaignState>(campaignJson);
  const playerCount = readUint16(rb);
  const players: GamePlayerInfo[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push(readPlayerInfo(rb));
  }
  return {
    type: GameMessageType.Welcome,
    playerId,
    campaignState,
    players,
  };
}

function decodePlayerJoined(rb: ReadBuffer): PlayerJoinedExtMessage {
  return {
    type: GameMessageType.PlayerJoinedExt,
    player: readPlayerInfo(rb),
  };
}

function decodePlayerLeft(rb: ReadBuffer): PlayerLeftExtMessage {
  const playerId = readString(rb);
  const reasonByte = readByte(rb);
  const reason: LeaveReason =
    reasonByte === 0 ? 'disconnected' : reasonByte === 1 ? 'kicked' : 'left';
  return {
    type: GameMessageType.PlayerLeftExt,
    playerId,
    reason,
  };
}

function decodeChatMessage(rb: ReadBuffer): ChatMessage {
  return {
    type: GameMessageType.ChatMessage,
    fromPlayerId: readString(rb),
    text: readString(rb),
    timestamp: readFloat64(rb),
  };
}

function decodeReadyState(rb: ReadBuffer): ReadyStateMessage {
  return {
    type: GameMessageType.ReadyState,
    playerId: readString(rb),
    ready: readBool(rb),
  };
}

function decodePermissionUpdate(rb: ReadBuffer): PermissionUpdateMessage {
  return {
    type: GameMessageType.PermissionUpdate,
    playerId: readString(rb),
    permissions: readPermission(rb),
  };
}

function decodeShipAssignment(rb: ReadBuffer): ShipAssignmentMessage {
  const playerId = readString(rb);
  const hasShipId = readBool(rb);
  const shipId = hasShipId ? readString(rb) : null;
  return {
    type: GameMessageType.ShipAssignment,
    playerId,
    shipId,
  };
}

function decodeCampaignSync(rb: ReadBuffer): CampaignSyncMessage {
  const campaignJson = readString(rb);
  return {
    type: GameMessageType.CampaignSync,
    campaignState: decodeJson<CampaignState>(campaignJson),
  };
}

function decodeActionRequest(rb: ReadBuffer): ActionRequestMessage {
  const requestId = readUint32(rb);
  const actionJson = readString(rb);
  return {
    type: GameMessageType.ActionRequest,
    requestId,
    action: decodeJson<ActionRequestData>(actionJson),
  };
}

function decodeActionResponse(rb: ReadBuffer): ActionResponseMessage {
  const requestId = readUint32(rb);
  const success = readBool(rb);
  const hasError = readBool(rb);
  if (hasError) {
    const error = readString(rb);
    return { type: GameMessageType.ActionResponse, requestId, success, error };
  }
  return { type: GameMessageType.ActionResponse, requestId, success };
}

function decodeContractAccepted(rb: ReadBuffer): ContractAcceptedMessage {
  return {
    type: GameMessageType.ContractAccepted,
    contractId: readString(rb),
  };
}

function decodeLaunchCountdown(rb: ReadBuffer): LaunchCountdownMessage {
  return {
    type: GameMessageType.LaunchCountdown,
    secondsRemaining: readUint16(rb),
  };
}

function decodeLaunchAborted(rb: ReadBuffer): LaunchAbortedMessage {
  return {
    type: GameMessageType.LaunchAborted,
    reason: readString(rb),
  };
}

function decodeMissionStarted(rb: ReadBuffer): MissionStartedMessage {
  return {
    type: GameMessageType.MissionStarted,
    contractId: readString(rb),
    seed: readUint32(rb),
    campaignStateHash: readUint32(rb),
  };
}

function decodeMissionEnded(rb: ReadBuffer): MissionEndedMessage {
  const outcomeJson = readString(rb);
  return {
    type: GameMessageType.MissionEnded,
    outcome: decodeJson<MissionOutcomeData>(outcomeJson),
  };
}

function decodeSessionEnded(rb: ReadBuffer): SessionEndedMessage {
  return {
    type: GameMessageType.SessionEnded,
    reason: readString(rb),
  };
}

function decodeKickNotification(rb: ReadBuffer): KickNotificationMessage {
  const hasReason = readBool(rb);
  if (hasReason) {
    const reason = readString(rb);
    return { type: GameMessageType.KickNotification, reason };
  }
  return { type: GameMessageType.KickNotification };
}

function decodeCallsignAnnounce(rb: ReadBuffer): CallsignAnnounceMessage {
  return {
    type: GameMessageType.CallsignAnnounce,
    callsign: readString(rb),
  };
}

function decodeCallsignUpdate(rb: ReadBuffer): CallsignUpdateMessage {
  return {
    type: GameMessageType.CallsignUpdate,
    playerId: readString(rb),
    callsign: readString(rb),
  };
}

function decodePauseReadyState(rb: ReadBuffer): PauseReadyStateMessage {
  return {
    type: GameMessageType.PauseReadyState,
    playerId: readString(rb),
    ready: readBool(rb),
  };
}

function decodePlayerDropped(rb: ReadBuffer): PlayerDroppedMessage {
  return {
    type: GameMessageType.PlayerDropped,
    playerId: readString(rb),
    aiSkill: readByte(rb),
  };
}

function decodeGuestQuitRequest(rb: ReadBuffer): GuestQuitRequestMessage {
  return {
    type: GameMessageType.GuestQuitRequest,
    playerId: readString(rb),
  };
}

function decodePauseRequest(rb: ReadBuffer): PauseRequestMessage {
  const playerId = readString(rb);
  const callsign = readString(rb);
  const reasonByte = readByte(rb);
  const reason =
    reasonByte === 0
      ? 'player-request'
      : reasonByte === 1
        ? 'player-disconnect'
        : 'lag-detected';
  return {
    type: GameMessageType.PauseRequest,
    playerId,
    callsign,
    reason,
  };
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Check if a byte array starts with a game message type byte.
 * Used to distinguish game messages from rollback-netcode messages.
 */
export function isGameMessage(data: Uint8Array): boolean {
  const typeByte = data[0];
  if (typeByte === undefined) return false;
  return typeByte >= GAME_MSG_MIN && typeByte <= GAME_MSG_MAX;
}

/**
 * Get the message type from a byte array without decoding the full message.
 */
export function getMessageType(data: Uint8Array): GameMessageType | null {
  if (!isGameMessage(data)) return null;
  return data[0] as GameMessageType;
}
