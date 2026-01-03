/**
 * Aim Error System - Updates AI aim drift over time.
 */

import type { AimError } from '../components/aim-error';
import { updateAimError } from '../components/aim-error';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

/** Aim error system - updates aim drift for AI entities */
export function aimErrorSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['aimError'])) {
    // Query guarantees this component exists
    const aimError = getComponent<AimError>(
      world,
      entity,
      'aimError',
    ) as AimError;
    updateAimError(aimError, world.prng, dt);
  }
}
