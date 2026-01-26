/**
 * Message Encoding - Converts game messages to binary format.
 */

import {
  createWriteBuffer,
  encodeJson,
  permissionSize,
  playerInfoSize,
  stringSize,
  writeBool,
  writeByte,
  writeFloat64,
  writePermission,
  writePlayerInfo,
  writeString,
  writeUint16,
  writeUint32,
} from './buffer-utils';
import {
  type ActionRequestMessage,
  type ActionResponseMessage,
  type CallsignAnnounceMessage,
  type CallsignChangedMessage,
  type CallsignChangeRequestMessage,
  type CampaignSyncMessage,
  type ChatMessageMessage,
  type ContractAcceptedMessage,
  type GameMessage,
  GameMessageType,
  type KickNotificationMessage,
  type LaunchAbortedMessage,
  type LaunchCountdownMessage,
  type MissionEndedMessage,
  type MissionStartedMessage,
  type PermissionUpdateMessage,
  type PlayerJoinedExtMessage,
  type PlayerLeftExtMessage,
  type ReadyStateMessage,
  type SessionEndedMessage,
  type ShipAssignmentMessage,
  type WelcomeMessage,
} from './messages';

/**
 * Encode a game message to binary format.
 */
export function encodeMessage(msg: GameMessage): Uint8Array {
  switch (msg.type) {
    case GameMessageType.Welcome:
      return encodeWelcome(msg);
    case GameMessageType.PlayerJoinedExt:
      return encodePlayerJoined(msg);
    case GameMessageType.PlayerLeftExt:
      return encodePlayerLeft(msg);
    case GameMessageType.ChatMessage:
      return encodeChatMessage(msg);
    case GameMessageType.ReadyState:
      return encodeReadyState(msg);
    case GameMessageType.PermissionUpdate:
      return encodePermissionUpdate(msg);
    case GameMessageType.ShipAssignment:
      return encodeShipAssignment(msg);
    case GameMessageType.CampaignSync:
      return encodeCampaignSync(msg);
    case GameMessageType.ActionRequest:
      return encodeActionRequest(msg);
    case GameMessageType.ActionResponse:
      return encodeActionResponse(msg);
    case GameMessageType.ContractAccepted:
      return encodeContractAccepted(msg);
    case GameMessageType.LaunchCountdown:
      return encodeLaunchCountdown(msg);
    case GameMessageType.LaunchAborted:
      return encodeLaunchAborted(msg);
    case GameMessageType.MissionStarted:
      return encodeMissionStarted(msg);
    case GameMessageType.MissionEnded:
      return encodeMissionEnded(msg);
    case GameMessageType.SessionEnded:
      return encodeSessionEnded(msg);
    case GameMessageType.KickNotification:
      return encodeKickNotification(msg);
    case GameMessageType.CallsignAnnounce:
      return encodeCallsignAnnounce(msg);
    case GameMessageType.CallsignChangeRequest:
      return encodeCallsignChangeRequest(msg);
    case GameMessageType.CallsignChanged:
      return encodeCallsignChanged(msg);
    default: {
      const exhaustive: never = msg;
      throw new Error(`Unknown message type: ${exhaustive}`);
    }
  }
}

// =============================================================================
// Individual Encoders
// =============================================================================

function encodeWelcome(msg: WelcomeMessage): Uint8Array {
  const campaignJson = encodeJson(msg.campaignState);
  let size = 1; // type
  size += stringSize(msg.playerId);
  size += stringSize(campaignJson);
  size += 2; // player count
  for (const player of msg.players) {
    size += playerInfoSize(player);
  }

  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeString(wb, campaignJson);
  writeUint16(wb, msg.players.length);
  for (const player of msg.players) {
    writePlayerInfo(wb, player);
  }
  return wb.buffer;
}

function encodePlayerJoined(msg: PlayerJoinedExtMessage): Uint8Array {
  const size = 1 + playerInfoSize(msg.player);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writePlayerInfo(wb, msg.player);
  return wb.buffer;
}

function encodePlayerLeft(msg: PlayerLeftExtMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId) + 1;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  const reasonByte =
    msg.reason === 'disconnected' ? 0 : msg.reason === 'kicked' ? 1 : 2;
  writeByte(wb, reasonByte);
  return wb.buffer;
}

