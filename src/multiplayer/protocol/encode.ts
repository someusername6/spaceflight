/**
 * Message Encoding - Converts game messages to binary format.
 */

import {
  createWriteBuffer,
  encodeJson,
  MAX_MESSAGE_SIZE,
  ProtocolError,
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
  encodeContractAccepted,
  encodeKickNotification,
  encodeLaunchAborted,
  encodeLaunchCountdown,
  encodeMissionEnded,
  encodeMissionStarted,
  encodeReturnToLobby,
  encodeSessionEnded,
} from './encode-mission';
import {
  type ActionRequestMessage,
  type ActionResponseMessage,
  type CallsignAnnounceMessage,
  type CallsignUpdateMessage,
  type CampaignSyncMessage,
  type ChatMessage,
  type GameMessage,
  GameMessageType,
  type GuestQuitRequestMessage,
  type PauseReadyStateMessage,
  type PauseRequestMessage,
  type PermissionUpdateMessage,
  type PlayerDroppedMessage,
  type PlayerJoinedExtMessage,
  type PlayerLeftExtMessage,
  type ReadyStateMessage,
  type ShipAssignmentMessage,
  type WelcomeMessage,
} from './messages';

/**
 * Encode a game message to binary format.
 * @throws {ProtocolError} if message exceeds MAX_MESSAGE_SIZE
 */
export function encodeMessage(msg: GameMessage): Uint8Array {
  let buffer: Uint8Array;

  switch (msg.type) {
    case GameMessageType.Welcome:
      buffer = encodeWelcome(msg);
      break;
    case GameMessageType.PlayerJoinedExt:
      buffer = encodePlayerJoined(msg);
      break;
    case GameMessageType.PlayerLeftExt:
      buffer = encodePlayerLeft(msg);
      break;
    case GameMessageType.ChatMessage:
      buffer = encodeChatMessage(msg);
      break;
    case GameMessageType.ReadyState:
      buffer = encodeReadyState(msg);
      break;
    case GameMessageType.PermissionUpdate:
      buffer = encodePermissionUpdate(msg);
      break;
    case GameMessageType.ShipAssignment:
      buffer = encodeShipAssignment(msg);
      break;
    case GameMessageType.CampaignSync:
      buffer = encodeCampaignSync(msg);
      break;
    case GameMessageType.ActionRequest:
      buffer = encodeActionRequest(msg);
      break;
    case GameMessageType.ActionResponse:
      buffer = encodeActionResponse(msg);
      break;
    case GameMessageType.ContractAccepted:
      buffer = encodeContractAccepted(msg);
      break;
    case GameMessageType.LaunchCountdown:
      buffer = encodeLaunchCountdown(msg);
      break;
    case GameMessageType.LaunchAborted:
      buffer = encodeLaunchAborted(msg);
      break;
    case GameMessageType.MissionStarted:
      buffer = encodeMissionStarted(msg);
      break;
    case GameMessageType.MissionEnded:
      buffer = encodeMissionEnded(msg);
      break;
    case GameMessageType.SessionEnded:
      buffer = encodeSessionEnded(msg);
      break;
    case GameMessageType.KickNotification:
      buffer = encodeKickNotification(msg);
      break;
    case GameMessageType.CallsignAnnounce:
      buffer = encodeCallsignAnnounce(msg);
      break;
    case GameMessageType.CallsignUpdate:
      buffer = encodeCallsignUpdate(msg);
      break;
    case GameMessageType.PauseReadyState:
      buffer = encodePauseReadyState(msg);
      break;
    case GameMessageType.PlayerDropped:
      buffer = encodePlayerDropped(msg);
      break;
    case GameMessageType.GuestQuitRequest:
      buffer = encodeGuestQuitRequest(msg);
      break;
    case GameMessageType.PauseRequest:
      buffer = encodePauseRequest(msg);
      break;
    case GameMessageType.ReturnToLobby:
      buffer = encodeReturnToLobby();
      break;
    default: {
      const exhaustive: never = msg;
      throw new Error(`Unknown message type: ${exhaustive}`);
    }
  }

  if (buffer.length > MAX_MESSAGE_SIZE) {
    throw new ProtocolError(
      `Message size ${buffer.length} exceeds maximum ${MAX_MESSAGE_SIZE}`,
    );
  }

  return buffer;
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

function encodeChatMessage(msg: ChatMessage): Uint8Array {
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
  // Add space for optional expectedVersion (1 byte flag + 4 bytes for uint32)
  size += 1;
  if (msg.expectedVersion !== undefined) {
    size += 4;
  }
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeBool(wb, msg.shipId !== null);
  if (msg.shipId !== null) {
    writeString(wb, msg.shipId);
  }
  writeBool(wb, msg.expectedVersion !== undefined);
  if (msg.expectedVersion !== undefined) {
    writeUint32(wb, msg.expectedVersion);
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

function encodeCallsignAnnounce(msg: CallsignAnnounceMessage): Uint8Array {
  const size = 1 + stringSize(msg.callsign);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.callsign);
  return wb.buffer;
}

function encodeCallsignUpdate(msg: CallsignUpdateMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId) + stringSize(msg.callsign);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeString(wb, msg.callsign);
  return wb.buffer;
}

function encodePauseReadyState(msg: PauseReadyStateMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId) + 1;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeBool(wb, msg.ready);
  return wb.buffer;
}

function encodePlayerDropped(msg: PlayerDroppedMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId) + 1;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeByte(wb, msg.aiSkill);
  return wb.buffer;
}

function encodeGuestQuitRequest(msg: GuestQuitRequestMessage): Uint8Array {
  const size = 1 + stringSize(msg.playerId);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  return wb.buffer;
}

function encodePauseRequest(msg: PauseRequestMessage): Uint8Array {
  // Reason is encoded as a single byte: 0=player-request, 1=player-disconnect, 2=lag-detected
  const reasonByte =
    msg.reason === 'player-request'
      ? 0
      : msg.reason === 'player-disconnect'
        ? 1
        : 2;
  const size = 1 + stringSize(msg.playerId) + stringSize(msg.callsign) + 1;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.playerId);
  writeString(wb, msg.callsign);
  writeByte(wb, reasonByte);
  return wb.buffer;
}
