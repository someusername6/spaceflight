/**
 * Authentication utilities for AWS signaling server.
 * Generates secure random IDs and tokens.
 */

import { randomBytes } from 'node:crypto';

/**
 * Generate a random peer ID (e.g., "peer-a1b2c3d4")
 */
export function generateId(): string {
  return `peer-${randomBytes(4).toString('hex')}`;
}

/**
 * Generate a random auth token (32 hex characters)
 */
export function generateToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a random room code (8 uppercase alphanumeric characters)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
