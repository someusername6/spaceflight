/**
 * Heat System - Cools down heat over time for all entities.
 *
 * Note: Weapon system also cools, but this catches entities without weapons.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Heat } from '../components/heat';
import { coolDown } from '../components/heat';

/** Heat system - passive cooling */
export function heatSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['heat'])) {
    const heat = getComponent<Heat>(world, entity, 'heat')!;
    coolDown(heat, dt);
  }
}
