/**
 * Input System - Reads keyboard state and sets player intent flags.
 *
 * Supports three modes:
 * 1. Live input: reads from keyboard (default)
 * 2. Recording: reads from keyboard and records each tick
 * 3. Playback: reads from recorded data (for replays)
 */

import type { PlayerControlled } from '../components/player';
import { getComponent, queryEntities } from '../core/ecs';
import type { InputState, World } from '../core/types';
import { encodeInput } from '../input/input-encoding';
import type { InputPlayer, InputRecorder } from '../input/input-recorder';
import { getKeyBindings } from '../input/key-bindings';

/** Currently pressed keys */
const pressedKeys = new Set<string>();

/** Stored event handlers for cleanup (const object avoids module-level let) */
const eventHandlers = {
  keydown: null as ((e: KeyboardEvent) => void) | null,
  keyup: null as ((e: KeyboardEvent) => void) | null,
  blur: null as (() => void) | null,
};

/** Replay state for recording and playback */
const replayState = {
  /** Active recorder (null if not recording) */
  recorder: null as InputRecorder | null,
  /** Active player (null if not in playback mode) */
  player: null as InputPlayer | null,
  /** Current tick for playback */
  playbackTick: 0,
};

/** Initialize keyboard listeners (call once at startup) */
export function initInput(): void {
  // Create handlers that can be removed later
  eventHandlers.keydown = (e: KeyboardEvent) => {
    // Don't track keys or prevent defaults when interacting with form controls
    const target = e.target as HTMLElement;
    const isFormControl =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.isContentEditable;
    if (isFormControl) return;

    pressedKeys.add(e.code);
    // Prevent browser defaults for game keys (e.g., arrow keys scrolling)
    const bindings = getKeyBindings();
    if (Object.values(bindings).includes(e.code)) {
      e.preventDefault();
    }
  };

  eventHandlers.keyup = (e: KeyboardEvent) => {
    pressedKeys.delete(e.code);
  };

  eventHandlers.blur = () => {
    pressedKeys.clear();
  };

  window.addEventListener('keydown', eventHandlers.keydown);
  window.addEventListener('keyup', eventHandlers.keyup);
  window.addEventListener('blur', eventHandlers.blur);
}

/** Clean up keyboard listeners (call on game shutdown) */
export function cleanupInput(): void {
  if (eventHandlers.keydown) {
    window.removeEventListener('keydown', eventHandlers.keydown);
    eventHandlers.keydown = null;
  }
  if (eventHandlers.keyup) {
    window.removeEventListener('keyup', eventHandlers.keyup);
    eventHandlers.keyup = null;
  }
  if (eventHandlers.blur) {
    window.removeEventListener('blur', eventHandlers.blur);
    eventHandlers.blur = null;
  }
  pressedKeys.clear();
}

// ============================================================================
// Replay Recording/Playback API
// ============================================================================

/**
 * Start recording input.
 * Call before starting the game loop.
 */
export function startRecording(recorder: InputRecorder): void {
  replayState.recorder = recorder;
  replayState.player = null;
}

/**
 * Stop recording and return the recorder.
 */
export function stopRecording(): InputRecorder | null {
  const recorder = replayState.recorder;
  replayState.recorder = null;
  return recorder;
}

/**
 * Start playback from recorded input.
 * Call before starting the game loop.
 */
export function startPlayback(player: InputPlayer): void {
  replayState.player = player;
  replayState.recorder = null;
  replayState.playbackTick = 0;
}

/**
 * Stop playback mode.
 */
export function stopPlayback(): void {
  replayState.player = null;
  replayState.playbackTick = 0;
}

/**
 * Reset playback to a specific tick (for seeking).
 * Clamps to valid range [0, tickCount).
 * Returns the actual tick set (may differ if clamped).
 */
export function seekPlayback(tick: number): number {
  if (!replayState.player) {
    return 0;
  }
  const maxTick = replayState.player.getTickCount();
  const clampedTick = Math.max(0, Math.min(tick, maxTick - 1));
  replayState.playbackTick = clampedTick;
  return clampedTick;
}

/**
 * Check if currently in playback mode.
 */
export function isPlaybackMode(): boolean {
  return replayState.player !== null;
}

/**
 * Check if currently recording.
 */
export function isRecordingMode(): boolean {
  return replayState.recorder !== null;
}

/**
 * Get current playback tick.
 */
export function getPlaybackTick(): number {
  return replayState.playbackTick;
}

// ============================================================================
// Input System
// ============================================================================

/**
 * Read live input from keyboard and write to InputState.
 */
function readLiveInput(input: InputState): void {
  const bindings = getKeyBindings();

  // Movement
  input.pitchUp = pressedKeys.has(bindings.pitchUp);
  input.pitchDown = pressedKeys.has(bindings.pitchDown);
  input.yawLeft = pressedKeys.has(bindings.yawLeft);
  input.yawRight = pressedKeys.has(bindings.yawRight);
  input.rollLeft = pressedKeys.has(bindings.rollLeft);
  input.rollRight = pressedKeys.has(bindings.rollRight);
  input.accelerate = pressedKeys.has(bindings.accelerate);
  input.decelerate = pressedKeys.has(bindings.decelerate);
  input.afterburner = pressedKeys.has(bindings.afterburner);

  // Combat
  input.firePrimary = pressedKeys.has(bindings.firePrimary);
  input.fireSecondary = pressedKeys.has(bindings.fireSecondary);
  input.launchDecoy = pressedKeys.has(bindings.launchDecoy);
  input.cyclePrimary = pressedKeys.has(bindings.cyclePrimary);
  input.cycleSecondary = pressedKeys.has(bindings.cycleSecondary);
  input.cycleTargetNext = pressedKeys.has(bindings.cycleTargetNext);
  input.cycleTargetPrev = pressedKeys.has(bindings.cycleTargetPrev);
  input.targetNearest = pressedKeys.has(bindings.targetNearest);
  input.toggleMatchSpeed = pressedKeys.has(bindings.toggleMatchSpeed);
}

/** Input system - updates player input state each frame */
export function inputSystem(world: World, _dt: number): void {
  for (const entity of queryEntities(world, ['playerControlled'])) {
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );
    if (!player) continue;

    const input = player.input;

    if (replayState.player) {
      // Playback mode: read from recorded data
      replayState.player.applyInputForTick(replayState.playbackTick, input);
      replayState.playbackTick++;
    } else {
      // Live mode: read from keyboard
      readLiveInput(input);

      // Record if active
      if (replayState.recorder) {
        replayState.recorder.recordRaw(encodeInput(input));
      }
    }
  }
  // Note: If no player entity exists, playback tick does NOT advance.
  // This ensures replay stays synchronized with game state.
  // If player dies and respawns, replay will resume from correct tick.
}

/** Check if a specific key is currently pressed (for non-player use) */
export function isKeyPressed(code: string): boolean {
  return pressedKeys.has(code);
}
