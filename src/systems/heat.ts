/**
 * Heat System - Cools down heat over time for all entities.
 *
 * Note: Weapon system also cools, but this catches entities without weapons.
 */

import type { Heat } from '../components/heat';
import { coolDown } from '../components/heat';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

/** Heat system - passive cooling */
export function heatSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['heat'])) {
    // Query guarantees this component exists
    const heat = getComponent<Heat>(world, entity, 'heat') as Heat;
    coolDown(heat, dt);
  }
}
