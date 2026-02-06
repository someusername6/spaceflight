/**
 * AI Behaviors - State update functions for AI ships.
 *
 * Extracted from ai.ts to stay under 400 line limit.
 * Uses AIProfile for per-entity behavior configuration.
 */

import { type AIControlled, AIState } from '../../components/ai';
import type { Heat } from '../../components/heat';
import {
  AFTERBURNER_UNLOCK_THRESHOLD,
  getHeatPercent,
  isHeatWarning,
} from '../../components/heat';
import type { Physics } from '../../components/physics';
import type { Shields } from '../../components/shields';
import type { Transform } from '../../components/transform';
import { entityExists, getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import type { AIProfile } from '../../data/ai-profiles';
import {
  calculateEscapeDirection,
  EVADE_AWAY_WEIGHT,
  EVADE_PERPENDICULAR_WEIGHT,
  FLEE_RETURN_THRESHOLD,
  isKitingShip,
  setSpeedInputs,
  tempVectors,
  turnToward,
} from './ai-movement';

/** Check if AI should evade (low shields) - uses profile threshold */
export function shouldEvade(
  shields: Shields | undefined,
  profile: AIProfile,
): boolean {
  if (!shields) return false;
  return shields.current / shields.max < profile.evadeShieldThreshold;
}

/** Check if AI should flee based on distance (for kiting ships) */
export function shouldFleeDistance(
  ai: AIControlled,
  distance: number,
): boolean {
  if (!isKitingShip(ai)) return false;
  return distance < (ai.fleeDistance as number);
}

/** Check if AI should regroup (very low shields or overheated) - uses profile threshold */
export function shouldRegroup(
  shields: Shields | undefined,
  heat: Heat | undefined,
  profile: AIProfile,
): boolean {
  const veryLowShields =
    shields && shields.current / shields.max < profile.regroupShieldThreshold;
  const overheated = heat && isHeatWarning(heat);
  return !!(veryLowShields || overheated);
}

/** Check if AI has recovered enough to re-engage - uses profile threshold */
function hasRecovered(
  shields: Shields | undefined,
  heat: Heat | undefined,
  profile: AIProfile,
): boolean {
  const shieldsOk =
    !shields || shields.current / shields.max >= profile.recoverShieldThreshold;
  const heatOk = !heat || getHeatPercent(heat) <= AFTERBURNER_UNLOCK_THRESHOLD;
  return shieldsOk && heatOk;
}

/** Evade state - break away from combat using afterburner */
export function updateEvade(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  shields: Shields | undefined,
  // _heat: Evade uses shield-based exit, not heat. Heat triggers Regroup from Pursue/Engage instead.
  _heat: Heat | undefined,
  _dt: number,
): void {
  const profile = ai.profile;
  const { toTarget, forward } = tempVectors;

  // Distance-flee (kiting) ships: return to ENGAGE when distance regained
  if (isKitingShip(ai) && ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent(world, ai.target, 'transform');
    if (targetTransform) {
      const distance = transform.position.distanceTo(targetTransform.position);
      const returnRange = ai.preferredCombatRange ?? profile.engageRange;
      if (distance >= returnRange * FLEE_RETURN_THRESHOLD) {
        ai.state = AIState.Engage;
        ai.stateTimer = 0;
        physics.isAfterburning = false;
        return;
      }
    }
  }

  // Normal exit condition: cooldown expired and shields recovered
  // Skip for kiting ships (they only exit via distance check above)
  if (!isKitingShip(ai)) {
    const shieldsRecovered =
      !shields || shields.current / shields.max >= profile.evadeShieldThreshold;
    if (ai.stateTimer >= profile.evadeCooldown && shieldsRecovered) {
      ai.state = ai.target ? AIState.Pursue : AIState.Idle;
      ai.stateTimer = 0;
      physics.isAfterburning = false;
      return;
    }
  }

  // Calculate escape direction and turn
  if (ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent(world, ai.target, 'transform');
    if (targetTransform) {
      // Direction away from target
      toTarget.copy(transform.position).sub(targetTransform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();

        if (isKitingShip(ai)) {
          // Kiting ships: flee DIRECTLY away to maximize distance gain
          turnToward(ai, transform, toTarget);
        } else {
          // Normal evade: perpendicular movement to maximize angular velocity
          forward.set(0, 0, -1).applyQuaternion(transform.rotation);
          const escapeDir = calculateEscapeDirection(
            toTarget,
            forward,
            EVADE_PERPENDICULAR_WEIGHT,
            EVADE_AWAY_WEIGHT,
          );
          turnToward(ai, transform, escapeDir);
        }
      }
    }
  }

  // Add erratic movement (barrel roll effect) via roll input - skip for kiting ships
  if (!isKitingShip(ai)) {
    const wobble = Math.sin((ai.stateTimer + entity * 1.7) * 8);
    ai.input.roll = wobble;
  }

  // Afterburner escape - use boosted speed if not heat-locked
  const canAfterburn = !physics.afterburnerLocked;
  const afterburnerSpeed = physics.maxSpeed * physics.afterburnerMultiplier;

  if (canAfterburn) {
    setSpeedInputs(ai, physics, afterburnerSpeed, true);
  } else {
    // Heat-locked - use normal max speed
    setSpeedInputs(ai, physics, physics.maxSpeed);
  }
}

/** Regroup state - disengage and recover */
export function updateRegroup(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  shields: Shields | undefined,
  heat: Heat | undefined,
  _dt: number,
): void {
  const profile = ai.profile;
  const { toTarget, localUp } = tempVectors;

  // Exit condition: recovered and minimum time passed
  if (
    ai.stateTimer >= profile.regroupMinTime &&
    hasRecovered(shields, heat, profile)
  ) {
    ai.state = ai.target ? AIState.Pursue : AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Regroup behavior: fly away from target in a large loop
  if (ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent(world, ai.target, 'transform');
    if (targetTransform) {
      // Turn away from target with slight curve (looping maneuver)
      toTarget.copy(transform.position).sub(targetTransform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();
        // Add upward curve for looping effect (ship-relative up)
        localUp.set(0, 1, 0).applyQuaternion(transform.rotation);
        toTarget.addScaledVector(localUp, 0.3);
        toTarget.normalize();
        turnToward(ai, transform, toTarget);
      }
    }
  }

  // Cruise at moderate speed to conserve heat
  setSpeedInputs(ai, physics, physics.maxSpeed * 0.7);
}
