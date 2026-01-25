/**
 * Collision Component - Stores collision detection info for entities.
 */

import type { ComponentBase, Entity } from '../core/types';

/** Default collision radius for ships */
export const DEFAULT_COLLISION_RADIUS = 5;

/** Collision component - stores collision info for this frame */
export interface Collision extends ComponentBase {
  readonly type: 'collision';
  collidedWith: Entity[];
  radius: number;
}

/** Creates a Collision component */
export function createCollision(radius = DEFAULT_COLLISION_RADIUS): Collision {
  return {
    type: 'collision',
    collidedWith: [],
    radius,
  };
}

// =============================================================================
// Serialization
// =============================================================================

export interface SerializedCollision {
  t: 3; // Component type ID
  c: Entity[]; // collidedWith
  r: number; // radius
}

export function serializeCollision(c: Collision): SerializedCollision {
  return { t: 3, c: [...c.collidedWith], r: c.radius };
}

export function deserializeCollision(s: SerializedCollision): Collision {
  return { type: 'collision', collidedWith: [...s.c], radius: s.r };
}
