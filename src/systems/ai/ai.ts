/**
 * AI System - State machine and behavior for AI-controlled ships.
 */

import { type AIControlled, AIState } from '../../components/ai';
import { Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
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
import { CLOSE_URGENTLY_THRESHOLD, isKitingShip } from './ai-movement';
import { maintainDistanceEngage, pursueTarget } from './ai-pursuit';
import { shouldReposition, updateReposition } from './ai-reposition';
import {
  countEngagingTarget,
  findNearestEnemy,
  findNearestThreatToPlayer,
  isPlayer,
  setAITarget,
} from './ai-utils';

// Re-export for backwards compatibility
export { findNearestEnemy, setAITarget, pursueTarget };

/** AI system - updates AI state and movement */
export function aiSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, [
    'aiControlled',
    'transform',
    'physics',
    'faction',
  ])) {
    // Skip dead or dying entities (they freeze during death animation)
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    // Query guarantees these components exist
    const ai = getComponent(world, entity, 'aiControlled')!;
    const transform = getComponent(world, entity, 'transform')!;
    const physics = getComponent(world, entity, 'physics')!;
    const faction = getComponent(world, entity, 'faction')!;

    // Reset inputs each frame (behaviors will set them as needed)
    ai.input.pitch = 0;
    ai.input.yaw = 0;
    ai.input.roll = 0;
    ai.input.accelerate = false;
    ai.input.decelerate = false;
    ai.input.afterburner = false;

    // Update state timer
    ai.stateTimer += dt;

    // Get shields and heat for state transitions
    const shields = getComponent(world, entity, 'shields');
    const heat = getComponent(world, entity, 'heat');

    // Check for emergency transitions (can happen from any combat state)
    if (ai.state === AIState.Pursue || ai.state === AIState.Engage) {
      if (shouldRegroup(shields, heat, ai.profile)) {
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
        updateIdle(world, entity, ai, faction.faction);
        break;
      case AIState.Pursue:
        updatePursue(world, entity, ai, transform, physics, dt);
        break;
      case AIState.Engage:
        updateEngage(world, entity, ai, transform, physics, dt);
        break;
      case AIState.Evade:
        updateEvade(world, entity, ai, transform, physics, shields, heat, dt);
        break;
      case AIState.Regroup:
        updateRegroup(world, entity, ai, transform, physics, shields, heat, dt);
        break;
      case AIState.Reposition:
        updateReposition(world, entity, ai, transform, physics, dt);
        break;
    }
  }
}

/** Idle state - look for enemies */
function updateIdle(
  world: World,
  entity: Entity,
  ai: AIControlled,
  faction: Faction,
): void {
  let target: Entity | null = null;

  // Wingmen (Faction.Player) prioritize enemies threatening the player
  if (faction === Faction.Player) {
    target = findNearestThreatToPlayer(world, entity, faction);
  }

  // Fall back to nearest enemy if no threat found (or for enemies)
  if (target === null) {
    target = findNearestEnemy(world, entity, faction);
  }

  if (target !== null) {
    ai.target = target;
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
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

  // Kiting ships flee when enemy gets too close
  if (shouldFleeDistance(ai, distance)) {
    ai.state = AIState.Evade;
    ai.stateTimer = 0;
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
