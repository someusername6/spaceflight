/**
 * Hardpoint Position Computation
 *
 * Converts SVG hardpoint coordinates to 3D world positions using the
 * mapping between SVG content bounds and mesh bounds.
 *
 * The coordinate transform works as follows:
 * 1. Hardpoint (svgX, svgY) is in the 64x64 SVG viewport
 * 2. SVG content bounds define where the ship silhouette is in the viewport
 * 3. Mesh bounds define the same shape in 3D space
 * 4. Map hardpoint position relative to SVG bounds -> mesh bounds
 */

import * as THREE from 'three';
import type { Transform } from '../../components/transform';
import { SHIP_CLASSES } from '../../data/ships';
import { SHIP_MODEL_SCALE } from '../../rendering/constants';
import {
  type MeshBounds,
  SHIP_GEOMETRIES,
  type ShipClass,
  type SvgBounds,
} from '../../rendering/ship-geometries';

/** Fallback SVG bounds if not available (assumes full 64x64 viewport) */
const DEFAULT_SVG_BOUNDS: SvgBounds = { minX: 0, maxX: 64, minY: 0, maxY: 64 };

/** Reusable vectors to avoid per-call allocations */
const localOffset = new THREE.Vector3();
const rightAxis = new THREE.Vector3();
const forwardAxis = new THREE.Vector3();

/**
 * Convert SVG viewport coordinates to local 3D offset from ship center.
 *
 * @param svgX - X position in SVG viewport (0-64)
 * @param svgY - Y position in SVG viewport (0-64)
 * @param meshBounds - 3D mesh bounding box
 * @param svgBounds - SVG content bounding box (or null for fallback)
 * @returns Local offset vector (x = right, z = forward/backward)
 */
function svgToLocalOffset(
  svgX: number,
  svgY: number,
  meshBounds: MeshBounds,
  svgBounds: SvgBounds | null,
): THREE.Vector3 {
  const svg = svgBounds ?? DEFAULT_SVG_BOUNDS;

  // Hardpoint position relative to SVG content bounds (0 to 1)
  const relativeX = (svgX - svg.minX) / (svg.maxX - svg.minX);
  const relativeY = (svgY - svg.minY) / (svg.maxY - svg.minY);

  // Map to mesh bounds, then apply scale
  const x =
    (meshBounds.minX + relativeX * (meshBounds.maxX - meshBounds.minX)) *
    SHIP_MODEL_SCALE;
  const z =
    (meshBounds.minZ + relativeY * (meshBounds.maxZ - meshBounds.minZ)) *
    SHIP_MODEL_SCALE;

  return localOffset.set(x, 0, z);
}

/**
 * Check if a string is a valid ship class with geometry data.
 */
function isShipClass(name: string): name is ShipClass {
  return name in SHIP_GEOMETRIES;
}

/**
 * Get 3D world position for a primary weapon hardpoint.
 *
 * @param out - Vector3 to store the result (modified in place)
 * @param transform - Ship's current transform (position and rotation)
 * @param shipClassName - Ship class name (e.g., 'fighter', 'bomber')
 * @param bankIndex - Which weapon bank (0-indexed)
 * @param forwardOffset - Additional forward offset from ship center
 * @returns true if position was computed, false if hardpoint data unavailable
 */
export function getHardpointWorldPosition(
  out: THREE.Vector3,
  transform: Transform,
  shipClassName: string,
  bankIndex: number,
  forwardOffset: number,
): boolean {
  // Get ship class data (hardpoints)
  const shipClass = SHIP_CLASSES[shipClassName];
  if (!shipClass || !shipClass.primaryHardpoints) {
    return false;
  }

  // Get hardpoint for this bank
  const hardpoints = shipClass.primaryHardpoints;
  const hardpoint = hardpoints[bankIndex];
  if (!hardpoint) {
    return false;
  }

  // Get geometry data (bounds)
  if (!isShipClass(shipClassName)) {
    return false;
  }

  const geometry = SHIP_GEOMETRIES[shipClassName];

  // Compute local offset from SVG coordinates
  const offset = svgToLocalOffset(
    hardpoint.svgX,
    hardpoint.svgY,
    geometry.bounds,
    geometry.svgBounds,
  );

  // Transform to world space
  // The mesh is rotated -90 degrees on X, so:
  // - Local X (right) stays as world X
  // - Local Z becomes world -Z (forward is -Z after rotation)
  rightAxis.set(1, 0, 0).applyQuaternion(transform.rotation);
  forwardAxis.set(0, 0, -1).applyQuaternion(transform.rotation);

  out
    .copy(transform.position)
    .addScaledVector(rightAxis, offset.x)
    .addScaledVector(forwardAxis, -offset.z) // Negate Z for correct forward direction
    .addScaledVector(forwardAxis, forwardOffset);

  return true;
}

/**
 * Get local offset for a primary weapon hardpoint (for muzzle flash tracking).
 *
 * Returns a plain object that can be stored and used later with any transform.
 * The offset is in the ship's local coordinate system.
 *
 * @param shipClassName - Ship class name (e.g., 'fighter', 'bomber')
 * @param bankIndex - Which weapon bank (0-indexed)
 * @param forwardOffset - Additional forward offset from ship center
 * @returns Local offset object { x, y, z } or null if data unavailable
 */
export function getHardpointLocalOffset(
  shipClassName: string,
  bankIndex: number,
  forwardOffset: number,
): { x: number; y: number; z: number } | null {
  // Get ship class data (hardpoints)
  const shipClass = SHIP_CLASSES[shipClassName];
  if (!shipClass || !shipClass.primaryHardpoints) {
    return null;
  }

  // Get hardpoint for this bank
  const hardpoints = shipClass.primaryHardpoints;
  const hardpoint = hardpoints[bankIndex];
  if (!hardpoint) {
    return null;
  }

  // Get geometry data (bounds)
  if (!isShipClass(shipClassName)) {
    return null;
  }

  const geometry = SHIP_GEOMETRIES[shipClassName];

  // Compute local offset from SVG coordinates
  const offset = svgToLocalOffset(
    hardpoint.svgX,
    hardpoint.svgY,
    geometry.bounds,
    geometry.svgBounds,
  );

  // Return as plain object with forward offset applied
  // Note: offset.x = right, offset.z = backward (needs negation + forwardOffset)
  return {
    x: offset.x,
    y: 0,
    z: -offset.z + forwardOffset,
  };
}
