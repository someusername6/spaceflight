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
  /** Repositioning to preferred combat range after burst attack */
  Reposition = 'reposition',
}

export interface AIControlled extends ComponentBase {
  readonly type: 'aiControlled';
  state: AIState;
  target: Entity | null;
  protectTarget: Entity | null;
  stateTimer: number; // Time in current state
  lastStateChange: number; // For cooldowns
  lastDecoyTime: number; // When AI last launched a decoy
  /** When AI last repositioned (for cooldown between repositions) */
  lastRepositionTime: number;
  /** AI behavior profile (determines competence level) */
  profile: AIProfile;
  /**
   * Preferred combat range. AI will actively close to this distance.
   * If undefined, uses profile.engageRange as the threshold.
   */
  preferredCombatRange?: number;
}

/** Creates an AIControlled component with a profile */
export function createAIControlled(
  profileName: ProfileName = 'regular',
  preferredCombatRange?: number,
): AIControlled {
  const base = {
    type: 'aiControlled' as const,
    state: AIState.Idle,
    target: null,
    protectTarget: null,
    stateTimer: 0,
    lastStateChange: 0,
    lastDecoyTime: 0,
    lastRepositionTime: 0,
    profile: getAIProfile(profileName),
  };

  // Only add preferredCombatRange if defined (exactOptionalPropertyTypes)
  if (preferredCombatRange !== undefined) {
    return { ...base, preferredCombatRange };
  }
  return base;
}
