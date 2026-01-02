/**
 * Transform component - position and rotation in 3D space.
 */

import { Vector3, Quaternion } from 'three';
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
  rotation?: Quaternion
): Transform {
  return {
    type: 'transform',
    position: new Vector3(x, y, z),
    rotation: rotation?.clone() ?? new Quaternion(),
  };
}

/** Creates a Transform at a specific position */
export function createTransformAt(position: Vector3, rotation?: Quaternion): Transform {
  return {
    type: 'transform',
    position: position.clone(),
    rotation: rotation?.clone() ?? new Quaternion(),
  };
}
