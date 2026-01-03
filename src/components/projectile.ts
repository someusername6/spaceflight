/**
 * Projectile component - data for flying projectiles.
 */

import type { ComponentBase, Entity, Vector3 } from '../core/types';

export interface Projectile extends ComponentBase {
  readonly type: 'projectile';
  owner: Entity; // Who fired this (for friendly fire checks)
  damage: number;
  speed: number;
  range: number;
  distanceTraveled: number;
  direction: Vector3; // Unit vector, direction of travel
}

/** Creates a Projectile component */
export function createProjectile(
  owner: Entity,
  damage: number,
  speed: number,
  range: number,
  direction: Vector3
): Projectile {
  return {
    type: 'projectile',
    owner,
    damage,
    speed,
    range,
    distanceTraveled: 0,
    direction: direction.clone().normalize(),
  };
}

/** Check if projectile is out of range */
export function isExpired(projectile: Projectile): boolean {
  return projectile.distanceTraveled >= projectile.range;
}
