/**
 * AI System - State machine and behavior for AI-controlled ships.
 */

import { type AIControlled, AIState } from '../../components/ai';
import { isDead } from '../../components/health';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
import type { SecondaryWeapons } from '../../components/weapons';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { AI_GLOBAL_SETTINGS } from '../../data/ai-profiles';
import {
  shouldEvade,
  shouldFleeDistance,
  shouldRegroup,
  updateEvade,
  updateRegroup,
} from './ai-behaviors';
import {
  DEFENSIVE_DISENGAGE_DISTANCE,
  STATION_DEFENSE_DISENGAGE_DISTANCE,
  updateIdle,
} from './ai-idle';
import { CLOSE_URGENTLY_THRESHOLD, isKitingShip } from './ai-movement';
import { maintainDistanceEngage, pursueTarget } from './ai-pursuit';
import {
  getHomingMissileLockSpeed,
  getHomingMissileRange,
  getStationApproachSpeed,
  hasHomingMissiles,
  STRAFING_MIN_RANGE,
  shouldReposition,
  updateReposition,
} from './ai-reposition';
import {
  countEngagingTarget,
  findNearestEnemy,
  getConvoyCentroid,
  getEnemyConvoyCentroid,
  getStationPosition,
  isPlayer,
  isTargetingStation,
  setAITarget,
} from './ai-utils';

// Re-export for backwards compatibility
export { findNearestEnemy, setAITarget, pursueTarget };

/** AI system - updates AI state and movement */
export function aiSystem(world: World, dt: number): void {
  // Cache convoy centroid once per tick (used by defensive wingmen and convoy-hunters)
  const convoyCentroid = getConvoyCentroid(world);

  // Cache station position once per tick (used by station-defense wingmen and station-hunters)
  const stationPosition = getStationPosition(world);

  // Cache enemy convoy centroid once per tick (used by convoy-interceptor wingmen in ambush missions)
  const enemyConvoyCentroid = getEnemyConvoyCentroid(world);

  for (const entity of queryEntities(world, [
    'aiControlled',
    'transform',
    'physics',
    'faction',
  ])) {
    // Skip dead or dying entities (they freeze during death animation)
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    const ai = getComponent(world, entity, 'aiControlled');
    const transform = getComponent(world, entity, 'transform');
    const physics = getComponent(world, entity, 'physics');
    const faction = getComponent(world, entity, 'faction');
    if (!ai || !transform || !physics || !faction) continue;

    // Reset inputs each frame (behaviors will set them as needed)
    ai.input.pitch = 0;
    ai.input.yaw = 0;
    ai.input.roll = 0;
    ai.input.accelerate = false;
    ai.input.decelerate = false;
    ai.input.afterburner = false;

    // Update state timer
    ai.stateTimer += dt;

    // Get shields, heat, and secondary weapons for state transitions
    const shields = getComponent(world, entity, 'shields');
    const heat = getComponent(world, entity, 'heat');
    const secondary = getComponent(world, entity, 'secondaryWeapons');

    // Check for emergency transitions (can happen from any combat state)
    if (ai.state === AIState.Pursue || ai.state === AIState.Engage) {
      // Defensive ships must disengage if convoy is too far ahead
      if (ai.behaviorMode === 'defensive' && convoyCentroid) {
        const distToConvoy = transform.position.distanceTo(convoyCentroid);
        if (distToConvoy > DEFENSIVE_DISENGAGE_DISTANCE) {
          // Disengage and follow convoy
          ai.target = null;
          ai.state = AIState.Idle;
          ai.stateTimer = 0;
        }
      }

      // Station-defense ships must disengage if too far from station
      if (ai.behaviorMode === 'station-defense' && stationPosition) {
        const distToStation = transform.position.distanceTo(stationPosition);
        if (distToStation > STATION_DEFENSE_DISENGAGE_DISTANCE) {
          // Disengage and return to station
          ai.target = null;
          ai.state = AIState.Idle;
          ai.stateTimer = 0;
        }
      }

      // Don't regroup when attacking stations with LONG-RANGE homing missiles
      // (need to complete lock from safe distance). Short-range missiles regroup normally.
      const hasLongRangeMissiles =
        isTargetingStation(world, ai) &&
        secondary &&
        hasHomingMissiles(secondary) &&
        getHomingMissileRange(secondary) >= STRAFING_MIN_RANGE;

      if (!hasLongRangeMissiles && shouldRegroup(shields, heat, ai.profile)) {
        ai.state = AIState.Regroup;
        ai.stateTimer = 0;
      } else if (shouldEvade(shields, ai.profile)) {
        ai.state = AIState.Evade;
        ai.stateTimer = 0;
      }
    }

    // Run state machine
    switch (ai.state) {
      case AIState.Idle:
        updateIdle(
          world,
          entity,
          ai,
          faction.faction,
          transform,
          convoyCentroid,
          stationPosition,
          enemyConvoyCentroid,
        );
        break;
      case AIState.Pursue:
        updatePursue(world, entity, ai, transform, physics, dt);
        break;
      case AIState.Engage:
        updateEngage(world, entity, ai, transform, physics, secondary, dt);
        break;
      case AIState.Evade:
        updateEvade(world, entity, ai, transform, physics, shields, heat, dt);
        break;
      case AIState.Regroup:
        updateRegroup(world, entity, ai, transform, physics, shields, heat, dt);
        break;
      case AIState.Reposition:
        updateReposition(
          world,
          entity,
          ai,
          transform,
          physics,
          dt,
          isTargetingStation(world, ai),
        );
        break;
    }
  }
}

