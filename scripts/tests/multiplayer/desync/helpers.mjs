/**
 * Desync Test Helpers
 *
 * Shared utilities for desync detection and recovery tests.
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
 * Generate deterministic inputs.
 */
export function generateInputsForTick(tick) {
  const hostInput = createTestInput(tick < 60, tick % 10 === 0);
  const guestInput = createTestInput(tick < 80, tick % 15 === 0);
  return { hostInput, guestInput };
}

/**
 * Create adapters for host and guest simulation.
 */
export function createHostGuestAdapters(seed) {
  const {
    world: hostWorld,
    hostEntity: hostPlayerEntity,
    guestEntity: hostGuestEntity,
  } = createMultiplayerWorld(seed);

  const {
    world: guestWorld,
    hostEntity: guestHostEntity,
    guestEntity: guestPlayerEntity,
  } = createMultiplayerWorld(seed);

  const hostPlayerId = asPlayerId('host');
  const guestPlayerId = asPlayerId('guest');

  const hostAdapter = new SpaceflightGameAdapter(
    hostWorld,
    new Map([
      [hostPlayerId, hostPlayerEntity],
      [guestPlayerId, hostGuestEntity],
    ]),
  );

  const guestAdapter = new SpaceflightGameAdapter(
    guestWorld,
    new Map([
      [hostPlayerId, guestHostEntity],
      [guestPlayerId, guestPlayerEntity],
    ]),
  );

  return {
    hostWorld,
    guestWorld,
    hostAdapter,
    guestAdapter,
    hostPlayerId,
    guestPlayerId,
  };
}

/**
 * Run both adapters with identical inputs for N ticks.
 */
export function stepBothAdapters(
  hostAdapter,
  guestAdapter,
  hostPlayerId,
  guestPlayerId,
  tickCount,
) {
  for (let tick = 0; tick < tickCount; tick++) {
    const { hostInput, guestInput } = generateInputsForTick(tick);
    const inputs = new Map([
      [hostPlayerId, serializeInput(hostInput)],
      [guestPlayerId, serializeInput(guestInput)],
    ]);

    hostAdapter.step(inputs);
    guestAdapter.step(inputs);
  }
}
