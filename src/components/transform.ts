/**
 * Transform component - position and rotation in 3D space.
 */

import { Quaternion, Vector3 } from 'three';
import {
  deserializeQuaternion,
  deserializeVector3,
  type SerializedQuaternion,
  type SerializedVector3,
  serializeQuaternion,
  serializeVector3,
} from '../core/serialization';
import type { ComponentBase } from '../core/types';

export interface Transform extends ComponentBase {
  readonly type: 'transform';
  position: Vector3;
  rotation: Quaternion;
}

/** Creates a Transform component at origin with no rotation */
export function createTransform(
  x = 0,
  y = 0,
  z = 0,
  rotation?: Quaternion,
): Transform {
  return {
    type: 'transform',
    position: new Vector3(x, y, z),
    rotation: rotation?.clone() ?? new Quaternion(),
  };
}

/** Creates a Transform at a specific position */
export function createTransformAt(
  position: Vector3,
  rotation?: Quaternion,
): Transform {
  return {
    type: 'transform',
    position: position.clone(),
    rotation: rotation?.clone() ?? new Quaternion(),
  };
}

// =============================================================================
// Serialization
// =============================================================================

export interface SerializedTransform {
  /** Component type ID (0 = transform) */
  t: 0;
  /** Position */
  p: SerializedVector3;
  /** Rotation */
  r: SerializedQuaternion;
}

export function serializeTransform(c: Transform): SerializedTransform {
  return {
    t: 0,
    p: serializeVector3(c.position),
    r: serializeQuaternion(c.rotation),
  };
}

export function deserializeTransform(s: SerializedTransform): Transform {
  return {
    type: 'transform',
    position: deserializeVector3(s.p),
    rotation: deserializeQuaternion(s.r),
  };
}
