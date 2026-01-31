/**
 * Input System - Reads keyboard state and sets player intent flags.
 *
 * Supports two modes:
 * 1. Live input: reads from keyboard (default)
 * 2. Recording: reads from keyboard and records each tick
 *
 * Note: Replay playback is handled by ReplayPlayback class which applies
 * inputs directly without using this system.
 */

import { getComponent, queryEntities } from '../core/ecs';
import type { InputState, World } from '../core/types';
import { encodeInput } from '../input/input-encoding';
import type { InputRecorder } from '../input/input-recorder';
import { getKeyBindings } from '../input/key-bindings';

/** Currently pressed keys (global - one keyboard per browser) */
const pressedKeys = new Set<string>();

/** Stored event handlers for cleanup (const object avoids module-level let) */
const eventHandlers = {
  keydown: null as ((e: KeyboardEvent) => void) | null,
  keyup: null as ((e: KeyboardEvent) => void) | null,
  blur: null as (() => void) | null,
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
// Replay Recording API
// ============================================================================

/**
 * Start recording input to a world.
 * The recorder is stored in world.systemState.inputRecorder.
 */
export function startRecording(world: World, recorder: InputRecorder): void {
  world.systemState.inputRecorder = recorder;
}

/**
 * Stop recording and return the recorder.
 */
export function stopRecording(world: World): InputRecorder | null {
  const recorder = world.systemState.inputRecorder;
  world.systemState.inputRecorder = null;
  return recorder;
}

// ============================================================================
// Input System
// ============================================================================

/**
 * Read live input from keyboard and write to InputState.
 * Exported for multiplayer game loop to capture input before tick.
 */
export function readLiveInput(input: InputState): void {
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
    const player = getComponent(world, entity, 'playerControlled');
    if (!player) continue;

    // Only apply keyboard input to local player
    // In multiplayer, remote players get input via MultiplayerSession.tick() → GameAdapter.step()
    if (!player.isLocalPlayer) continue;

    const input = player.input;

    // Read live input from keyboard
    readLiveInput(input);

    // Record if active (recorder stored per-world for multiplayer isolation)
    const recorder = world.systemState.inputRecorder;
    if (recorder) {
      recorder.recordRaw(encodeInput(input));
    }
  }
}

/** Check if a specific key is currently pressed (for non-player use) */
export function isKeyPressed(code: string): boolean {
  return pressedKeys.has(code);
}
