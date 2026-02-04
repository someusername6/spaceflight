/**
 * Buffer Utilities for Binary Message Encoding/Decoding.
 *
 * Provides read/write helpers for primitive types and common patterns.
 *
 * Format conventions:
 * - String: length (4 bytes, uint32) + UTF-8 bytes
 * - Numbers: DataView methods (big-endian)
 * - Complex objects: JSON string
 */

import type { GamePlayerInfo, Permission } from './messages';

// =============================================================================
// Protocol Error
// =============================================================================

/**
 * Error thrown when protocol parsing/encoding fails.
 * Used for bounds validation, malformed data, and size limit violations.
 */
export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

// =============================================================================
// Protocol Constants
// =============================================================================

/** Maximum string length in bytes (64KB) */
export const MAX_STRING_LENGTH = 65536;

/** Maximum message size in bytes (1MB) */
export const MAX_MESSAGE_SIZE = 1048576;

// =============================================================================
// Text Encoder/Decoder (shared instances)
// =============================================================================

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// =============================================================================
// Write Buffer
// =============================================================================

export interface WriteBuffer {
  buffer: Uint8Array;
  view: DataView;
  offset: number;
}

export function createWriteBuffer(size: number): WriteBuffer {
  const buffer = new Uint8Array(size);
  return {
    buffer,
    view: new DataView(buffer.buffer),
    offset: 0,
  };
}

export function writeByte(wb: WriteBuffer, value: number): void {
  wb.view.setUint8(wb.offset, value);
  wb.offset += 1;
}

export function writeBool(wb: WriteBuffer, value: boolean): void {
  wb.view.setUint8(wb.offset, value ? 1 : 0);
  wb.offset += 1;
}

export function writeUint16(wb: WriteBuffer, value: number): void {
  wb.view.setUint16(wb.offset, value, false);
  wb.offset += 2;
}

export function writeUint32(wb: WriteBuffer, value: number): void {
  wb.view.setUint32(wb.offset, value, false);
  wb.offset += 4;
}

export function writeFloat64(wb: WriteBuffer, value: number): void {
  wb.view.setFloat64(wb.offset, value, false);
  wb.offset += 8;
}

export function writeString(wb: WriteBuffer, str: string): void {
  const encoded = textEncoder.encode(str);
  if (encoded.length > MAX_STRING_LENGTH) {
    throw new ProtocolError(
      `String length ${encoded.length} exceeds maximum ${MAX_STRING_LENGTH}`,
    );
  }
  writeUint32(wb, encoded.length);
  wb.buffer.set(encoded, wb.offset);
  wb.offset += encoded.length;
}

// =============================================================================
// Read Buffer
// =============================================================================

export interface ReadBuffer {
  view: DataView;
  offset: number;
}

export function createReadBuffer(data: Uint8Array): ReadBuffer {
  return {
    view: new DataView(data.buffer, data.byteOffset, data.byteLength),
    offset: 0,
  };
}

/**
 * Validates that the buffer has enough bytes available for a read operation.
 * @throws {ProtocolError} if not enough bytes available
 */
function ensureBytes(rb: ReadBuffer, needed: number): void {
  const available = rb.view.byteLength - rb.offset;
  if (available < needed) {
    throw new ProtocolError(
      `Buffer overflow: need ${needed} bytes at offset ${rb.offset}, but only ${available} available`,
    );
  }
}

export function readByte(rb: ReadBuffer): number {
  ensureBytes(rb, 1);
  const value = rb.view.getUint8(rb.offset);
  rb.offset += 1;
  return value;
}

export function readBool(rb: ReadBuffer): boolean {
  return readByte(rb) !== 0;
}

export function readUint16(rb: ReadBuffer): number {
  ensureBytes(rb, 2);
  const value = rb.view.getUint16(rb.offset, false);
  rb.offset += 2;
  return value;
}

export function readUint32(rb: ReadBuffer): number {
  ensureBytes(rb, 4);
  const value = rb.view.getUint32(rb.offset, false);
  rb.offset += 4;
  return value;
}

export function readFloat64(rb: ReadBuffer): number {
  ensureBytes(rb, 8);
  const value = rb.view.getFloat64(rb.offset, false);
  rb.offset += 8;
  return value;
}

export function readString(rb: ReadBuffer): string {
  const length = readUint32(rb); // readUint32 already calls ensureBytes

  if (length > MAX_STRING_LENGTH) {
    throw new ProtocolError(
      `String length ${length} exceeds maximum ${MAX_STRING_LENGTH}`,
    );
  }

  ensureBytes(rb, length);
  const bytes = new Uint8Array(
    rb.view.buffer,
    rb.view.byteOffset + rb.offset,
    length,
  );
  rb.offset += length;
  return textDecoder.decode(bytes);
}

// =============================================================================
// JSON Helpers
// =============================================================================

export function encodeJson<T>(value: T): string {
  return JSON.stringify(value);
}

export function decodeJson<T>(str: string): T {
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    throw new ProtocolError(
      `Invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
    );
  }
}

// =============================================================================
// Size Calculation Helpers
// =============================================================================

export function stringSize(str: string): number {
  return 4 + textEncoder.encode(str).length;
}

export function permissionSize(): number {
  return 4; // 1 byte shipEdit + 3 bool bytes
}

export function playerInfoSize(player: GamePlayerInfo): number {
  let size = stringSize(player.playerId);
  size += stringSize(player.callsign);
  size += 1; // hasShipId
  if (player.shipId !== null) {
    size += stringSize(player.shipId);
  }
  size += 1; // ready
  size += permissionSize();
  size += 8; // autoaimDegrees (float64)
  return size;
}

// =============================================================================
// Permission Encoding
// =============================================================================

export function writePermission(wb: WriteBuffer, perm: Permission): void {
  const shipEditValue =
    perm.shipEdit === 'none' ? 0 : perm.shipEdit === 'own' ? 1 : 2;
  writeByte(wb, shipEditValue);
  writeBool(wb, perm.canBuy);
  writeBool(wb, perm.canSell);
  writeBool(wb, perm.canConvertScrap);
}

export function readPermission(rb: ReadBuffer): Permission {
  const shipEditValue = readByte(rb);
  const shipEdit =
    shipEditValue === 0 ? 'none' : shipEditValue === 1 ? 'own' : 'any';
  return {
    shipEdit,
    canBuy: readBool(rb),
    canSell: readBool(rb),
    canConvertScrap: readBool(rb),
  };
}

// =============================================================================
// PlayerInfo Encoding
// =============================================================================

export function writePlayerInfo(wb: WriteBuffer, player: GamePlayerInfo): void {
  writeString(wb, player.playerId);
  writeString(wb, player.callsign);
  writeBool(wb, player.shipId !== null);
  if (player.shipId !== null) {
    writeString(wb, player.shipId);
  }
  writeBool(wb, player.ready);
  writePermission(wb, player.permissions);
  writeFloat64(wb, player.autoaimDegrees);
}

export function readPlayerInfo(rb: ReadBuffer): GamePlayerInfo {
  const playerId = readString(rb);
  const callsign = readString(rb);
  const hasShipId = readBool(rb);
  const shipId = hasShipId ? readString(rb) : null;
  const ready = readBool(rb);
  const permissions = readPermission(rb);
  const autoaimDegrees = readFloat64(rb);
  return { playerId, callsign, shipId, ready, permissions, autoaimDegrees };
}
