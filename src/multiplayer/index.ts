/**
 * Multiplayer Module - Public API for networked multiplayer.
 *
 * This module provides rollback-based multiplayer support using the
 * rollback-netcode library. Two or more sessions can stay in sync
 * using deterministic simulation and rollback/resimulation.
 *
 * @example
 * ```typescript
 * import { createMultiplayerSession, serializeInput } from './multiplayer';
 * import { LocalTransport } from 'rollback-netcode';
 *
 * // Create transport
 * const transport = new LocalTransport('player-1');
 *
 * // Create session
 * const session = createMultiplayerSession({
 *   world,
 *   transport,
 *   localPlayerId: 'player-1',
 *   isHost: true,
 *   playerEntityMap: new Map([['player-1', playerEntity]]),
 * });
 *
 * // Host creates room
 * const roomId = await session.createRoom();
 * session.start();
 *
 * // Game loop
 * function tick() {
 *   const input = captureInput();
 *   const result = session.tick(input);
 *   if (result.rolledBack) {
 *     console.log(`Rolled back ${result.rollbackTicks} ticks`);
 *   }
 * }
 * ```
 */

// =============================================================================
// Input Format
// =============================================================================

export {
  createEmptyInput,
  deserializeInput,
  INPUT_SIZE_BYTES,
  serializeInput,
} from './input-format';

// =============================================================================
// Game Adapter
// =============================================================================

export { createGameAdapter, SpaceflightGameAdapter } from './game-adapter';

// =============================================================================
// Multiplayer Session
// =============================================================================

export {
  createMultiplayerSession,
  createMultiplayerSessionAuto,
  MultiplayerSession,
  type MultiplayerSessionOptions,
} from './multiplayer-session';

// =============================================================================
// Re-exports from rollback-netcode
// =============================================================================

// Re-export commonly used types from rollback-netcode for convenience
export {
  asPlayerId,
  asTick,
  createLocalTransportGroup,
  DEFAULT_SESSION_CONFIG,
  LocalTransport,
  type LocalTransportConfig,
  type PlayerId,
  type PlayerInfo,
  type SessionConfig,
  type SessionEvents,
  type Tick,
  type TickResult,
  type TransportAdapter,
} from 'rollback-netcode';

// Note: rollback-netcode exports enums as type-only, so we define constants here
// for use in configuration.

/** Topology values for SessionConfig.topology */
export const TOPOLOGY = {
  MESH: 0,
  STAR: 1,
} as const;

/** DesyncAuthority values for SessionConfig.desyncAuthority */
export const DESYNC_AUTHORITY = {
  HOST: 0,
  PEER: 1,
} as const;

// SessionState values: 0=Disconnected, 1=Connecting, 2=Lobby, 3=Playing, 4=Paused

// =============================================================================
// Networking (Phase 4)
// =============================================================================

// Re-export the networking module for WebRTC-based multiplayer
export * from './networking';
