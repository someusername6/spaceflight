/**
 * Beam Raycasting - Hit detection for beam weapons using ray-sphere intersection.
 */

import * as THREE from 'three';
import { isDead } from '../../components/health';
import { getComponent, hasComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vector for ray-sphere intersection
const tempOC = new THREE.Vector3();

/**
 * Ray-sphere intersection test.
 * @param origin - Ray origin point
 * @param direction - Ray direction (normalized)
 * @param center - Sphere center
 * @param radius - Sphere radius
 * @returns Distance to intersection or null if no hit
 */
export function rayIntersectsSphere(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  center: THREE.Vector3,
  radius: number,
): number | null {
  // Use reusable tempOC to avoid per-call allocation
  tempOC.subVectors(origin, center);
  const a = direction.dot(direction);
  const b = 2 * tempOC.dot(direction);
  const c = tempOC.dot(tempOC) - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return null;

  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t > 0) return t;

  // Inside sphere or behind ray
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
  return t2 > 0 ? t2 : null;
}

// Reusable object for beam hit detection (avoid per-frame allocations)
const closestHitResult = { entity: 0 as Entity, distance: 0, hit: false };

/** Result of a beam hit check */
export interface BeamHitResult {
  hit: boolean;
  entity: Entity;
  distance: number;
}

/**
 * Find the closest entity hit by a beam ray.
 * @param world - The game world
 * @param owner - The entity firing the beam (excluded from hits)
 * @param rayOrigin - Origin point of the ray
 * @param rayDirection - Direction of the ray (normalized)
 * @param maxRange - Maximum range to check
 * @returns Hit result with entity and distance, or hit=false if no hit
 */
export function findBeamHit(
  world: World,
  owner: Entity,
  rayOrigin: THREE.Vector3,
  rayDirection: THREE.Vector3,
  maxRange: number,
): BeamHitResult {
  closestHitResult.hit = false;
  closestHitResult.distance = Infinity;

  for (const other of queryEntities(world, [
    'transform',
    'collision',
    'health',
  ])) {
    if (other === owner) continue;
    if (hasComponent(world, other, 'projectile')) continue;
    if (hasComponent(world, other, 'missile')) continue;

    // Skip dead or dying targets (already exploding)
    const otherHealth = getComponent(world, other, 'health');
    if (otherHealth && isDead(otherHealth)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    const collision = getComponent(world, other, 'collision');
    if (!otherTransform || !collision) continue;

    // Simple sphere intersection test
    const distance = rayIntersectsSphere(
      rayOrigin,
      rayDirection,
      otherTransform.position,
      collision.radius,
    );

    if (distance !== null && distance <= maxRange) {
      if (distance < closestHitResult.distance) {
        closestHitResult.hit = true;
        closestHitResult.entity = other;
        closestHitResult.distance = distance;
      }
    }
  }

  return {
    hit: closestHitResult.hit,
    entity: closestHitResult.entity,
    distance: closestHitResult.distance,
  };
}

/** Result of a beam hit check for multiple targets */
export interface BeamHitResultMulti {
  entity: Entity;
  distance: number;
}

/**
 * Find ALL entities hit by a beam ray (for instant beams like Nuclear Lance).
 * Returns hits sorted by distance (closest first).
 */
export function findAllBeamHits(
  world: World,
  owner: Entity,
  rayOrigin: THREE.Vector3,
  rayDirection: THREE.Vector3,
  maxRange: number,
): BeamHitResultMulti[] {
  const hits: BeamHitResultMulti[] = [];

  for (const other of queryEntities(world, [
    'transform',
    'collision',
    'health',
  ])) {
    if (other === owner) continue;
    if (hasComponent(world, other, 'projectile')) continue;
    if (hasComponent(world, other, 'missile')) continue;

    // Skip dead or dying targets (already exploding)
    const otherHealth = getComponent(world, other, 'health');
    if (otherHealth && isDead(otherHealth)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    const collision = getComponent(world, other, 'collision');
    if (!otherTransform || !collision) continue;

    const distance = rayIntersectsSphere(
      rayOrigin,
      rayDirection,
      otherTransform.position,
      collision.radius,
    );

    if (distance !== null && distance <= maxRange) {
      hits.push({ entity: other, distance });
    }
  }

  // Sort by distance (closest first)
  hits.sort((a, b) => a.distance - b.distance);
  return hits;
}
