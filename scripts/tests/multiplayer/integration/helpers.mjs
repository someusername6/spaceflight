/**
 * Integration Test Helpers
 *
 * Shared utilities for multiplayer integration tests.
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld } from '../../../../src/core/ecs.ts';
import { Faction } from '../../../../src/core/types.ts';
import {
  createAIShip,
  createPlayerShip,
} from '../../../../src/factories/ship.ts';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { MultiplayerInputRecorder } from '../../../../src/replay/multiplayer-replay.ts';
import { initCombatStats } from '../../shared/combat-utils.mjs';
import { createTestInput } from '../unit/test-utils.mjs';

export { createTestInput };

/**
 * Create a multiplayer world with N player ships.
 */
export function createNPlayerWorld(seed, playerCount) {
  const world = createWorld(seed);
  initCombatStats(world);

  const playerEntities = [];
  const spacing = 100;

  for (let i = 0; i < playerCount; i++) {
    const pos = new Vector3(i * spacing, 0, 0);
    const entity = createPlayerShip(world, 'fighter', pos, new Quaternion());
    playerEntities.push(entity);
  }

  // Add some enemies
  const enemyRot = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  for (let i = 0; i < 3; i++) {
    createAIShip(
      world,
      'fighter',
      Faction.Enemy,
      new Vector3(i * 50 - 50, 0, -1500),
      enemyRot,
      'regular',
    );
  }

  return { world, playerEntities };
}

/**
 * Generate inputs for a player at a given tick.
 */
export function generatePlayerInput(playerId, tick) {
  // Different patterns per player
  const playerNum = parseInt(playerId.replace('player-', ''), 10) || 0;
  const accelerate = tick < 60 + playerNum * 20;
  const fire = (tick + playerNum * 3) % 10 === 0;
  return createTestInput(accelerate, fire);
}

/**
 * Simulate a game session with multiple players.
 * Returns metrics and final state.
 */
export function simulateSession(seed, playerIds, tickCount, options = {}) {
  const { world, playerEntities } = createNPlayerWorld(seed, playerIds.length);

  const playerMap = new Map();
  playerIds.forEach((id, i) => {
    playerMap.set(asPlayerId(id), playerEntities[i]);
  });

  const adapter = new SpaceflightGameAdapter(world, playerMap);

  // Optional: set up recorder
  let recorder = null;
  if (options.record) {
    recorder = new MultiplayerInputRecorder(seed, 'test-mission');
    for (const id of playerIds) {
      recorder.addPlayer(asPlayerId(id));
    }
    adapter.setInputRecorder(recorder);
  }

  const hashes = [];
  const events = [];

  for (let tick = 0; tick < tickCount; tick++) {
    // Handle mid-session events
    if (options.disconnectAt && tick === options.disconnectAt.tick) {
      const playerId = asPlayerId(options.disconnectAt.playerId);
      if (recorder) {
        recorder.removePlayer(playerId);
      }
      events.push({ type: 'disconnect', playerId, tick });
    }

    // Build inputs for this tick
    const inputs = new Map();
    for (const id of playerIds) {
      const playerId = asPlayerId(id);

      // Skip disconnected players
      const disconnected = events.some(
        (e) => e.type === 'disconnect' && e.playerId === id && e.tick <= tick,
      );
      if (disconnected) {
        // Use empty input for disconnected players
        inputs.set(playerId, serializeInput(createTestInput(false, false)));
      } else {
        inputs.set(playerId, serializeInput(generatePlayerInput(id, tick)));
      }
    }

    adapter.step(inputs);

    if (tick % 100 === 0) {
      hashes.push({ tick, hash: adapter.hash() });
    }
  }

  return {
    world,
    adapter,
    hashes,
    events,
    recorder,
    finalHash: adapter.hash(),
  };
}
