/**
 * Input System - Reads keyboard state and sets player intent flags.
 */

import type { PlayerControlled } from '../components/player';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';
import { getKeyBindings } from '../input/key-bindings';

/** Currently pressed keys */
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
    pressedKeys.add(e.code);
    // Prevent browser defaults for game keys
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

/** Input system - updates player input state each frame */
export function inputSystem(world: World, _dt: number): void {
  const bindings = getKeyBindings();

  for (const entity of queryEntities(world, ['playerControlled'])) {
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );
    if (!player) continue;

    const input = player.input;

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
}

/** Check if a specific key is currently pressed (for non-player use) */
export function isKeyPressed(code: string): boolean {
  return pressedKeys.has(code);
}
