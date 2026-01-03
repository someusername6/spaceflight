/**
 * Aim Error System - Updates AI aim drift over time.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { AimError } from '../components/aim-error';
import { updateAimError } from '../components/aim-error';

/** Aim error system - updates aim drift for AI entities */
export function aimErrorSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['aimError'])) {
    const aimError = getComponent<AimError>(world, entity, 'aimError')!;
    updateAimError(aimError, dt);
  }
}
