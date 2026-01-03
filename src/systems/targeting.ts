/**
 * Targeting System - Handles target selection and cycling for players.
 *
 * Updates valid target list, handles target cycling input (< > T keys),
 * and maintains lock-on progress for missiles.
 */

import type { World, Entity } from '../core/types';
import { queryEntities, getComponent, entityExists } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { PlayerControlled } from '../components/player';
import type { Targeting } from '../components/targeting';
import { type FactionComponent, areEnemies, Faction } from '../components/faction';
import type { Health } from '../components/health';
import { isDying } from '../components/health';

/** Track previous input state for edge detection (only trigger on key press, not hold) */
const prevInput = {
  cycleTargetNext: false,
  cycleTargetPrev: false,
  targetNearest: false,
};

/** Targeting system - updates target selection based on input */
export function targetingSystem(world: World, _dt: number): void {
  for (const entity of queryEntities(world, ['playerControlled', 'targeting', 'transform'])) {
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled')!;
    const targeting = getComponent<Targeting>(world, entity, 'targeting')!;
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');

    const selfFaction = faction?.faction ?? Faction.Player;

    // Update valid targets list
    updateValidTargets(world, entity, targeting, transform, selfFaction);

    // Clear target if it no longer exists or is no longer valid
    if (targeting.currentTarget !== undefined) {
      if (!entityExists(world, targeting.currentTarget) ||
          !targeting.validTargets.includes(targeting.currentTarget)) {
        clearTarget(targeting);
      }
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
  selfFaction: Faction
): void {
  const targets: { entity: Entity; distance: number }[] = [];

  for (const other of queryEntities(world, ['transform', 'faction', 'health'])) {
    if (other === self) continue;

    // Skip dying enemies (already exploding)
    const otherHealth = getComponent<Health>(world, other, 'health')!;
    if (isDying(otherHealth)) continue;

    const otherFaction = getComponent<FactionComponent>(world, other, 'faction');
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction)) continue;

    const otherTransform = getComponent<Transform>(world, other, 'transform')!;
    const distance = selfTransform.position.distanceTo(otherTransform.position);

    targets.push({ entity: other, distance });
  }

  // Sort by distance (nearest first)
  targets.sort((a, b) => a.distance - b.distance);

  // Update the valid targets list
  targeting.validTargets = targets.map(t => t.entity);

  // Update target index if current target is still valid
  if (targeting.currentTarget !== undefined) {
    const idx = targeting.validTargets.indexOf(targeting.currentTarget);
    targeting.targetIndex = idx;
  }
}

/** Cycle through targets in the given direction */
function cycleTarget(targeting: Targeting, direction: number): void {
  if (targeting.validTargets.length === 0) {
    clearTarget(targeting);
    return;
  }

  if (targeting.currentTarget === undefined) {
    // No current target - select first (nearest) or last based on direction
    targeting.targetIndex = direction > 0 ? 0 : targeting.validTargets.length - 1;
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
