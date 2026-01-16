/**
 * AI Reposition Behavior - Burst-disengage pattern for long-range ships.
 *
 * Long-range ships (with preferredCombatRange set) use this pattern:
 * 1. Engage for burst duration
 * 2. Reposition to regain preferred range
 * 3. Re-engage from optimal distance
 *
 * This creates more dynamic combat where long-range ships maintain distance
 * rather than brawling at close range.
 */

import { type AIControlled, AIState } from '../../components/ai';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
import { entityExists, getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
  calculateEscapeDirection,
  FLEE_RETURN_THRESHOLD,
  isKitingShip,
  LONG_RANGE_MULTIPLIER,
  REPOSITION_AWAY_WEIGHT,
  REPOSITION_DISTANCE_THRESHOLD,
  REPOSITION_PERPENDICULAR_WEIGHT,
  setSpeedInputs,
  tempVectors,
  turnToward,
} from './ai-movement';

/** Check if AI should reposition (burst-disengage for long-range ships) */
export function shouldReposition(ai: AIControlled, distance: number): boolean {
  // Only ships with preferredCombatRange use burst-disengage
  if (ai.preferredCombatRange === undefined) return false;

  // Kiting ships use EVADE for range control, not REPOSITION
  if (isKitingShip(ai)) return false;

  const profile = ai.profile;

  // Only trigger for explicitly long-range ships
  if (ai.preferredCombatRange <= profile.engageRange * LONG_RANGE_MULTIPLIER) {
    return false;
  }

  // Must have been engaging long enough (completed burst)
  if (ai.stateTimer < profile.burstDuration) return false;

  // Only reposition if too close (inside preferred range)
  if (distance >= ai.preferredCombatRange * REPOSITION_DISTANCE_THRESHOLD) {
    return false;
  }

  return true;
}

/** Reposition state - disengage to regain preferred combat range */
export function updateReposition(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  _dt: number,
): void {
  const profile = ai.profile;
  const { toTarget, forward } = tempVectors;

  // Check if target is still valid
  if (!ai.target || !entityExists(world, ai.target)) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const targetTransform = getComponent(world, ai.target, 'transform');
  if (!targetTransform) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const distance = transform.position.distanceTo(targetTransform.position);
  const preferredRange = ai.preferredCombatRange ?? profile.engageRange;

  // Exit condition: reached preferred range or max reposition time
  if (
    distance >= preferredRange * FLEE_RETURN_THRESHOLD ||
    ai.stateTimer >= profile.maxRepositionTime
  ) {
    ai.state = AIState.Engage;
    ai.stateTimer = 0;
    return;
  }

  // Break off if target gets too far (somehow)
  if (distance > profile.breakOffRange) {
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
    return;
  }

  // Fly away from target with evasive maneuvers
  toTarget.copy(transform.position).sub(targetTransform.position);
  if (toTarget.lengthSq() > 0.001) {
    toTarget.normalize();
    forward.set(0, 0, -1).applyQuaternion(transform.rotation);

    const escapeDir = calculateEscapeDirection(
      toTarget,
      forward,
      REPOSITION_PERPENDICULAR_WEIGHT,
      REPOSITION_AWAY_WEIGHT,
    );
    turnToward(ai, transform, escapeDir);
  }

  // Use afterburner for fast repositioning (80% of max afterburner speed)
  const afterburnerSpeed = physics.maxSpeed * physics.afterburnerMultiplier;
  setSpeedInputs(ai, physics, afterburnerSpeed * 0.8, true);
}
