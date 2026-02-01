/**
 * Multiplayer Replay Playback
 *
 * Handles playback of multiplayer replays with multiple player input streams.
 * Separated from multiplayer-replay.ts for file size compliance.
 */

import { getComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { SIMULATION_SYSTEMS, TICK_SEC } from '../game';
import { InputPlayer } from '../input/input-recorder';
import { decodeRLE } from './compression';
import type { MultiplayerReplayData, MultiplayerReplayPlayer } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Per-player input stream for playback.
 */
interface PlayerInputStream {
  playerId: string;
  inputPlayer: InputPlayer;
  startTick: number;
  entityId: Entity | null;
}

// =============================================================================
// Multiplayer Replay Playback
// =============================================================================

/**
 * Playback controller for multiplayer replays.
 *
 * Extends the single-player playback concept to handle multiple players,
 * each with their own input stream and entity mapping.
 */
export class MultiplayerReplayPlayback {
  private readonly replay: MultiplayerReplayData;
  private world: World;
  private playerStreams: Map<string, PlayerInputStream> = new Map();
  private currentTick = 0;
  private readonly setupWorld: () => World;
  private readonly getPlayerEntity: (
    world: World,
    playerId: string,
  ) => Entity | null;

  // Seeking state (for viewer compatibility)
  private seekTarget: number | null = null;

  /**
   * Create a multiplayer replay playback controller.
   *
   * @param replay - The multiplayer replay data
   * @param setupWorld - Function to create/reset the world for playback
   * @param getPlayerEntity - Function to get entity ID for a player after world setup
   */
  constructor(
    replay: MultiplayerReplayData,
    setupWorld: () => World,
    getPlayerEntity: (world: World, playerId: string) => Entity | null,
  ) {
    this.replay = replay;
    this.setupWorld = setupWorld;
    this.getPlayerEntity = getPlayerEntity;
    this.world = setupWorld();
    this.initializePlayerStreams(getPlayerEntity);
  }

  /**
   * Initialize input streams for all players.
   */
  private initializePlayerStreams(
    getPlayerEntity: (world: World, playerId: string) => Entity | null,
  ): void {
    for (const playerInputs of this.replay.playerInputs) {
      // Decode RLE-compressed inputs if needed
      const inputs = playerInputs.inputsCompressed
        ? decodeRLE(playerInputs.inputs, true)
        : playerInputs.inputs;
      const inputPlayer = new InputPlayer(inputs);
      this.playerStreams.set(playerInputs.playerId, {
        playerId: playerInputs.playerId,
        inputPlayer,
        startTick: playerInputs.startTick,
        entityId: getPlayerEntity(this.world, playerInputs.playerId),
      });
    }
  }

  /**
   * Reinitialize world for seeking.
   */
  private reinitializeWorld(
    getPlayerEntity: (world: World, playerId: string) => Entity | null,
  ): void {
    this.world = this.setupWorld();
    this.currentTick = 0;

    // Re-map player entities
    for (const stream of this.playerStreams.values()) {
      stream.entityId = getPlayerEntity(this.world, stream.playerId);
    }
  }

  /**
   * Advance simulation by one tick.
   * Returns false if playback has ended.
   */
  tick(): boolean {
    if (this.currentTick >= this.replay.tickCount) {
      return false;
    }

    this.simulateTick();
    return true;
  }

  /**
   * Core simulation step - apply inputs from all players, run systems.
   */
  private simulateTick(): void {
    // Apply inputs from each active player
    for (const stream of this.playerStreams.values()) {
      // Check if player is active at this tick
      if (this.currentTick < stream.startTick) continue;

      // Check if player has left the mission
      const playerData = this.replay.players.find(
        (p) => p.playerId === stream.playerId,
      );
      if (
        playerData?.leaveTick != null &&
        this.currentTick >= playerData.leaveTick
      ) {
        continue;
      }

      // Apply input to player's entity
      const tickInStream = this.currentTick - stream.startTick;
      if (stream.entityId !== null) {
        const player = getComponent(
          this.world,
          stream.entityId,
          'playerControlled',
        );
        if (player) {
          stream.inputPlayer.applyInputForTick(tickInStream, player.input);
        }
      }
    }

    // Update game time
    this.world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SIMULATION_SYSTEMS) {
      system(this.world, TICK_SEC);
    }

    this.currentTick++;
  }

  /**
   * Seek to a specific tick (viewer compatible version).
   * Starts seeking and returns immediately. Use processSeek() to advance.
   */
  seekTo(targetTick: number): void {
    const clampedTarget = Math.max(
      0,
      Math.min(targetTick, this.replay.tickCount - 1),
    );

    if (clampedTarget === this.currentTick) return;

    // Reinitialize world and start seeking
    this.reinitializeWorld(this.getPlayerEntity);
    this.seekTarget = clampedTarget;
  }

  /**
   * Check if currently seeking.
   */
  isSeeking(): boolean {
    return this.seekTarget !== null;
  }

  /**
   * Process seeking in chunks (for smooth UI during seek).
   * @param ticksPerFrame - Number of ticks to process per call
   * @returns true if still seeking, false if done
   */
  processSeek(ticksPerFrame: number): boolean {
    if (this.seekTarget === null) return false;

    const targetTick = this.seekTarget;
    let ticksProcessed = 0;

    while (this.currentTick < targetTick && ticksProcessed < ticksPerFrame) {
      this.simulateTick();
      ticksProcessed++;
    }

    if (this.currentTick >= targetTick) {
      this.seekTarget = null;
      return false;
    }

    return true;
  }

  /**
   * Get the current world.
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get current tick.
   */
  getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Get total tick count.
   */
  getTotalTicks(): number {
    return this.replay.tickCount;
  }

  /**
   * Get the list of players in this replay.
   */
  getPlayers(): MultiplayerReplayPlayer[] {
    return this.replay.players;
  }

  /**
   * Get the host player ID.
   */
  getHostPlayerId(): string {
    return this.replay.hostPlayerId;
  }

  /**
   * Check if a player is active at the current tick.
   */
  isPlayerActive(playerId: string): boolean {
    const playerData = this.replay.players.find((p) => p.playerId === playerId);
    if (!playerData) return false;

    if (this.currentTick < playerData.joinTick) return false;
    if (
      playerData.leaveTick !== null &&
      this.currentTick >= playerData.leaveTick
    )
      return false;

    return true;
  }

  /**
   * Get entity ID for a player.
   */
  getPlayerEntityId(playerId: string): Entity | null {
    return this.playerStreams.get(playerId)?.entityId ?? null;
  }

  /**
   * Get all active player entity IDs at current tick.
   */
  getActivePlayerEntities(): Entity[] {
    const entities: Entity[] = [];
    for (const stream of this.playerStreams.values()) {
      if (this.isPlayerActive(stream.playerId) && stream.entityId !== null) {
        entities.push(stream.entityId);
      }
    }
    return entities;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Find player entity by player ID using the entity map.
 */
export function findPlayerEntityById(
  targetPlayerId: string,
  playerEntityMap: Map<string, Entity>,
): Entity | null {
  return playerEntityMap.get(targetPlayerId) ?? null;
}

/**
 * Create a player entity map from multiplayer replay player list.
 */
export function createPlayerEntityMapFromReplay(
  players: MultiplayerReplayPlayer[],
): Map<string, Entity> {
  const map = new Map<string, Entity>();
  for (const player of players) {
    map.set(player.playerId, player.shipEntityId);
  }
  return map;
}
