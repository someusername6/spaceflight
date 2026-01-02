/**
 * Player marker component - identifies the human-controlled entity.
 */

import type { ComponentBase, InputState } from '../core/types';
import { createInputState } from '../core/types';

export interface PlayerControlled extends ComponentBase {
  readonly type: 'playerControlled';
  input: InputState;
}

/** Creates a PlayerControlled marker component */
export function createPlayerControlled(): PlayerControlled {
  return {
    type: 'playerControlled',
    input: createInputState(),
  };
}
