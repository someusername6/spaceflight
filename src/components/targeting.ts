/**
 * Targeting component - tracks current target and missile lock state.
 */

import type { ComponentBase, Entity } from '../core/types';

export interface Targeting extends ComponentBase {
  readonly type: 'targeting';
  /** Currently selected target entity, or undefined if none */
  currentTarget: Entity | undefined;
  /** Lock-on progress for missiles (0 = no lock, 1 = fully locked) */
  lockProgress: number;
  /** Entity being locked onto (may differ from currentTarget during lock acquisition) */
  lockTarget: Entity | undefined;
  /** Cached list of valid targets for cycling (updated by targeting system) */
  validTargets: Entity[];
  /** Index into validTargets for current selection */
  targetIndex: number;
}

/** Creates a Targeting component */
export function createTargeting(): Targeting {
  return {
    type: 'targeting',
    currentTarget: undefined,
    lockProgress: 0,
    lockTarget: undefined,
    validTargets: [],
    targetIndex: -1,
  };
}
