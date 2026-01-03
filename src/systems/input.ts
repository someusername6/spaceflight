/**
 * Input System - Reads keyboard state and sets player intent flags.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { PlayerControlled } from '../components/player';

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
  cycleWeaponNext: 'BracketRight',
  cycleWeaponPrev: 'BracketLeft',
  cycleTargetNext: 'Period',
  cycleTargetPrev: 'Comma',
  targetNearest: 'KeyT',
  fireDecoy: 'KeyX',
} as const;

/** Currently pressed keys */
const pressedKeys = new Set<string>();

/** Initialize keyboard listeners (call once at startup) */
export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    pressedKeys.add(e.code);
    // Prevent browser defaults for game keys
    if (Object.values(KEY_BINDINGS).includes(e.code as typeof KEY_BINDINGS[keyof typeof KEY_BINDINGS])) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.code);
  });

  // Clear keys when window loses focus
  window.addEventListener('blur', () => {
    pressedKeys.clear();
  });
}

/** Input system - updates player input state each frame */
export function inputSystem(world: World, _dt: number): void {
  for (const entity of queryEntities(world, ['playerControlled'])) {
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled');
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
    input.cycleWeaponNext = pressedKeys.has(KEY_BINDINGS.cycleWeaponNext);
    input.cycleWeaponPrev = pressedKeys.has(KEY_BINDINGS.cycleWeaponPrev);
    input.cycleTargetNext = pressedKeys.has(KEY_BINDINGS.cycleTargetNext);
    input.cycleTargetPrev = pressedKeys.has(KEY_BINDINGS.cycleTargetPrev);
    input.targetNearest = pressedKeys.has(KEY_BINDINGS.targetNearest);
    input.fireDecoy = pressedKeys.has(KEY_BINDINGS.fireDecoy);
  }
}

/** Check if a specific key is currently pressed (for non-player use) */
export function isKeyPressed(code: string): boolean {
  return pressedKeys.has(code);
}
