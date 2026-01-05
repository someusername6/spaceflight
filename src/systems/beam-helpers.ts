/**
 * Beam System Helpers - Utility functions for beam weapons including
 * ray-sphere intersection, damage falloff, beam colors, and object pooling.
 */

import * as THREE from 'three';
import type { Collision } from '../components/collision';
import type { Health } from '../components/health';
import { isDead } from '../components/health';
import type { Transform } from '../components/transform';
import type { PrimaryWeapon } from '../components/weapons';
import { getComponent, hasComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Beam weapon info for pooling (avoid per-frame allocations) */
export interface BeamWeaponInfo {
  weapon: PrimaryWeapon;
  index: number;
}

const beamWeaponPool: BeamWeaponInfo[] = [];
/** Get a pooled BeamWeaponInfo object */
export function getBeamWeaponInfo(
  world: World,
  weapon: PrimaryWeapon,
  index: number,
): BeamWeaponInfo {
  const poolIndex = world.systemState.pools.beamWeapon;
  if (poolIndex >= beamWeaponPool.length) {
    beamWeaponPool.push({ weapon: null as unknown as PrimaryWeapon, index: 0 });
  }
  const info = beamWeaponPool[poolIndex] as BeamWeaponInfo;
  world.systemState.pools.beamWeapon++;
  info.weapon = weapon;
  info.index = index;
  return info;
}

/** Reset the beam weapon pool for a new frame */
export function resetBeamWeaponPool(world: World): void {
  world.systemState.pools.beamWeapon = 0;
}

// Reusable vector for ray-sphere intersection
const tempOC = new THREE.Vector3();

/** Distance for falloff calculation (caps damage when very close) */
export const MIN_FALLOFF_DISTANCE = 100;

/**
 * Calculate damage with 1/d falloff (linear inverse).
 * Less aggressive than 1/d² - beams are still useful at medium range.
 * @param baseDamage - Base damage value at reference distance
 * @param distance - Actual distance to target
 * @returns Damage adjusted for distance falloff
 */
export function calculateFalloffDamage(
  baseDamage: number,
  distance: number,
): number {
  const effectiveDistance = Math.max(MIN_FALLOFF_DISTANCE, distance);
  return baseDamage / (effectiveDistance / MIN_FALLOFF_DISTANCE);
}

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

// Cached beam colors (avoid per-frame allocation)
const BEAM_COLORS: Record<string, THREE.Color> = {
  'Red Laser': new THREE.Color(1, 0.2, 0.1),
  'Green Laser': new THREE.Color(0.2, 1, 0.2),
  'Blue Laser': new THREE.Color(0.2, 0.4, 1),
  Lightning: new THREE.Color(0.6, 0.8, 1.0), // Electric blue-white
  'Nuclear Lance': new THREE.Color(1.0, 0.95, 0.8), // Bright white-gold
};
const DEFAULT_BEAM_COLOR = new THREE.Color(1, 1, 1);

/**
 * Get beam color based on weapon name.
 * @param name - Weapon name
 * @returns Color for the beam visual
 */
export function getBeamColor(name: string): THREE.Color {
  return BEAM_COLORS[name] ?? DEFAULT_BEAM_COLOR;
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
    const otherHealth = getComponent<Health>(world, other, 'health');
    if (otherHealth && isDead(otherHealth)) continue;

    // Query guarantees these components exist
    const otherTransform = getComponent<Transform>(
      world,
      other,
      'transform',
    ) as Transform;
    const collision = getComponent<Collision>(
      world,
      other,
      'collision',
    ) as Collision;

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