/** Pursue state - chase target until in engage range */
function updatePursue(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number,
): void {
  // Check if target is still valid
  if (ai.target === null || !entityExists(world, ai.target)) {
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

  // Kiting ships flee when enemy gets too close
  if (shouldFleeDistance(ai, distance)) {
    ai.state = AIState.Evade;
    ai.stateTimer = 0;
    return;
  }

  // Transition to engage if close enough
  // Kiting ships engage at preferredCombatRange instead of profile.engageRange
  const engageThreshold = isKitingShip(ai)
    ? (ai.preferredCombatRange ?? ai.profile.engageRange)
    : ai.profile.engageRange;

  if (distance <= engageThreshold) {
    const targetIsPlayer = isPlayer(world, ai.target);
    const canEngage =
      !targetIsPlayer ||
      countEngagingTarget(world, ai.target) <
        AI_GLOBAL_SETTINGS.maxEngagingPlayer;

    if (canEngage) {
      ai.state = AIState.Engage;
      ai.stateTimer = 0;
    }
  }

  pursueTarget(world, entity, ai, transform, physics, dt);
}

/** Engage state - attack target while maintaining pursuit */
function updateEngage(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  secondary: SecondaryWeapons | undefined,
  dt: number,
): void {
  if (ai.target === null || !entityExists(world, ai.target)) {
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

  // Break off if target gets too far
  // Kiting ships: NEVER break off to pursue - they wait at range
  if (!isKitingShip(ai) && distance > ai.profile.breakOffRange) {
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
    return;
  }

  // Kiting ships return to idle if target is way too far (3x engage range)
  if (isKitingShip(ai) && distance > ai.profile.engageRange * 3) {
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Kiting ships flee when enemy gets too close
  if (shouldFleeDistance(ai, distance)) {
    ai.state = AIState.Evade;
    ai.stateTimer = 0;
    return;
  }

  // Check if attacking station with long-range homing missiles (strafing pattern)
  // Short-range missiles (dart, swarm) skip this and use normal pursuit
  const targetIsStation = isTargetingStation(world, ai);
  const hasHoming =
    targetIsStation && secondary && hasHomingMissiles(secondary);
  const missileRange = hasHoming ? getHomingMissileRange(secondary) : 0;
  const usesStrafing = hasHoming && missileRange >= STRAFING_MIN_RANGE;
  const lockProgress = secondary?.lockProgress ?? 0;

  // Station strafing pattern: only for ships with LONG-RANGE homing missiles
  if (targetIsStation && usesStrafing) {
    // Retreat after firing (lockProgress resets to 0) when too close
    if (shouldReposition(ai, distance, true, lockProgress, missileRange)) {
      ai.state = AIState.Reposition;
      ai.stateTimer = 0;
      return;
    }

    // Controlled approach: speed calculated so lock completes at safe distance
    const lockSpeed = getHomingMissileLockSpeed(secondary);
    const approachSpeed = getStationApproachSpeed(
      distance,
      lockProgress,
      lockSpeed,
      physics.maxSpeed,
      missileRange,
    );
    const speedFactor =
      physics.maxSpeed > 0 ? approachSpeed / physics.maxSpeed : 0;
    pursueTarget(world, entity, ai, transform, physics, dt, false, speedFactor);
    return;
  }

  // Check for burst-disengage (long-range ships reposition after burst)
  if (shouldReposition(ai, distance)) {
    ai.state = AIState.Reposition;
    ai.stateTimer = 0;
    return;
  }

  // Close urgently if beyond preferred range (ensures short-range weapons work)
  // Kiting ships: NEVER close urgently (they want to maintain range)
  const preferredRange = ai.preferredCombatRange ?? ai.profile.engageRange;
  const closeUrgently =
    !isKitingShip(ai) && distance > preferredRange * CLOSE_URGENTLY_THRESHOLD;

  // Kiting ships: always maintain distance, never chase
  // Enemy close: maintain distance (don't close further)
  // Enemy far: hold position (turn to face, wait for approach)
  if (isKitingShip(ai)) {
    maintainDistanceEngage(world, entity, ai, transform, physics, dt);
  } else {
    pursueTarget(world, entity, ai, transform, physics, dt, closeUrgently);
  }
}
