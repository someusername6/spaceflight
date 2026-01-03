/**
 * AI component - state machine and behavior parameters.
 */

import type { ComponentBase, Entity } from '../core/types';

/** AI behavior states */
export enum AIState {
  Idle = 'idle',
  Pursue = 'pursue',
  Engage = 'engage',
  Evade = 'evade',
  Protect = 'protect',
  Regroup = 'regroup',
}

export interface AIControlled extends ComponentBase {
  readonly type: 'aiControlled';
  state: AIState;
  target: Entity | null;
  protectTarget: Entity | null;
  stateTimer: number; // Time in current state
  lastStateChange: number; // For cooldowns
}

/** Creates an AIControlled component */
export function createAIControlled(): AIControlled {
  return {
    type: 'aiControlled',
    state: AIState.Idle,
    target: null,
    protectTarget: null,
    stateTimer: 0,
    lastStateChange: 0,
  };
}
