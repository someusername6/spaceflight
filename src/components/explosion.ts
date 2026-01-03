/**
 * Explosion component - marks an expanding explosion effect.
 */

import * as THREE from 'three';
import type { ComponentBase, Entity } from '../core/types';

export interface Explosion extends ComponentBase {
  readonly type: 'explosion';
  /** Current age in seconds */
  age: number;
  /** Total lifetime in seconds */
  maxAge: number;
  /** Base size (ship radius) */
  size: number;
  /** Explosion color */
  color: THREE.Color;
  /** Source entity to follow (for coasting dying ships) */
  sourceEntity?: Entity;
}

/** Default explosion duration */
const DEFAULT_MAX_AGE = 0.8;

/** Creates an Explosion component */
export function createExplosion(
  size: number,
  color: THREE.Color = new THREE.Color(0xff6600),
  sourceEntity?: Entity
): Explosion {
  const explosion: Explosion = {
    type: 'explosion',
    age: 0,
    maxAge: DEFAULT_MAX_AGE,
    size,
    color,
  };
  if (sourceEntity !== undefined) {
    explosion.sourceEntity = sourceEntity;
  }
  return explosion;
}

/** Get normalized progress (0-1) */
export function getExplosionProgress(explosion: Explosion): number {
  return Math.min(1, explosion.age / explosion.maxAge);
}

/** Check if explosion is finished */
export function isExplosionFinished(explosion: Explosion): boolean {
  return explosion.age >= explosion.maxAge;
}
