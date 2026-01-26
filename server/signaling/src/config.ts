/**
 * Server configuration.
 */

export interface Config {
  /** Server port */
  port: number;

  /** Maximum peers per room (including host) */
  maxPeersPerRoom: number;

  /** Room expiry time in milliseconds (1 hour) */
  roomExpiryMs: number;

  /** Signal expiry time in milliseconds (60 seconds) */
  signalExpiryMs: number;

  /** Event expiry time in milliseconds (60 seconds) */
  eventExpiryMs: number;

  /** Maximum signal data size in bytes (64KB) */
  maxSignalDataSize: number;

  /** Rate limit: join attempts per IP per second */
  joinRateLimitPerSecond: number;

  /** Rate limit: room creates per IP per minute */
  createRateLimitPerMinute: number;

  /** Whether running in production mode */
  isProduction: boolean;
}

/** Default configuration for local development */
export const defaultConfig: Config = {
  port: 3001,
  maxPeersPerRoom: 4,
  roomExpiryMs: 60 * 60 * 1000, // 1 hour
  signalExpiryMs: 60 * 1000, // 60 seconds
  eventExpiryMs: 60 * 1000, // 60 seconds
  maxSignalDataSize: 64 * 1024, // 64KB
  joinRateLimitPerSecond: 10, // Higher for local dev/testing
  createRateLimitPerMinute: 60, // Higher for local dev/testing
  isProduction: false,
};

/** Get config from environment or use defaults */
export function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT ?? String(defaultConfig.port), 10),
    maxPeersPerRoom: parseInt(
      process.env.MAX_PEERS_PER_ROOM ?? String(defaultConfig.maxPeersPerRoom),
      10,
    ),
    roomExpiryMs: parseInt(
      process.env.ROOM_EXPIRY_MS ?? String(defaultConfig.roomExpiryMs),
      10,
    ),
    signalExpiryMs: parseInt(
      process.env.SIGNAL_EXPIRY_MS ?? String(defaultConfig.signalExpiryMs),
      10,
    ),
    eventExpiryMs: parseInt(
      process.env.EVENT_EXPIRY_MS ?? String(defaultConfig.eventExpiryMs),
      10,
    ),
    maxSignalDataSize: parseInt(
      process.env.MAX_SIGNAL_DATA_SIZE ??
        String(defaultConfig.maxSignalDataSize),
      10,
    ),
    joinRateLimitPerSecond: parseInt(
      process.env.JOIN_RATE_LIMIT_PER_SECOND ??
        String(defaultConfig.joinRateLimitPerSecond),
      10,
    ),
    createRateLimitPerMinute: parseInt(
      process.env.CREATE_RATE_LIMIT_PER_MINUTE ??
        String(defaultConfig.createRateLimitPerMinute),
      10,
    ),
    isProduction: process.env.NODE_ENV === 'production',
  };
}
