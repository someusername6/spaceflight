/**
 * Targeting System - Handles target selection and cycling for players.
 *
 * Updates valid target list, handles target cycling input (< > T keys),
 * and maintains lock-on progress for missiles.
 */

import {
  areEnemies,
  Faction,
  type FactionComponent,
} from '../components/faction';
import type { Health } from '../components/health';
import { isDead } from '../components/health';
import type { PlayerControlled } from '../components/player';
import type { Targeting } from '../components/targeting';
import type { Transform } from '../components/transform';
import {
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';

// Pool for target info objects (avoid per-frame allocations)
interface TargetCollectorInfo {
  entity: Entity;
  distance: number;
}
const targetCollectorPool: TargetCollectorInfo[] = [];

function getTargetCollectorInfo(
  world: World,
  entity: Entity,
  distance: number,
): TargetCollectorInfo {
  const poolIndex = world.systemState.pools.targetCollector;
  if (poolIndex >= targetCollectorPool.length) {
    targetCollectorPool.push({ entity: 0 as Entity, distance: 0 });
  }
  const info = targetCollectorPool[poolIndex] as TargetCollectorInfo;
  world.systemState.pools.targetCollector++;
  info.entity = entity;
  info.distance = distance;
  return info;
}

// Module-level sort comparator (avoid per-frame callback allocation)
function compareByDistance(
  a: TargetCollectorInfo,
  b: TargetCollectorInfo,
): number {
  return a.distance - b.distance;
}

// Reusable array for target collection (stores pool references)
const targetCollector: TargetCollectorInfo[] = [];

/** Targeting system - updates target selection based on input */
export function targetingSystem(world: World, _dt: number): void {
  const prevInput = world.systemState.targeting.prevInput;
  for (const entity of queryEntities(world, [
    'playerControlled',
    'targeting',
    'transform',
  ])) {
    // Query guarantees these components exist
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    ) as PlayerControlled;
    const targeting = getComponent<Targeting>(
      world,
      entity,
      'targeting',
    ) as Targeting;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');

    const selfFaction = faction?.faction ?? Faction.Player;

    // Update valid targets list
    updateValidTargets(world, entity, targeting, transform, selfFaction);

    // Clear target if it no longer exists or is no longer valid
    if (targeting.currentTarget !== undefined) {
      if (
        !entityExists(world, targeting.currentTarget) ||
        !targeting.validTargets.includes(targeting.currentTarget)
      ) {
        clearTarget(targeting);
        // Auto-select nearest after target lost
        if (targeting.validTargets.length > 0) {
          selectNearestTarget(targeting);
        }
      }
    }

    // Auto-select nearest target if player has no target but valid targets exist
    if (
      targeting.currentTarget === undefined &&
      targeting.validTargets.length > 0
    ) {
      selectNearestTarget(targeting);
    }

    const input = player.input;

    // Edge-triggered target cycling (only on key press, not hold)
    if (input.cycleTargetNext && !prevInput.cycleTargetNext) {
      cycleTarget(targeting, 1);
    }
    if (input.cycleTargetPrev && !prevInput.cycleTargetPrev) {
      cycleTarget(targeting, -1);
    }
    if (input.targetNearest && !prevInput.targetNearest) {
      selectNearestTarget(targeting);
    }

    // Update previous input state
    prevInput.cycleTargetNext = input.cycleTargetNext;
    prevInput.cycleTargetPrev = input.cycleTargetPrev;
    prevInput.targetNearest = input.targetNearest;
  }
}

/** Update the list of valid targets sorted by distance */
function updateValidTargets(
  world: World,
  self: Entity,
  targeting: Targeting,
  selfTransform: Transform,
  selfFaction: Faction,
): void {
  // Reset pool and clear collector array
  world.systemState.pools.targetCollector = 0;
  targetCollector.length = 0;

  // Query for all entities with targeting-relevant components, then filter
  // to include only ships (shipIdentity) or decoys (which appear as ships)
  for (const other of queryEntities(world, [
    'transform',
    'faction',
    'health',
  ])) {
    if (other === self) continue;

    // Only target ships and decoys (not missiles or projectiles)
    const isShip = hasComponent(world, other, 'shipIdentity');
    const isDecoy = hasComponent(world, other, 'decoy');
    if (!isShip && !isDecoy) continue;

    // Skip dead or dying entities
    const otherHealth = getComponent<Health>(world, other, 'health');
    if (otherHealth && isDead(otherHealth)) continue;

    const otherFaction = getComponent<FactionComponent>(
      world,
      other,
      'faction',
    );
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction))
      continue;

    // Query guarantees transform component exists
    const otherTransform = getComponent<Transform>(
      world,
      other,
      'transform',
    ) as Transform;
    const distance = selfTransform.position.distanceTo(otherTransform.position);

    targetCollector.push(getTargetCollectorInfo(world, other, distance));
  }

  // Sort by distance (nearest first) - use module-level comparator
  targetCollector.sort(compareByDistance);

  // Update the valid targets list and find current target's new index in one pass
  targeting.validTargets.length = targetCollector.length;
  let currentTargetIdx = -1;
  for (let i = 0; i < targetCollector.length; i++) {
    const entity = (targetCollector[i] as { entity: Entity }).entity;
    targeting.validTargets[i] = entity;
    if (entity === targeting.currentTarget) {
      currentTargetIdx = i;
    }
  }
  targeting.targetIndex = currentTargetIdx;
}

/** Cycle through targets in the given direction */
function cycleTarget(targeting: Targeting, direction: number): void {
  if (targeting.validTargets.length === 0) {
    clearTarget(targeting);
    return;
  }

  if (targeting.currentTarget === undefined) {
    // No current target - select first (nearest) or last based on direction
    targeting.targetIndex =
      direction > 0 ? 0 : targeting.validTargets.length - 1;
  } else {
    // Cycle to next/previous
    targeting.targetIndex += direction;

    // Wrap around
    if (targeting.targetIndex >= targeting.validTargets.length) {
      targeting.targetIndex = 0;
    } else if (targeting.targetIndex < 0) {
      targeting.targetIndex = targeting.validTargets.length - 1;
    }
  }

  targeting.currentTarget = targeting.validTargets[targeting.targetIndex];
  // Note: Lock reset is handled by weapons system when it detects target change
}

/** Select the nearest target */
function selectNearestTarget(targeting: Targeting): void {
  if (targeting.validTargets.length === 0) {
    clearTarget(targeting);
    return;
  }

  // Targets are already sorted by distance, so first is nearest
  targeting.targetIndex = 0;
  targeting.currentTarget = targeting.validTargets[0];
}

/** Clear the current target */
function clearTarget(targeting: Targeting): void {
  targeting.currentTarget = undefined;
  targeting.targetIndex = -1;
}

/** Get the current target entity (for external use) */
export function getCurrentTarget(targeting: Targeting): Entity | undefined {
  return targeting.currentTarget;
}
