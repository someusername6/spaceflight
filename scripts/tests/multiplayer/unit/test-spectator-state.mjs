/**
 * Spectator State Unit Tests
 *
 * Tests for spectator mode state management.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  clearSpectatorState,
  getSpectatorState,
  initSpectatorState,
  isSpectating,
} from '../../../../src/multiplayer/spectator-state.ts';
import { CameraMode } from '../../../../src/ui/screens/replay/replay-camera.ts';

// =============================================================================
// Tests: SpectatorState Lifecycle
// =============================================================================

describe('Spectator State - Lifecycle', () => {
  it('returns null when not spectating', () => {
    clearSpectatorState();
    const state = getSpectatorState();
    assert.strictEqual(state, null);
  });

  it('isSpectating returns false when not initialized', () => {
    clearSpectatorState();
    assert.strictEqual(isSpectating(), false);
  });

  it('initializes spectator state', () => {
    clearSpectatorState();
    const state = initSpectatorState(null);

    assert.ok(state);
    assert.strictEqual(state.isActive, true);
    assert.strictEqual(state.localPlayerEntity, null);
    assert.ok(state.cameraState);
    assert.ok(state.cameraInput);
  });

  it('isSpectating returns true after init', () => {
    clearSpectatorState();
    initSpectatorState(null);
    assert.strictEqual(isSpectating(), true);
  });

  it('getSpectatorState returns same instance after init', () => {
    clearSpectatorState();
    const state1 = initSpectatorState(null);
    const state2 = getSpectatorState();
    assert.strictEqual(state1, state2);
  });

  it('clearSpectatorState removes state', () => {
    clearSpectatorState();
    initSpectatorState(null);
    assert.ok(getSpectatorState());

    clearSpectatorState();
    assert.strictEqual(getSpectatorState(), null);
    assert.strictEqual(isSpectating(), false);
  });

  it('stores localPlayerEntity when provided', () => {
    clearSpectatorState();
    const mockEntity = 42;
    const state = initSpectatorState(mockEntity);

    assert.strictEqual(state.localPlayerEntity, mockEntity);
  });
});

// =============================================================================
// Tests: Camera State Initialization
// =============================================================================

describe('Spectator State - Camera State', () => {
  it('initializes camera state with default values', () => {
    clearSpectatorState();
    const state = initSpectatorState(null);

    assert.strictEqual(state.cameraState.mode, CameraMode.Chase);
    assert.strictEqual(state.cameraState.targetEntity, null);
    assert.deepStrictEqual(state.cameraState.entityList, []);
    assert.strictEqual(state.cameraState.entityIndex, 0);
  });

  it('initializes camera input with all false', () => {
    clearSpectatorState();
    const state = initSpectatorState(null);
    const { cameraInput } = state;

    assert.strictEqual(cameraInput.up, false);
    assert.strictEqual(cameraInput.down, false);
    assert.strictEqual(cameraInput.left, false);
    assert.strictEqual(cameraInput.right, false);
    assert.strictEqual(cameraInput.forward, false);
    assert.strictEqual(cameraInput.back, false);
    assert.strictEqual(cameraInput.rollLeft, false);
    assert.strictEqual(cameraInput.rollRight, false);
    assert.strictEqual(cameraInput.zoomIn, false);
    assert.strictEqual(cameraInput.zoomOut, false);
  });
});

// =============================================================================
// Tests: Re-initialization
// =============================================================================

describe('Spectator State - Re-initialization', () => {
  it('replaces previous state on re-init', () => {
    clearSpectatorState();
    const state1 = initSpectatorState(1);
    const state2 = initSpectatorState(2);

    assert.notStrictEqual(state1, state2);
    assert.strictEqual(getSpectatorState(), state2);
    assert.strictEqual(state2.localPlayerEntity, 2);
  });
});
