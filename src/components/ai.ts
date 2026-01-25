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
  | 'station-defense'
  | 'station-assault-high-dps' // Attack station: high DPS ships attack enemy station
  | 'station-assault-low-dps' // Attack station: low DPS ships attack enemy defenders
  | 'station-defender'; // Attack station: enemy defenders prioritize station attackers

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

// =============================================================================
// Serialization
// =============================================================================

import { AI_PROFILES, getAIProfile } from '../data/ai-profiles';

/** Serialized AI state enum as numeric */
const AIStateToNum: Record<AIState, number> = {
  [AIState.Idle]: 0,
  [AIState.Pursue]: 1,
  [AIState.Engage]: 2,
  [AIState.Evade]: 3,
  [AIState.Regroup]: 4,
  [AIState.Reposition]: 5,
};
const NumToAIState: AIState[] = [
  AIState.Idle,
  AIState.Pursue,
  AIState.Engage,
  AIState.Evade,
  AIState.Regroup,
  AIState.Reposition,
];

/** Serialized behavior mode as numeric */
const BehaviorModeToNum: Record<AIBehaviorMode, number> = {
  standard: 0,
  defensive: 1,
  'convoy-hunter': 2,
  'convoy-guard-aggressive': 3,
  'convoy-guard-defensive': 4,
  'convoy-interceptor': 5,
  'station-hunter': 6,
  'station-defense': 7,
  'station-assault-high-dps': 8,
  'station-assault-low-dps': 9,
  'station-defender': 10,
};
const NumToBehaviorMode: AIBehaviorMode[] = [
  'standard',
  'defensive',
  'convoy-hunter',
  'convoy-guard-aggressive',
  'convoy-guard-defensive',
  'convoy-interceptor',
  'station-hunter',
  'station-defense',
  'station-assault-high-dps',
  'station-assault-low-dps',
  'station-defender',
];

export interface SerializedAIInput {
  p: number; // pitch
  y: number; // yaw
  r: number; // roll
  b: number; // bitmask: accelerate(0), decelerate(1), afterburner(2)
}

export interface SerializedAIControlled {
  t: 7; // Component type ID
  s: number; // state (AIState as number)
  tg: Entity | null; // target
  st: number; // stateTimer
  lc: number; // lastStateChange
  ld: number; // lastDecoyTime
  lr: number; // lastRepositionTime
  pn: string; // profile name (lookup from AI_PROFILES)
  i: SerializedAIInput; // input
  pr?: number; // preferredCombatRange
  fd?: number; // fleeDistance
  bm?: number; // behaviorMode as number
}

function serializeAIInput(input: AIInput): SerializedAIInput {
  let bitmask = 0;
  if (input.accelerate) bitmask |= 1;
  if (input.decelerate) bitmask |= 2;
  if (input.afterburner) bitmask |= 4;
  return { p: input.pitch, y: input.yaw, r: input.roll, b: bitmask };
}

function deserializeAIInput(s: SerializedAIInput): AIInput {
  return {
    pitch: s.p,
    yaw: s.y,
    roll: s.r,
    accelerate: (s.b & 1) !== 0,
    decelerate: (s.b & 2) !== 0,
    afterburner: (s.b & 4) !== 0,
  };
}

export function serializeAIControlled(c: AIControlled): SerializedAIControlled {
  // Handle undefined/null profile gracefully - use 'regular' as default
  const profileName = c.profile?.name?.toLowerCase() ?? 'regular';
  const result: SerializedAIControlled = {
    t: 7,
    s: AIStateToNum[c.state],
    tg: c.target,
    st: c.stateTimer,
    lc: c.lastStateChange,
    ld: c.lastDecoyTime,
    lr: c.lastRepositionTime,
    pn: profileName,
    i: serializeAIInput(c.input),
  };
  if (c.preferredCombatRange !== undefined) result.pr = c.preferredCombatRange;
  if (c.fleeDistance !== undefined) result.fd = c.fleeDistance;
  if (c.behaviorMode !== undefined)
    result.bm = BehaviorModeToNum[c.behaviorMode];
  return result;
}

export function deserializeAIControlled(
  s: SerializedAIControlled,
): AIControlled {
  const profile = AI_PROFILES[s.pn] ?? getAIProfile(s.pn);
  const result: AIControlled = {
    type: 'aiControlled',
    state: NumToAIState[s.s] ?? AIState.Idle,
    target: s.tg,
    stateTimer: s.st,
    lastStateChange: s.lc,
    lastDecoyTime: s.ld,
    lastRepositionTime: s.lr,
    profile,
    input: deserializeAIInput(s.i),
  };
  if (s.pr !== undefined) {
    (result as { preferredCombatRange?: number }).preferredCombatRange = s.pr;
  }
  if (s.fd !== undefined) {
    (result as { fleeDistance?: number }).fleeDistance = s.fd;
  }
  if (s.bm !== undefined) {
    const mode = NumToBehaviorMode[s.bm];
    if (mode !== undefined) {
      (result as { behaviorMode?: AIBehaviorMode }).behaviorMode = mode;
    }
  }
  return result;
}
