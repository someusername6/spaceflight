/**
 * Determinism Test Helpers
 *
 * Shared utilities for determinism tests.
 */

import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import {
  createMultiplayerWorld,
  createTestInput,
} from '../unit/test-utils.mjs';

export { createMultiplayerWorld, createTestInput };

/**
 * Generate deterministic inputs for a given tick.
 * Both players get similar but slightly different patterns.
 */
export function generateInputsForTick(tick) {
  // Host accelerates first 60 ticks, fires every 10 ticks
  const hostInput = createTestInput(tick < 60, tick % 10 === 0);

  // Guest accelerates first 80 ticks, fires every 15 ticks
  const guestInput = createTestInput(tick < 80, tick % 15 === 0);

  return { hostInput, guestInput };
}

/**
 * Run a synchronized multiplayer simulation.
 * Returns hashes at key points.
 */
export function runSyncedSimulation(seed, tickCount, captureInterval = 100) {
  const { world, hostEntity, guestEntity } = createMultiplayerWorld(seed);

  const hostPlayerId = asPlayerId('host');
  const guestPlayerId = asPlayerId('guest');

  const playerMap = new Map([
    [hostPlayerId, hostEntity],
    [guestPlayerId, guestEntity],
  ]);

  const adapter = new SpaceflightGameAdapter(world, playerMap);
  const hashes = new Map();

  for (let tick = 0; tick < tickCount; tick++) {
    const { hostInput, guestInput } = generateInputsForTick(tick);

    const inputs = new Map([
      [hostPlayerId, serializeInput(hostInput)],
      [guestPlayerId, serializeInput(guestInput)],
    ]);

    adapter.step(inputs);

    if (tick % captureInterval === 0 || tick === tickCount - 1) {
      hashes.set(tick, adapter.hash());
    }
  }

  return { world, adapter, hashes };
}
