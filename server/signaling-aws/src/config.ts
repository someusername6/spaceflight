/**
 * Configuration for AWS signaling server.
 * Values are read from environment variables with sensible defaults.
 */

export interface Config {
  tableName: string;
  maxPeersPerRoom: number;
  roomExpirySeconds: number;
  signalExpirySeconds: number;
  joinRateLimitPerSecond: number;
  createRateLimitPerMinute: number;
  signalRateLimitPerSecond: number;
}

export function getConfig(): Config {
  return {
    tableName: process.env.TABLE_NAME ?? 'spaceflight-signaling',
    maxPeersPerRoom: parseInt(process.env.MAX_PEERS_PER_ROOM ?? '4', 10),
    roomExpirySeconds: parseInt(process.env.ROOM_EXPIRY_SECONDS ?? '3600', 10),
    signalExpirySeconds: parseInt(
      process.env.SIGNAL_EXPIRY_SECONDS ?? '60',
      10,
    ),
    joinRateLimitPerSecond: parseInt(
      process.env.JOIN_RATE_LIMIT_PER_SECOND ?? '5',
      10,
    ),
    createRateLimitPerMinute: parseInt(
      process.env.CREATE_RATE_LIMIT_PER_MINUTE ?? '10',
      10,
    ),
    signalRateLimitPerSecond: parseInt(
      process.env.SIGNAL_RATE_LIMIT_PER_SECOND ?? '20',
      10,
    ),
  };
}
