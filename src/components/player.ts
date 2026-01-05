/**
 * Player marker component - identifies the human-controlled entity.
 */

import type { ComponentBase, Entity, InputState } from '../core/types';
import { createInputState } from '../core/types';

export interface PlayerControlled extends ComponentBase {
  readonly type: 'playerControlled';
  input: InputState;
  /** Match speed mode - automatically adjust throttle to maintain distance to target */
  matchSpeed: boolean;
  /** Previous frame's target distance (for calculating closing rate) */
  prevTargetDistance: number;
  /** Previous target entity (to detect target changes) */
  prevMatchSpeedTarget: Entity | undefined;
}

/** Creates a PlayerControlled marker component */
export function createPlayerControlled(): PlayerControlled {
  return {
    type: 'playerControlled',
    input: createInputState(),
    matchSpeed: false,
    prevTargetDistance: 0,
    prevMatchSpeedTarget: undefined,
  };
}
