/**
 * Targeting component - tracks current target and missile lock state.
 */

import type { ComponentBase, Entity } from '../core/types';

export interface Targeting extends ComponentBase {
  readonly type: 'targeting';
  /** Currently selected target entity, or undefined if none */
  currentTarget: Entity | undefined;
  /** Cached list of valid targets for cycling (updated by targeting system) */
  validTargets: Entity[];
  /** Index into validTargets for current selection */
  targetIndex: number;
  // Note: Lock-on progress is managed by SecondaryWeapons component, not here
}

/** Creates a Targeting component */
export function createTargeting(): Targeting {
  return {
    type: 'targeting',
    currentTarget: undefined,
    validTargets: [],
    targetIndex: -1,
  };
}
