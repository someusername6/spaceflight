/**
 * AI component - state machine and behavior parameters.
 */

import type { ComponentBase, Entity } from '../core/types';
import {
  type AIProfile,
  getAIProfile,
  type ProfileName,
} from '../data/ai-profiles';

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
  lastDecoyTime: number; // When AI last launched a decoy
  /** AI behavior profile (determines competence level) */
  profile: AIProfile;
}

/** Creates an AIControlled component with a profile */
export function createAIControlled(
  profileName: ProfileName = 'regular',
): AIControlled {
  return {
    type: 'aiControlled',
    state: AIState.Idle,
    target: null,
    protectTarget: null,
    stateTimer: 0,
    lastStateChange: 0,
    lastDecoyTime: 0,
    profile: getAIProfile(profileName),
  };
}
