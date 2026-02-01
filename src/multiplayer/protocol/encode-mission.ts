/**
 * Mission Lifecycle Message Encoding
 *
 * Encoders for mission-related messages (contract, launch, mission flow).
 * Split from encode.ts to stay under 400 line limit.
 */

import {
  createWriteBuffer,
  encodeJson,
  stringSize,
  writeBool,
  writeByte,
  writeString,
  writeUint16,
  writeUint32,
} from './buffer-utils';
import {
  type ContractAcceptedMessage,
  GameMessageType,
  type KickNotificationMessage,
  type LaunchAbortedMessage,
  type LaunchCountdownMessage,
  type MissionEndedMessage,
  type MissionStartedMessage,
  type SessionEndedMessage,
} from './messages';

export function encodeContractAccepted(
  msg: ContractAcceptedMessage,
): Uint8Array {
  const size = 1 + stringSize(msg.contractId);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.contractId);
  return wb.buffer;
}

export function encodeLaunchCountdown(msg: LaunchCountdownMessage): Uint8Array {
  const size = 1 + 2;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeUint16(wb, msg.secondsRemaining);
  return wb.buffer;
}

export function encodeLaunchAborted(msg: LaunchAbortedMessage): Uint8Array {
  const size = 1 + stringSize(msg.reason);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.reason);
  return wb.buffer;
}

export function encodeMissionStarted(msg: MissionStartedMessage): Uint8Array {
  const size = 1 + stringSize(msg.contractId) + 4 + 4;
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.contractId);
  writeUint32(wb, msg.seed);
  writeUint32(wb, msg.campaignStateHash);
  return wb.buffer;
}

export function encodeMissionEnded(msg: MissionEndedMessage): Uint8Array {
  const outcomeJson = encodeJson(msg.outcome);
  const size = 1 + stringSize(outcomeJson);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, outcomeJson);
  return wb.buffer;
}

export function encodeSessionEnded(msg: SessionEndedMessage): Uint8Array {
  const size = 1 + stringSize(msg.reason);
  const wb = createWriteBuffer(size);
  writeByte(wb, msg.type);
  writeString(wb, msg.reason);
  return wb.buffer;
}

export function encodeKickNotification(
  msg: KickNotificationMessage,
): Uint8Array {
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

export function encodeReturnToLobby(): Uint8Array {
  const size = 1; // Just the type byte
  const wb = createWriteBuffer(size);
  writeByte(wb, GameMessageType.ReturnToLobby);
  return wb.buffer;
}
