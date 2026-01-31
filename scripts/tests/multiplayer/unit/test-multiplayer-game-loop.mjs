/**
 * Unit tests for multiplayer-game-loop.ts
 *
 * Tests the state management functions for the multiplayer game loop.
 * Note: The actual loop uses requestAnimationFrame and is tested via E2E tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  createMultiplayerGameState,
  pauseMultiplayerGameLoop,
  resumeMultiplayerGameLoop,
  stopMultiplayerGameLoop,
} from '../../../../src/multiplayer/multiplayer-game-loop.ts';
import { MissionResult } from '../../../../src/systems/mission.ts';

// =============================================================================
// Mock MultiplayerSession
// =============================================================================

/**
 * Create a minimal mock session for testing state management.
 * Real session behavior is tested via E2E tests.
 */
function createMockSession() {
  return {
    tick: () => {},
    getWorld: () => ({ entities: new Map() }),
    destroy: () => {},
  };
}

// =============================================================================
// Tests: createMultiplayerGameState
// =============================================================================

describe('multiplayer-game-loop', () => {
  describe('createMultiplayerGameState', () => {
    it('creates state with session reference', () => {
      const session = createMockSession();
      const state = createMultiplayerGameState(session);

      assert.strictEqual(state.session, session);
    });

    it('initializes running as false', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.running, false);
    });

    it('initializes paused as false', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.paused, false);
    });

    it('initializes accumulator as 0', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.accumulator, 0);
    });

    it('initializes lastTime as 0', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.lastTime, 0);
    });

    it('initializes lastRenderTime as 0', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.lastRenderTime, 0);
    });

    it('initializes lastNotifiedResult as InProgress', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.lastNotifiedResult, MissionResult.InProgress);
    });

    it('does not set optional callbacks', () => {
      const state = createMultiplayerGameState(createMockSession());
      assert.strictEqual(state.onTick, undefined);
      assert.strictEqual(state.onRender, undefined);
      assert.strictEqual(state.onMissionEnd, undefined);
    });
  });

  // ===========================================================================
  // Tests: stopMultiplayerGameLoop
  // ===========================================================================

  describe('stopMultiplayerGameLoop', () => {
    it('sets running to false', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.running = true;

      stopMultiplayerGameLoop(state);

      assert.strictEqual(state.running, false);
    });

    it('is idempotent', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.running = false;

      stopMultiplayerGameLoop(state);

      assert.strictEqual(state.running, false);
    });
  });

  // ===========================================================================
  // Tests: pauseMultiplayerGameLoop
  // ===========================================================================

  describe('pauseMultiplayerGameLoop', () => {
    it('sets paused to true', () => {
      const state = createMultiplayerGameState(createMockSession());

      pauseMultiplayerGameLoop(state);

      assert.strictEqual(state.paused, true);
    });

    it('does not affect running state', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.running = true;

      pauseMultiplayerGameLoop(state);

      assert.strictEqual(state.running, true);
    });
  });

  // ===========================================================================
  // Tests: resumeMultiplayerGameLoop
  // ===========================================================================

  describe('resumeMultiplayerGameLoop', () => {
    it('sets paused to false', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.paused = true;

      resumeMultiplayerGameLoop(state);

      assert.strictEqual(state.paused, false);
    });

    it('resets lastTime to 0', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.paused = true;
      state.lastTime = 12345;

      resumeMultiplayerGameLoop(state);

      assert.strictEqual(state.lastTime, 0);
    });

    it('does not affect running state', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.running = true;
      state.paused = true;

      resumeMultiplayerGameLoop(state);

      assert.strictEqual(state.running, true);
    });
  });

  // ===========================================================================
  // Tests: State transitions
  // ===========================================================================

  describe('state transitions', () => {
    it('pause then resume returns to unpaused', () => {
      const state = createMultiplayerGameState(createMockSession());

      pauseMultiplayerGameLoop(state);
      assert.strictEqual(state.paused, true);

      resumeMultiplayerGameLoop(state);
      assert.strictEqual(state.paused, false);
    });

    it('stop clears running regardless of paused state', () => {
      const state = createMultiplayerGameState(createMockSession());
      state.running = true;
      state.paused = true;

      stopMultiplayerGameLoop(state);

      assert.strictEqual(state.running, false);
      assert.strictEqual(state.paused, true); // paused is not cleared by stop
    });

    it('callbacks can be assigned after creation', () => {
      const state = createMultiplayerGameState(createMockSession());

      state.onTick = () => {};
      state.onRender = () => {};
      state.onMissionEnd = () => {};

      // Verify callbacks are assignable (actual invocation tested via E2E)
      assert.strictEqual(typeof state.onTick, 'function');
      assert.strictEqual(typeof state.onRender, 'function');
      assert.strictEqual(typeof state.onMissionEnd, 'function');
    });
  });
});