function encodeChatMessage(msg: ChatMessageMessage): Uint8Array {
  const size = 1 + stringSize(msg.fromPlayerId) + stringSize(msg.text) + 8;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.fromPlayerId);
  writeString(wb, msg.text);
  writeFloat64(wb, msg.timestamp);
  return wb.buffer;
}

function encodeReadyState(msg: ReadyStateMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId) + 1;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeBool(wb, msg.ready);
  return wb.buffer;
}

function encodePermissionUpdate(msg: PermissionUpdateMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId) + permissionSize();
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writePermission(wb, msg.permissions);
  return wb.buffer;
}

function encodeShipAssignment(msg: ShipAssignmentMessage): Uint8Array {
  let size = 1 + stringSize(msg.playerId) + 1;
  if (msg.shipId !== null) {
    size += stringSize(msg.shipId);
  }
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeBool(wb, msg.shipId !== null);
  if (msg.shipId !== null) {
    writeString(wb, msg.shipId);
  }
  return wb.buffer;
}

function encodeCampaignSync(msg: CampaignSyncMessage): Uint8Array {
  const campaignJson = encodeJson(msg.campaignState);
  const size = 1 + stringSize(campaignJson);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, campaignJson);
  return wb.buffer;
}

function encodeActionRequest(msg: ActionRequestMessage): Uint8Array {
  const actionJson = encodeJson(msg.action);
  const size = 1 + 4 + stringSize(actionJson);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeUint32(wb, msg.requestId);
  writeString(wb, actionJson);
  return wb.buffer;
}

function encodeActionResponse(msg: ActionResponseMessage): Uint8Array {
  let size = 1 + 4 + 1 + 1; // type + requestId + success + hasError
  if (msg.error !== undefined) {
    size += stringSize(msg.error);
  }
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeUint32(wb, msg.requestId);
  writeBool(wb, msg.success);
  writeBool(wb, msg.error !== undefined);
  if (msg.error !== undefined) {
    writeString(wb, msg.error);
  }
  return wb.buffer;
}

function encodeContractAccepted(msg: ContractAcceptedMessage): Uint8Array {
  const size = 1 + stringSize(msg.contractId);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.contractId);
  return wb.buffer;
}

function encodeLaunchCountdown(msg: LaunchCountdownMessage): Uint8Array {
  const size = 1 + 2;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeUint16(wb, msg.secondsRemaining);
  return wb.buffer;
}

function encodeLaunchAborted(msg: LaunchAbortedMessage): Uint8Array {
  const size = 1 + stringSize(msg.reason);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.reason);
  return wb.buffer;
}

function encodeMissionStarted(msg: MissionStartedMessage): Uint8Array {
  const size = 1 + stringSize(msg.contractId) + 4;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.contractId);
  writeUint32(wb, msg.seed);
  return wb.buffer;
}

function encodeMissionEnded(msg: MissionEndedMessage): Uint8Array {
  const outcomeJson = encodeJson(msg.outcome);
  const size = 1 + stringSize(outcomeJson);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, outcomeJson);
  return wb.buffer;
}

function encodeSessionEnded(msg: SessionEndedMessage): Uint8Array {
  const size = 1 + stringSize(msg.reason);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.reason);
  return wb.buffer;
}

function encodeKickNotification(msg: KickNotificationMessage): Uint8Array {
  let size = 1 + 1; // type + hasReason
  if (msg.reason !== undefined) {
    size += stringSize(msg.reason);
  }
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeBool(wb, msg.reason !== undefined);
  if (msg.reason !== undefined) {
    writeString(wb, msg.reason);
  }
  return wb.buffer;
}

function encodeCallsignAnnounce(msg: CallsignAnnounceMessage): Uint8Array {
  const size = 1 + stringSize(msg.callsign);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.callsign);
  return wb.buffer;
}

function encodeCallsignChangeRequest(
  msg: CallsignChangeRequestMessage,
): Uint8Array {
  const size = 1 + stringSize(msg.newCallsign);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.newCallsign);
  return wb.buffer;
}

function encodeCallsignChanged(msg: CallsignChangedMessage): Uint8Array {
  const size =
    1 +
    stringSize(msg.playerId) +
    stringSize(msg.oldCallsign) +
    stringSize(msg.newCallsign);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeString(wb, msg.oldCallsign);
  writeString(wb, msg.newCallsign);
  return wb.buffer;
}
