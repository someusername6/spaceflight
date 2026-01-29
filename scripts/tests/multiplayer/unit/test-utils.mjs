/**
 * Shared utilities for multiplayer tests.
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../../src/core/ecs.ts';
import { Faction } from '../../../../src/core/types.ts';
import {
  createAIShip,
  createPlayerShip,
} from '../../../../src/factories/ship.ts';
import { initCombatStats } from '../../shared/combat-utils.mjs';

/**
 * Create a test world with player and enemy ships.
 */
export function createTestWorld(seed = 12345) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Create player ship
  const playerPos = new Vector3(0, 0, 0);
  const playerRot = new Quaternion();
  const playerEntity = createPlayerShip(world, 'fighter', playerPos, playerRot);

  // Create enemy ships
  const enemyRot = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  createAIShip(
    world,
    'fighter',
    Faction.Enemy,
    new Vector3(50, 0, -1500),
    enemyRot,
    'regular',
  );

  return { world, playerEntity };
}

/**
 * Create a multiplayer test world with two player ships.
 * Both players are in the same world, each with their own ship.
 *
 * @returns world and entities for host player and guest player
 */
export function createMultiplayerWorld(seed = 12345) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Create host's ship
  const hostEntity = createPlayerShip(
    world,
    'fighter',
    new Vector3(0, 0, 0),
    new Quaternion(),
  );

  // Create guest's ship
  const guestEntity = createPlayerShip(
    world,
    'fighter',
    new Vector3(100, 0, 0),
    new Quaternion(),
  );

  // Create an enemy for some action
  const enemyRot = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  createAIShip(
    world,
    'fighter',
    Faction.Enemy,
    new Vector3(50, 0, -1500),
    enemyRot,
    'regular',
  );

  return { world, hostEntity, guestEntity };
}

/**
 * Create a simple input state for testing.
 */
export function createTestInput(accelerate = false, firePrimary = false) {
  return {
    pitchUp: false,
    pitchDown: false,
    yawLeft: false,
    yawRight: false,
    rollLeft: false,
    rollRight: false,
    accelerate,
    decelerate: false,
    afterburner: false,
    firePrimary,
    fireSecondary: false,
    launchDecoy: false,
    cyclePrimary: false,
    cycleSecondary: false,
    cycleTargetNext: false,
    cycleTargetPrev: false,
    targetNearest: false,
    toggleMatchSpeed: false,
  };
}

/**
 * Helper to get transport from map with assertion.
 */
export function getTransport(transports, peerId) {
  const transport = transports.get(peerId);
  if (!transport) {
    throw new Error(`Transport for ${peerId} should exist`);
  }
  return transport;
}

/**
 * Helper to advance time and flush all transports for message propagation.
 * Uses tick() with time to ensure the session's internal timing works correctly.
 */
export function tickAll(transports, deltaMs = 16) {
  for (const t of transports.values()) {
    t.tick(deltaMs);
  }
}

export { getComponent };
