/**
 * Authentication utilities.
 *
 * Tokens use crypto.randomBytes for strong entropy.
 * Validation is done by looking up the peer in storage.
 */

import crypto from 'node:crypto';

/**
 * Generate a new authentication token.
 * Uses 32 random bytes encoded as 64 hex characters.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a new peer ID.
 * Uses 16 random bytes with 'peer-' prefix for readability.
 */
export function generatePeerId(): string {
  return `peer-${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Extract bearer token from Authorization header.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] ?? null;
}
