/**
 * Replay Camera State Tests
 *
 * Tests for basic camera state management in the replay viewer.
 * Entity navigation tests are in test-replay-camera-navigation.mjs.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { createWorld } from '../../../src/core/ecs.ts';
import {
  CameraMode,
  createCameraState,
  updateEntityList,
} from '../../../src/ui/screens/replay/replay-camera.ts';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal world with test entities.
 */
export function createTestWorld() {
  const world = createWorld();

  // Helper to create entity with components
  function addEntity(components) {
    const id = world.nextEntityId++;
    world.entities.add(id);
    const componentMap = new Map();
    for (const [type, data] of Object.entries(components)) {
      componentMap.set(type, { type, ...data });
    }
    world.components.set(id, componentMap);
    return id;
  }

  // Create player entity
  const playerId = addEntity({
    playerControlled: { autoaimStrength: 1 },
    transform: {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
    },
    shipIdentity: {
      callsign: 'Player',
      faction: 'player',
      shipClass: 'fighter',
      isCommander: true,
    },
  });

  // Create wingman entity
  const wingmanId = addEntity({
    transform: {
      position: new THREE.Vector3(100, 0, 0),
      rotation: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
    },
    shipIdentity: {
      callsign: 'Wingman 1',
      faction: 'player',
      shipClass: 'fighter',
      isCommander: false,
    },
  });

  // Create enemy entity
  const enemyId = addEntity({
    transform: {
      position: new THREE.Vector3(-100, 0, 0),
      rotation: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
    },
    shipIdentity: {
      callsign: 'Enemy 1',
      faction: 'enemy',
      shipClass: 'fighter',
      isCommander: false,
    },
  });

  return { world, playerId, wingmanId, enemyId };
}

// ============================================================================
// createCameraState Tests
// ============================================================================

describe('createCameraState', () => {
  it('creates state with default values', () => {
    const state = createCameraState();

    assert.strictEqual(
      state.mode,
      CameraMode.Chase,
      'Should start in Chase mode',
    );
    assert.strictEqual(
      state.targetEntity,
      null,
      'Should have no target initially',
    );
    assert.deepStrictEqual(
      state.entityList,
      [],
      'Should have empty entity list',
    );
    assert.strictEqual(state.entityIndex, 0, 'Should start at index 0');
    assert.ok(
      state.orbitRotation instanceof THREE.Quaternion,
      'Should have orbit rotation',
    );
    assert.ok(
      state.freePosition instanceof THREE.Vector3,
      'Should have free position',
    );
    assert.ok(
      state.freeRotation instanceof THREE.Quaternion,
      'Should have free rotation',
    );
    assert.strictEqual(state.roll, 0, 'Should start with no roll');
  });

  it('creates independent state objects', () => {
    const state1 = createCameraState();
    const state2 = createCameraState();

    state1.mode = CameraMode.Free;
    state1.entityIndex = 5;

    assert.strictEqual(
      state2.mode,
      CameraMode.Chase,
      'States should be independent',
    );
    assert.strictEqual(state2.entityIndex, 0, 'States should be independent');
  });
});

// ============================================================================
// updateEntityList Tests
// ============================================================================

describe('updateEntityList', () => {
  it('populates entity list from world', () => {
    const { world, playerId } = createTestWorld();
    const state = createCameraState();

    updateEntityList(state, world);

    assert.strictEqual(state.entityList.length, 3, 'Should find 3 entities');
    assert.strictEqual(state.entityList[0], playerId, 'Player should be first');
    assert.strictEqual(state.targetEntity, playerId, 'Should target player');
    assert.strictEqual(state.entityIndex, 0, 'Index should be 0');
  });

  it('sets first entity as target when no target exists', () => {
    const { world, playerId } = createTestWorld();
    const state = createCameraState();

    assert.strictEqual(state.targetEntity, null, 'No target initially');

    updateEntityList(state, world);

    assert.strictEqual(
      state.targetEntity,
      playerId,
      'Should set player as target',
    );
  });

  it('preserves valid target entity', () => {
    const { world, wingmanId } = createTestWorld();
    const state = createCameraState();

    // First update to populate
    updateEntityList(state, world);

    // Manually set target to wingman
    state.targetEntity = wingmanId;
    state.entityIndex = 1;

    // Update again
    updateEntityList(state, world);

    assert.strictEqual(
      state.targetEntity,
      wingmanId,
      'Should preserve wingman target',
    );
  });

  it('clears target when entity is destroyed', () => {
    const { world, wingmanId } = createTestWorld();
    const state = createCameraState();

    updateEntityList(state, world);
    state.targetEntity = wingmanId;
    state.entityIndex = 1;

    // Remove wingman from world
    world.entities.delete(wingmanId);

    updateEntityList(state, world);

    assert.strictEqual(
      state.targetEntity,
      null,
      'Should clear destroyed target',
    );
  });

  it('handles empty world', () => {
    const world = createWorld();
    const state = createCameraState();

    updateEntityList(state, world);

    assert.deepStrictEqual(state.entityList, [], 'Should have empty list');
    assert.strictEqual(state.targetEntity, null, 'Should have no target');
  });
});

// ============================================================================
// CameraMode Enum Tests
// ============================================================================

describe('CameraMode', () => {
  it('has expected values', () => {
    assert.strictEqual(CameraMode.Chase, 0, 'Chase should be 0');
    assert.strictEqual(CameraMode.Orbit, 1, 'Orbit should be 1');
    assert.strictEqual(CameraMode.Free, 2, 'Free should be 2');
  });
});
