/**
 * Input System - Reads keyboard state and sets player intent flags.
 */

import type { PlayerControlled } from '../components/player';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

/** Key bindings (will be configurable later) */
const KEY_BINDINGS = {
  pitchUp: 'KeyW',
  pitchDown: 'KeyS',
  yawLeft: 'KeyA',
  yawRight: 'KeyD',
  rollLeft: 'KeyQ',
  rollRight: 'KeyE',
  accelerate: 'ShiftLeft',
  decelerate: 'ControlLeft',
  afterburner: 'KeyZ',
  firePrimary: 'Space',
  fireSecondary: 'KeyF',
  launchDecoy: 'KeyC',
  cycleWeaponNext: 'Period',
  cycleWeaponPrev: 'Comma',
  cycleTargetNext: 'BracketRight',
  cycleTargetPrev: 'BracketLeft',
  targetNearest: 'KeyT',
  toggleLink: 'KeyV',
  toggleMatchSpeed: 'KeyM',
} as const;

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
    if (
      Object.values(KEY_BINDINGS).includes(
        e.code as (typeof KEY_BINDINGS)[keyof typeof KEY_BINDINGS],
      )
    ) {
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
  for (const entity of queryEntities(world, ['playerControlled'])) {
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );
    if (!player) continue;

    const input = player.input;

    // Movement
    input.pitchUp = pressedKeys.has(KEY_BINDINGS.pitchUp);
    input.pitchDown = pressedKeys.has(KEY_BINDINGS.pitchDown);
    input.yawLeft = pressedKeys.has(KEY_BINDINGS.yawLeft);
    input.yawRight = pressedKeys.has(KEY_BINDINGS.yawRight);
    input.rollLeft = pressedKeys.has(KEY_BINDINGS.rollLeft);
    input.rollRight = pressedKeys.has(KEY_BINDINGS.rollRight);
    input.accelerate = pressedKeys.has(KEY_BINDINGS.accelerate);
    input.decelerate = pressedKeys.has(KEY_BINDINGS.decelerate);
    input.afterburner = pressedKeys.has(KEY_BINDINGS.afterburner);

    // Combat
    input.firePrimary = pressedKeys.has(KEY_BINDINGS.firePrimary);
    input.fireSecondary = pressedKeys.has(KEY_BINDINGS.fireSecondary);
    input.launchDecoy = pressedKeys.has(KEY_BINDINGS.launchDecoy);
    input.cycleWeaponNext = pressedKeys.has(KEY_BINDINGS.cycleWeaponNext);
    input.cycleWeaponPrev = pressedKeys.has(KEY_BINDINGS.cycleWeaponPrev);
    input.cycleTargetNext = pressedKeys.has(KEY_BINDINGS.cycleTargetNext);
    input.cycleTargetPrev = pressedKeys.has(KEY_BINDINGS.cycleTargetPrev);
    input.targetNearest = pressedKeys.has(KEY_BINDINGS.targetNearest);
    input.toggleLink = pressedKeys.has(KEY_BINDINGS.toggleLink);
    input.toggleMatchSpeed = pressedKeys.has(KEY_BINDINGS.toggleMatchSpeed);
  }
}

/** Check if a specific key is currently pressed (for non-player use) */
export function isKeyPressed(code: string): boolean {
  return pressedKeys.has(code);
}
