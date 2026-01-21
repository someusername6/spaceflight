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
import type { SecondaryWeapons } from '../../components/weapons';
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

/** Safe distance from stations (avoid collision) */
export const STATION_SAFE_DISTANCE = 500;

/** Distance to retreat to after station attack run */
export const STATION_RETREAT_DISTANCE = 700;

/**
 * Check if secondary weapons have homing missiles with ammo.
 */
export function hasHomingMissiles(secondary: SecondaryWeapons): boolean {
  return secondary.weapons.some(
    (w) => w.requiresLock && !w.isDecoy && w.count > 0,
  );
}

/**
 * Get the lock speed from the first homing missile with ammo.
 * Returns 0 if no homing missiles are available.
 */
export function getHomingMissileLockSpeed(secondary: SecondaryWeapons): number {
  for (const weapon of secondary.weapons) {
    if (weapon.requiresLock && !weapon.isDecoy && weapon.count > 0) {
      return weapon.lockSpeed;
    }
  }
  return 0;
}

/**
 * Get the range of the first homing missile with ammo.
 * Returns 0 if no homing missiles are available.
 */
export function getHomingMissileRange(secondary: SecondaryWeapons): number {
  for (const weapon of secondary.weapons) {
    if (weapon.requiresLock && !weapon.isDecoy && weapon.count > 0) {
      return weapon.range;
    }
  }
  return 0;
}

/**
 * Minimum missile range to use controlled strafing approach.
 * Short-range missiles (dart 800m, swarm 600m) rush in at full speed.
 * Long-range missiles (seeker 2000m, torpedo 4000m) use controlled approach.
 */
export const STRAFING_MIN_RANGE = 1000;

/**
 * Calculate approach speed for station attack run.
 * Short-range missiles rush in; long-range missiles use controlled approach.
 */
export function getStationApproachSpeed(
  distance: number,
  lockProgress: number,
  lockSpeed: number,
  maxSpeed: number,
  missileRange: number,
): number {
  if (lockSpeed <= 0) return maxSpeed; // No lock needed

  // Short-range missiles: rush in at full speed
  if (missileRange < STRAFING_MIN_RANGE) {
    return maxSpeed;
  }

  const lockTimeRemaining = (1 - lockProgress) / lockSpeed;
  if (lockTimeRemaining <= 0) return maxSpeed; // Lock complete

  const distanceToSafe = distance - STATION_SAFE_DISTANCE;
  if (distanceToSafe <= 0) return 0; // Already too close, stop

  // Speed that arrives at safe distance exactly when lock completes
  return Math.min(distanceToSafe / lockTimeRemaining, maxSpeed);
}

/**
 * Check if AI should reposition (burst-disengage for long-range ships).
 * @param targetIsStation True if target is a station (uses different retreat logic)
 * @param lockProgress Current missile lock progress (0-1) for station attacks
 * @param missileRange Range of homing missile (defaults to 0 = short-range/no strafing)
 */
export function shouldReposition(
  ai: AIControlled,
  distance: number,
  targetIsStation = false,
  lockProgress = 0,
  missileRange = 0,
): boolean {
  // Station attackers: retreat when too close and not building lock
  if (targetIsStation) {
    // Short-range missiles: don't retreat (rush in like pre-strafing)
    if (missileRange < STRAFING_MIN_RANGE) return false;
    // Don't retreat while lock is building (wait for missile to fire)
    if (lockProgress > 0) return false;
    // Retreat when at safe distance (after firing or no homing missiles)
    return distance < STATION_SAFE_DISTANCE;
  }

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

/**
 * Reposition state - disengage to regain preferred combat range.
 * @param targetIsStation True if target is a station (uses different retreat distance)
 */
export function updateReposition(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  _dt: number,
  targetIsStation = false,
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

  // Use station retreat distance for station targets, otherwise preferred range
  const retreatRange = targetIsStation
    ? STATION_RETREAT_DISTANCE
    : (ai.preferredCombatRange ?? profile.engageRange);

  // Exit condition: reached retreat range or max reposition time
  if (
    distance >= retreatRange * FLEE_RETURN_THRESHOLD ||
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
