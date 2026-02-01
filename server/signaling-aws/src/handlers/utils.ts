/**
 * Shared utilities for handlers.
 */

import type { HandlerResult } from '../router';

/**
 * Extract bearer token from Authorization header.
 */
export function extractToken(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7);
}

/**
 * Check if error is a DynamoDB throttling error.
 */
export function isDynamoDBThrottled(error: unknown): boolean {
  const name = (error as { name?: string }).name;
  return (
    name === 'ProvisionedThroughputExceededException' ||
    name === 'ThrottlingException'
  );
}

/**
 * Standard throttled response.
 */
export function throttledResponse(): HandlerResult {
  return {
    status: 503,
    body: {
      error: 'service_unavailable',
      message: 'Server busy, please retry',
    },
  };
}

/**
 * Standard unauthorized response.
 */
export function unauthorizedResponse(message = 'Unauthorized'): HandlerResult {
  return {
    status: 401,
    body: { error: 'unauthorized', message },
  };
}

/**
 * Standard forbidden response.
 */
export function forbiddenResponse(message = 'Forbidden'): HandlerResult {
  return {
    status: 403,
    body: { error: 'forbidden', message },
  };
}

/**
 * Standard not found response.
 */
export function notFoundResponse(message = 'Not found'): HandlerResult {
  return {
    status: 404,
    body: { error: 'not_found', message },
  };
}

/**
 * Standard rate limited response.
 */
export function rateLimitedResponse(): HandlerResult {
  return {
    status: 429,
    body: { error: 'rate_limited', message: 'Too many requests' },
  };
}

/**
 * Standard bad request response.
 */
export function badRequestResponse(message = 'Bad request'): HandlerResult {
  return {
    status: 400,
    body: { error: 'bad_request', message },
  };
}
