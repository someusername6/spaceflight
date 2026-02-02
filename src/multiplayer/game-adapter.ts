/**
 * Game Adapter - Implements rollback-netcode's Game interface for spaceflight.
 *
 * This adapter bridges the spaceflight ECS simulation with the rollback-netcode
 * library, enabling deterministic networked multiplayer.
 *
 * Key responsibilities:
 * - World state serialization/deserialization for snapshots
 * - State hashing for desync detection
 * - Stepping the simulation with per-player inputs
 */

import type { Game, PlayerId } from 'rollback-netcode';

import { getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { SIMULATION_SYSTEMS, TICK_SEC } from '../game';
import { applyDecodedInput } from '../input/input-encoding';
import type { MultiplayerInputRecorder } from '../replay/multiplayer-replay';
import {
  computeWorldHash,
  deserializeWorldFromBytes,
  serializeWorldToBytes,
} from '../serialization';

/**
 * Adapter that implements the rollback-netcode Game interface for spaceflight.
 *
 * The adapter manages:
 * - A reference to the World being simulated
 * - A mapping from PlayerId to Entity for input routing
 */
export class SpaceflightGameAdapter implements Game<Uint8Array> {
  private world: World;
  private playerEntityMap: Map<PlayerId, Entity>;
  private inputRecorder: MultiplayerInputRecorder | null = null;
  private debug: boolean;

  /**
   * Create a new game adapter.
   *
   * @param world - The ECS world to simulate
   * @param playerEntityMap - Map from player IDs to their controlled entities
   * @param debug - Enable debug logging for troubleshooting
   */
  constructor(
    world: World,
    playerEntityMap: Map<PlayerId, Entity>,
    debug = false,
  ) {
    this.world = world;
    this.playerEntityMap = playerEntityMap;
    this.debug = debug;
  }

  /**
   * Get the current world reference.
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get the current player-to-entity mapping.
   */
  getPlayerEntityMap(): Map<PlayerId, Entity> {
    return this.playerEntityMap;
  }

  /**
   * Update the player-to-entity mapping.
   * Call this when players join or their ships change.
   */
  setPlayerEntityMap(map: Map<PlayerId, Entity>): void {
    this.playerEntityMap = map;
  }

  /**
   * Set the input recorder for multiplayer replay support.
   * When set, all player inputs are recorded each tick.
   */
  setInputRecorder(recorder: MultiplayerInputRecorder | null): void {
    this.inputRecorder = recorder;
  }

  /**
   * Get the current input recorder.
   */
  getInputRecorder(): MultiplayerInputRecorder | null {
    return this.inputRecorder;
  }

  /**
   * Serialize the current world state to bytes for snapshot storage.
   */
  serialize(): Uint8Array {
    return serializeWorldToBytes(this.world);
  }

  /**
   * Restore world state from a snapshot.
   * This is called during rollback to restore a previous state.
   */
  deserialize(data: Uint8Array): void {
    deserializeWorldFromBytes(data, this.world);
  }

  /**
   * Advance the simulation by one tick with the given inputs.
   *
   * In multiplayer, this replaces the normal inputSystem - inputs are applied
   * directly to each player's entity based on the network-provided inputs map.
   *
   * @param inputs - Map of player ID to their serialized input for this tick
   */
  step(inputs: Map<PlayerId, Uint8Array>): void {
    // 1. Apply each player's input to their entity
    // Also record inputs if recorder is active
    const inputBits: Map<PlayerId, number> = new Map();

    for (const [playerId, inputBytes] of inputs) {
      const entity = this.playerEntityMap.get(playerId);
      if (entity !== undefined) {
        this.applyInputToEntity(entity, inputBytes);
      }

      // Decode bits for recording
      if (this.inputRecorder && inputBytes.length >= 4) {
        const bits = new DataView(
          inputBytes.buffer,
          inputBytes.byteOffset,
        ).getUint32(0, true);
        inputBits.set(playerId, bits);
      }
    }

    // Record inputs if recorder is active
    if (this.inputRecorder) {
      this.inputRecorder.recordInputs(inputBits);
    }

    // 2. Advance game time
    this.world.systemState.gameTime += TICK_SEC;

    // 3. Run simulation systems (without inputSystem - inputs already applied)
    for (const system of SIMULATION_SYSTEMS) {
      system(this.world, TICK_SEC);
    }
  }

  /**
   * Compute a deterministic hash of the current world state.
   * Used for desync detection between players.
   */
  hash(): number {
    return computeWorldHash(this.world);
  }

  /**
   * Apply serialized input bytes to a player-controlled entity.
   */
  private applyInputToEntity(entity: Entity, inputBytes: Uint8Array): void {
    const player = getComponent(this.world, entity, 'playerControlled');
    if (!player) {
      if (this.debug) {
        console.warn(`[GameAdapter] Entity ${entity} missing playerControlled`);
      }
      return;
    }

    // Decode network input bits and apply to player's input state
    if (inputBytes.length < 4) {
      if (this.debug) {
        console.warn(
          `[GameAdapter] Input too short: ${inputBytes.length} bytes`,
        );
      }
      return;
    }
    const bits = new DataView(
      inputBytes.buffer,
      inputBytes.byteOffset,
    ).getUint32(0, true);
    applyDecodedInput(player.input, bits);
  }
}

/**
 * Create a game adapter from a world, automatically discovering player entities.
 *
 * This scans for all playerControlled entities and creates a mapping.
 * For single-player, there's typically one entity.
 * For multiplayer, additional mappings must be added via setPlayerEntityMap.
 *
 * @param world - The ECS world
 * @param localPlayerId - The local player's ID
 * @param debug - Enable debug logging for troubleshooting
 * @returns A new SpaceflightGameAdapter
 */
export function createGameAdapter(
  world: World,
  localPlayerId: PlayerId,
  debug = false,
): SpaceflightGameAdapter {
  const playerEntityMap = new Map<PlayerId, Entity>();

  // Find player-controlled entities
  for (const entity of queryEntities(world, ['playerControlled'])) {
    // In initial setup, assign the first player entity to the local player
    if (!playerEntityMap.has(localPlayerId)) {
      playerEntityMap.set(localPlayerId, entity);
    }
    // Additional player mappings will be set via setPlayerEntityMap
  }

  return new SpaceflightGameAdapter(world, playerEntityMap, debug);
}
