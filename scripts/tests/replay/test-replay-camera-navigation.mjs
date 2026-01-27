/**
 * Replay Camera Navigation Tests
 *
 * Tests for camera entity navigation and mode switching.
 * Basic state tests are in test-replay-camera.mjs.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { createWorld } from '../../../src/core/ecs.ts';
import {
  CameraMode,
  createCameraState,
  nextEntity,
  prevEntity,
  resetToPlayer,
  toggleCameraMode,
  updateEntityList,
} from '../../../src/ui/screens/replay/replay-camera.ts';
import { createTestWorld } from './test-replay-camera.mjs';

// ============================================================================
// nextEntity Tests
// ============================================================================

describe('nextEntity', () => {
  it('cycles to next entity', () => {
    const { world, playerId, wingmanId } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    assert.strictEqual(state.targetEntity, playerId, 'Should start at player');

    nextEntity(state, world);

    assert.strictEqual(state.entityIndex, 1, 'Index should be 1');
    assert.strictEqual(state.targetEntity, wingmanId, 'Should target wingman');
  });

  it('wraps around at end of list', () => {
    const { world, playerId } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    // Move to last entity
    state.entityIndex = state.entityList.length - 1;
    state.targetEntity = state.entityList[state.entityIndex];

    nextEntity(state, world);

    assert.strictEqual(state.entityIndex, 0, 'Should wrap to 0');
    assert.strictEqual(state.targetEntity, playerId, 'Should target player');
  });

  it('switches from Free to Chase mode', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);
    state.mode = CameraMode.Free;

    nextEntity(state, world);

    assert.strictEqual(state.mode, CameraMode.Chase, 'Should switch to Chase');
  });

  it('resets orbit rotation on entity change', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    // Modify orbit rotation
    state.orbitRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

    nextEntity(state, world);

    // Check if rotation was reset to identity
    const identity = new THREE.Quaternion();
    assert.ok(
      state.orbitRotation.equals(identity),
      'Orbit rotation should be reset to identity',
    );
  });

  it('does nothing with empty entity list', () => {
    const world = createWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    nextEntity(state, world);

    assert.strictEqual(state.targetEntity, null, 'Should remain null');
    assert.strictEqual(state.entityIndex, 0, 'Index should remain 0');
  });
});

// ============================================================================
// prevEntity Tests
// ============================================================================

describe('prevEntity', () => {
  it('cycles to previous entity', () => {
    const { world, playerId, wingmanId } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    // Start at wingman
    state.entityIndex = 1;
    state.targetEntity = wingmanId;

    prevEntity(state, world);

    assert.strictEqual(state.entityIndex, 0, 'Index should be 0');
    assert.strictEqual(state.targetEntity, playerId, 'Should target player');
  });

  it('wraps around at start of list', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    // At player (index 0)
    prevEntity(state, world);

    assert.strictEqual(
      state.entityIndex,
      state.entityList.length - 1,
      'Should wrap to last',
    );
  });

  it('switches from Free to Chase mode', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);
    state.mode = CameraMode.Free;

    prevEntity(state, world);

    assert.strictEqual(state.mode, CameraMode.Chase, 'Should switch to Chase');
  });
});

// ============================================================================
// resetToPlayer Tests
// ============================================================================

describe('resetToPlayer', () => {
  it('resets to player entity', () => {
    const { world, playerId, enemyId } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    // Move away from player
    state.entityIndex = 2;
    state.targetEntity = enemyId;
    state.mode = CameraMode.Free;
    state.roll = 0.5;

    resetToPlayer(state, world);

    assert.strictEqual(state.mode, CameraMode.Chase, 'Should be in Chase mode');
    assert.strictEqual(state.entityIndex, 0, 'Index should be 0');
    assert.strictEqual(state.targetEntity, playerId, 'Should target player');
    assert.strictEqual(state.roll, 0, 'Roll should be reset');
  });

  it('resets orbit rotation', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    state.orbitRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

    resetToPlayer(state, world);

    const identity = new THREE.Quaternion();
    assert.ok(state.orbitRotation.equals(identity), 'Should reset to identity');
  });
});

// ============================================================================
// toggleCameraMode Tests
// ============================================================================

describe('toggleCameraMode', () => {
  it('cycles Chase -> Orbit -> Free -> Chase', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    assert.strictEqual(state.mode, CameraMode.Chase, 'Should start in Chase');

    toggleCameraMode(state, world);
    assert.strictEqual(state.mode, CameraMode.Orbit, 'Should be Orbit');

    toggleCameraMode(state, world);
    assert.strictEqual(state.mode, CameraMode.Free, 'Should be Free');

    toggleCameraMode(state, world);
    assert.strictEqual(state.mode, CameraMode.Chase, 'Should be back to Chase');
  });

  it('initializes free camera position when entering Free mode', () => {
    const { world } = createTestWorld();
    const state = createCameraState();
    updateEntityList(state, world);

    // Toggle to Orbit, then Free
    toggleCameraMode(state, world);
    toggleCameraMode(state, world);

    assert.strictEqual(state.mode, CameraMode.Free, 'Should be in Free mode');
    // Free position should be initialized (not at origin)
    const hasPosition =
      state.freePosition.x !== 0 ||
      state.freePosition.y !== 0 ||
      state.freePosition.z !== 0;
    assert.ok(hasPosition, 'Free position should be initialized');
  });
});
