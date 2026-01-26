/**
 * Authentication utilities.
 *
 * Tokens are UUIDv4 strings. Validation is done by looking up the peer in storage.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new authentication token.
 */
export function generateToken(): string {
  return uuidv4();
}

/**
 * Generate a new peer ID.
 */
export function generatePeerId(): string {
  return uuidv4();
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
