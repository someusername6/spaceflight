/**
 * Serialization Utilities - Convert Three.js objects to/from plain JSON.
 *
 * Three.js Vector3 and Quaternion objects contain methods and internal state
 * that don't survive JSON serialization. These utilities provide clean
 * conversion to plain objects for:
 * - Network transmission (multiplayer state sync)
 * - Replay storage
 * - Save/load systems
 */

import { Color, Quaternion, Vector2, Vector3 } from 'three';

/** Plain object representation of Vector3 (JSON-serializable) */
export interface SerializedVector3 {
  x: number;
  y: number;
  z: number;
}

/** Plain object representation of Vector2 (JSON-serializable) */
export interface SerializedVector2 {
  x: number;
  y: number;
}

/** Plain object representation of Color (JSON-serializable) */
export interface SerializedColor {
  r: number;
  g: number;
  b: number;
}

/** Plain object representation of Quaternion (JSON-serializable) */
export interface SerializedQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Convert a Three.js Vector3 to a plain object.
 * The result can be safely JSON.stringify'd and transmitted.
 */
export function serializeVector3(v: Vector3): SerializedVector3 {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * Convert a plain object back to a Three.js Vector3.
 * Creates a new Vector3 instance.
 */
export function deserializeVector3(s: SerializedVector3): Vector3 {
  return new Vector3(s.x, s.y, s.z);
}

/**
 * Update an existing Vector3 from serialized data (avoids allocation).
 * Useful for frequently-updated state like interpolation targets.
 */
export function deserializeVector3Into(
  s: SerializedVector3,
  target: Vector3,
): Vector3 {
  return target.set(s.x, s.y, s.z);
}

/**
 * Convert a Three.js Quaternion to a plain object.
 * The result can be safely JSON.stringify'd and transmitted.
 */
export function serializeQuaternion(q: Quaternion): SerializedQuaternion {
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

/**
 * Convert a plain object back to a Three.js Quaternion.
 * Creates a new Quaternion instance.
 */
export function deserializeQuaternion(s: SerializedQuaternion): Quaternion {
  return new Quaternion(s.x, s.y, s.z, s.w);
}

/**
 * Update an existing Quaternion from serialized data (avoids allocation).
 * Useful for frequently-updated state like interpolation targets.
 */
export function deserializeQuaternionInto(
  s: SerializedQuaternion,
  target: Quaternion,
): Quaternion {
  return target.set(s.x, s.y, s.z, s.w);
}

/**
 * Convert a Three.js Vector2 to a plain object.
 */
export function serializeVector2(v: Vector2): SerializedVector2 {
  return { x: v.x, y: v.y };
}

/**
 * Convert a plain object back to a Three.js Vector2.
 */
export function deserializeVector2(s: SerializedVector2): Vector2 {
  return new Vector2(s.x, s.y);
}

/**
 * Convert a Three.js Color to a plain object.
 */
export function serializeColor(c: Color): SerializedColor {
  return { r: c.r, g: c.g, b: c.b };
}

/**
 * Convert a plain object back to a Three.js Color.
 */
export function deserializeColor(s: SerializedColor): Color {
  return new Color(s.r, s.g, s.b);
}

/** Serialized transform state for network transmission */
export interface SerializedTransform {
  position: SerializedVector3;
  rotation: SerializedQuaternion;
}

/**
 * Serialize a transform component's position and rotation.
 * Useful for full entity state snapshots.
 */
export function serializeTransform(
  position: Vector3,
  rotation: Quaternion,
): SerializedTransform {
  return {
    position: serializeVector3(position),
    rotation: serializeQuaternion(rotation),
  };
}

/**
 * Check if an object looks like a SerializedVector3.
 * Useful for type guards when receiving network data.
 */
export function isSerializedVector3(obj: unknown): obj is SerializedVector3 {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as SerializedVector3).x === 'number' &&
    typeof (obj as SerializedVector3).y === 'number' &&
    typeof (obj as SerializedVector3).z === 'number'
  );
}

/**
 * Check if an object looks like a SerializedQuaternion.
 * Useful for type guards when receiving network data.
 */
export function isSerializedQuaternion(
  obj: unknown,
): obj is SerializedQuaternion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as SerializedQuaternion).x === 'number' &&
    typeof (obj as SerializedQuaternion).y === 'number' &&
    typeof (obj as SerializedQuaternion).z === 'number' &&
    typeof (obj as SerializedQuaternion).w === 'number'
  );
}
