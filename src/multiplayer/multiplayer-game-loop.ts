/**
 * Multiplayer Game Loop - Wraps MultiplayerSession with requestAnimationFrame loop.
 *
 * This module provides the game loop for multiplayer missions, where:
 * - Local input is captured and sent via session.tick()
 * - Remote player inputs arrive via rollback-netcode
 * - GameAdapter.step() runs SIMULATION_SYSTEMS for all players
 */

import { createInputState, type InputState, type World } from '../core/types';
import { TICK_RATE } from '../game';
import { getFrameIntervalMs } from '../settings/game-settings';
import { readLiveInput } from '../systems/input';
import { getMissionResult, MissionResult } from '../systems/mission';
import type { MultiplayerSession } from './multiplayer-session';

const TICK_MS = 1000 / TICK_RATE;

/**
 * State for a multiplayer game loop.
 */
export interface MultiplayerGameState {
  /** The multiplayer session handling network and rollback */
  session: MultiplayerSession;
  /** Whether the loop is running */
  running: boolean;
  /** Whether simulation is paused (renders continue) */
  paused: boolean;
  /** Accumulator for fixed timestep */
  accumulator: number;
  /** Last frame timestamp */
  lastTime: number;
  /** Last render timestamp for frame cap */
  lastRenderTime: number;
  /** Last notified mission result (to avoid duplicate callbacks) */
  lastNotifiedResult: MissionResult;
  /** Callback after each tick */
  onTick?: (world: World) => void;
  /** Callback for rendering with interpolation alpha */
  onRender?: (world: World, alpha: number) => void;
  /** Callback when mission ends */
  onMissionEnd?: (result: MissionResult) => void;
}

/**
 * Create state for a multiplayer game loop.
 */
export function createMultiplayerGameState(
  session: MultiplayerSession,
): MultiplayerGameState {
  return {
    session,
    running: false,
    paused: false,
    accumulator: 0,
    lastTime: 0,
    lastRenderTime: 0,
    lastNotifiedResult: MissionResult.InProgress,
  };
}

/**
 * Read current keyboard input into an InputState.
 */
function captureLocalInput(): InputState {
  const input = createInputState();
  readLiveInput(input);
  return input;
}

/**
 * Process one frame of the multiplayer game loop.
 */
function multiplayerFrame(
  state: MultiplayerGameState,
  currentTime: number,
): void {
  if (!state.running) return;

  // Initialize time on first frame
  if (state.lastTime === 0) {
    state.lastTime = currentTime;
    state.lastRenderTime = currentTime;
  }

  const delta = currentTime - state.lastTime;
  state.lastTime = currentTime;

  // When paused, skip simulation but still render frozen frame
  if (!state.paused) {
    state.accumulator += delta;
    state.accumulator = Math.min(state.accumulator, TICK_MS * 5);

    // Fixed timestep updates
    while (state.accumulator >= TICK_MS) {
      // Capture local input
      const localInput = captureLocalInput();

      // Advance the session - this handles:
      // - Serializing and sending local input
      // - Receiving remote inputs
      // - Running rollback if needed
      // - Calling GameAdapter.step() which runs SIMULATION_SYSTEMS
      state.session.tick(localInput);

      state.accumulator -= TICK_MS;

      // Check for mission end
      const world = state.session.getWorld();
      const result = getMissionResult(world);
      if (result !== state.lastNotifiedResult && state.onMissionEnd) {
        state.lastNotifiedResult = result;
        state.onMissionEnd(result);
      }

      // Notify tick callback
      if (state.onTick) {
        state.onTick(world);
      }
    }
  }

  // Frame rate capping
  const frameInterval = getFrameIntervalMs();
  const timeSinceLastRender = currentTime - state.lastRenderTime;

  if (frameInterval === 0 || timeSinceLastRender >= frameInterval) {
    state.lastRenderTime = currentTime;
    const alpha = state.paused ? 1 : state.accumulator / TICK_MS;
    if (state.onRender) {
      state.onRender(state.session.getWorld(), alpha);
    }
  }
}

/**
 * Start the multiplayer game loop.
 */
export function startMultiplayerGameLoop(state: MultiplayerGameState): void {
  state.running = true;
  state.lastTime = 0;
  state.lastRenderTime = 0;
  state.accumulator = 0;

  function loop(time: number) {
    multiplayerFrame(state, time);
    if (state.running) {
      requestAnimationFrame(loop);
    }
  }

  requestAnimationFrame(loop);
}

/**
 * Stop the multiplayer game loop.
 */
export function stopMultiplayerGameLoop(state: MultiplayerGameState): void {
  state.running = false;
}

/**
 * Pause the multiplayer game loop (physics stops, rendering continues).
 */
export function pauseMultiplayerGameLoop(state: MultiplayerGameState): void {
  state.paused = true;
}

/**
 * Resume the multiplayer game loop from pause.
 */
export function resumeMultiplayerGameLoop(state: MultiplayerGameState): void {
  state.paused = false;
  // Reset lastTime to avoid accumulator spike from time spent paused
  state.lastTime = 0;
}
