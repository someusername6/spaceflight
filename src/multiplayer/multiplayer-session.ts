/**
 * Multiplayer Session - High-level wrapper for rollback-netcode sessions.
 *
 * Provides a spaceflight-specific API for multiplayer, handling:
 * - Session creation and management
 * - Input capture and serialization
 * - World state synchronization
 * - Rollback integration
 */

import type {
  CreateSessionOptions,
  PlayerId,
  Session,
  SessionConfig,
  SessionEvents,
  SessionState,
  TickResult,
  TransportAdapter,
} from 'rollback-netcode';
import { asPlayerId, createSession } from 'rollback-netcode';

import type { Entity, InputState, World } from '../core/types';
import { SpaceflightGameAdapter } from './game-adapter';
import { serializeInput } from './input-format';

/**
 * Options for creating a multiplayer session.
 */
export interface MultiplayerSessionOptions {
  /** The ECS world to synchronize */
  world: World;

  /** Network transport adapter */
  transport: TransportAdapter;

  /** Local player's unique identifier */
  localPlayerId: string;

  /** Whether this player is the host */
  isHost: boolean;

  /** Map from player IDs to their controlled entities */
  playerEntityMap: Map<PlayerId, Entity>;

  /** Optional session configuration overrides */
  config?: Partial<SessionConfig>;
}

/**
 * Multiplayer session wrapper for spaceflight.
 *
 * Orchestrates the rollback-netcode session with spaceflight's ECS world,
 * providing a clean API for multiplayer gameplay.
 */
export class MultiplayerSession {
  /** The underlying rollback-netcode session */
  readonly session: Session;

  /** The game adapter implementing the rollback interface */
  readonly gameAdapter: SpaceflightGameAdapter;

  /** Local player's ID */
  readonly localPlayerId: PlayerId;

  /** Whether this session is the host */
  private _isHost: boolean;

  /**
   * Create a new multiplayer session.
   */
  constructor(options: MultiplayerSessionOptions) {
    const localPlayerId = asPlayerId(options.localPlayerId);
    this.localPlayerId = localPlayerId;
    this._isHost = options.isHost;

    // Create the game adapter
    this.gameAdapter = new SpaceflightGameAdapter(
      options.world,
      options.playerEntityMap,
    );

    // Create the session
    const sessionOptions: CreateSessionOptions = {
      game: this.gameAdapter,
      transport: options.transport,
      localPlayerId,
      ...(options.config && { config: options.config }),
    };
    this.session = createSession(sessionOptions);
  }

  /**
   * Whether this session is the host.
   */
  get isHost(): boolean {
    return this._isHost;
  }

  /**
   * Current session state.
   */
  get state(): SessionState {
    return this.session.state;
  }

  /**
   * Current simulation tick.
   */
  get currentTick(): number {
    return this.session.currentTick;
  }

  /**
   * Last confirmed tick (all inputs verified).
   */
  get confirmedTick(): number {
    return this.session.confirmedTick;
  }

  /**
   * Get the world being synchronized.
   */
  getWorld(): World {
    return this.gameAdapter.getWorld();
  }

  /**
   * Update the player-to-entity mapping.
   * Call this when new players join or entities change.
   */
  setPlayerEntityMap(map: Map<PlayerId, Entity>): void {
    this.gameAdapter.setPlayerEntityMap(map);
  }

  /**
   * Create a room and become the host.
   *
   * @returns The room ID for others to join
   */
  async createRoom(): Promise<string> {
    const roomId = await this.session.createRoom();
    this._isHost = true;
    return roomId;
  }

  /**
   * Join an existing room.
   *
   * @param roomId - The room ID to join
   * @param hostPeerId - The host's peer ID
   */
  async joinRoom(roomId: string, hostPeerId: string): Promise<void> {
    await this.session.joinRoom(roomId, hostPeerId);
    this._isHost = false;
  }

  /**
   * Leave the current room.
   */
  leaveRoom(): void {
    this.session.leaveRoom();
  }

  /**
   * Start the game (host only).
   */
  start(): void {
    if (!this._isHost) {
      throw new Error('Only the host can start the game');
    }
    this.session.start();
  }

  /**
   * Advance the simulation by one tick with local input.
   *
   * @param localInput - The local player's input state for this tick
   * @returns Result containing rollback information
   */
  tick(localInput: InputState): TickResult {
    const inputBytes = serializeInput(localInput);
    return this.session.tick(inputBytes);
  }

  /**
   * Register an event handler for session events.
   */
  on<E extends keyof SessionEvents>(event: E, handler: SessionEvents[E]): void {
    this.session.on(event, handler);
  }

  /**
   * Remove an event handler.
   */
  off<E extends keyof SessionEvents>(
    event: E,
    handler: SessionEvents[E],
  ): void {
    this.session.off(event, handler);
  }

  /**
   * Request state synchronization from the host (for desync recovery).
   */
  requestSync(): void {
    this.session.requestSync();
  }

  /**
   * Destroy the session and clean up resources.
   */
  destroy(): void {
    this.session.destroy();
  }

  // ===========================================================================
  // Pause/Resume (convenience methods that delegate to session)
  // ===========================================================================

  /**
   * Pause the game simulation.
   * Note: Actual pause state coordination is handled by PauseCoordinator.
   * This is a low-level method for the underlying session.
   */
  pause(): void {
    // The rollback-netcode session may have a pause method
    // If not available, pausing is handled at the game level
    if ('pause' in this.session && typeof this.session.pause === 'function') {
      (this.session as { pause: () => void }).pause();
    }
  }

  /**
   * Resume the game simulation (host only).
   * Note: Actual resume coordination is handled by PauseCoordinator.
   */
  resume(): void {
    if (!this._isHost) return;
    if ('resume' in this.session && typeof this.session.resume === 'function') {
      (this.session as { resume: () => void }).resume();
    }
  }

  /**
   * Check if session supports pause/resume.
   */
  get supportsPause(): boolean {
    return 'pause' in this.session && typeof this.session.pause === 'function';
  }
}

/**
 * Create a multiplayer session.
 *
 * @param options - Session configuration options
 * @returns A new MultiplayerSession
 */
export function createMultiplayerSession(
  options: MultiplayerSessionOptions,
): MultiplayerSession {
  return new MultiplayerSession(options);
}

/**
 * Create a multiplayer session with automatic player entity discovery.
 *
 * This is a convenience function that creates a session and automatically
 * maps the local player to the first player-controlled entity found.
 *
 * @param world - The ECS world
 * @param transport - Network transport
 * @param localPlayerId - Local player's ID
 * @param isHost - Whether this player is the host
 * @param config - Optional session config
 * @returns A new MultiplayerSession
 */
export function createMultiplayerSessionAuto(
  world: World,
  transport: TransportAdapter,
  localPlayerId: string,
  isHost: boolean,
  config?: Partial<SessionConfig>,
): MultiplayerSession {
  const playerId = asPlayerId(localPlayerId);

  // Create a simple map with the local player
  const playerEntityMap = new Map<PlayerId, Entity>();

  // Find first player-controlled entity
  for (const entityId of world.entities) {
    const components = world.components.get(entityId);
    if (components?.has('playerControlled')) {
      playerEntityMap.set(playerId, entityId);
      break;
    }
  }

  return new MultiplayerSession({
    world,
    transport,
    localPlayerId,
    isHost,
    playerEntityMap,
    ...(config && { config }),
  });
}
