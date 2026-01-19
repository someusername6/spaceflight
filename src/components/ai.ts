/**
 * AI component - state machine and behavior parameters.
 */

import type { ComponentBase, Entity } from '../core/types';
import type { AIProfile } from '../data/ai-profiles';

/** AI behavior states */
export enum AIState {
  Idle = 'idle',
  Pursue = 'pursue',
  Engage = 'engage',
  Evade = 'evade',
  Regroup = 'regroup',
  /** Repositioning to preferred combat range after burst attack */
  Reposition = 'reposition',
}

/** AI control inputs - set by AI behaviors, processed by physics system */
export interface AIInput {
  /** Pitch input (-1 to 1) */
  pitch: number;
  /** Yaw input (-1 to 1) */
  yaw: number;
  /** Roll input (-1 to 1) */
  roll: number;
  /** Accelerate flag */
  accelerate: boolean;
  /** Decelerate flag */
  decelerate: boolean;
  /** Afterburner flag */
  afterburner: boolean;
}

/** AI behavior modes for different tactical situations */
export type AIBehaviorMode =
  | 'standard'
  | 'defensive'
  | 'convoy-hunter'
  | 'convoy-guard-aggressive' // Ambush: proactive + reactive escort
  | 'convoy-guard-defensive' // Ambush: reactive only escort
  | 'convoy-interceptor' // Ambush: player wingmen attack escorts, then stop convoy
  | 'station-hunter'
  | 'station-defense';

export interface AIControlled extends ComponentBase {
  readonly type: 'aiControlled';
  state: AIState;
  target: Entity | null;
  stateTimer: number; // Time in current state
  lastStateChange: number; // For cooldowns
  lastDecoyTime: number; // When AI last launched a decoy
  /** When AI last repositioned (for cooldown between repositions) */
  lastRepositionTime: number;
  /** AI behavior profile (determines competence level) */
  profile: AIProfile;
  /** Control inputs set by AI behaviors, processed by physics */
  input: AIInput;
  /**
   * Preferred combat range. AI will actively close to this distance.
   * If undefined, uses profile.engageRange as the threshold.
   */
  preferredCombatRange?: number;
  /**
   * Distance at which AI will flee (enter EVADE). Used for kiting ships.
   * AI returns to ENGAGE when distance exceeds preferredCombatRange.
   */
  fleeDistance?: number;
  /**
   * Behavior mode for targeting decisions:
   * - 'standard': Normal targeting (wingmen protect player, enemies attack nearest)
   * - 'defensive': Stay near convoy, only engage nearby threats
   * - 'convoy-hunter': Prioritize convoy ships over combat targets
   * - 'convoy-guard-aggressive': Protect convoy, engage player within 600m proactively
   * - 'convoy-guard-defensive': Protect convoy, only react to damage/lock triggers
   * - 'station-hunter': Prioritize station over combat targets
   * - 'station-defense': Stay near station, protect it from threats
   */
  behaviorMode?: AIBehaviorMode;
}

/** Creates an AIControlled component with a profile */
export function createAIControlled(
  profile: AIProfile,
  preferredCombatRange?: number,
  fleeDistance?: number,
): AIControlled {
  const base = {
    type: 'aiControlled' as const,
    state: AIState.Idle,
    target: null,
    stateTimer: 0,
    lastStateChange: 0,
    lastDecoyTime: 0,
    lastRepositionTime: 0,
    profile,
    input: {
      pitch: 0,
      yaw: 0,
      roll: 0,
      accelerate: false,
      decelerate: false,
      afterburner: false,
    },
  };

  // Only add optional fields if defined (exactOptionalPropertyTypes)
  const result: AIControlled = base;
  if (preferredCombatRange !== undefined) {
    (result as { preferredCombatRange?: number }).preferredCombatRange =
      preferredCombatRange;
  }
  if (fleeDistance !== undefined) {
    (result as { fleeDistance?: number }).fleeDistance = fleeDistance;
  }
  return result;
}
