/**
 * Beam System - Handles continuous beam weapon firing and damage.
 */

import * as THREE from 'three';
import type { World, Entity } from '../core/types';
import { queryEntities, getComponent, hasComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { PlayerControlled } from '../components/player';
import type { PrimaryWeapons, PrimaryWeapon } from '../components/weapons';
import { getCurrentPrimary } from '../components/weapons';
import type { Heat } from '../components/heat';
import { addHeat } from '../components/heat';
import type { FactionComponent } from '../components/faction';
import { areEnemies } from '../components/faction';
import type { Collision } from './collision';
import { dealDamage } from './damage';
import { getForward } from './physics';
import type { Health } from '../components/health';
import { isDying } from '../components/health';

/** Active beam state for rendering */
export interface ActiveBeam {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  hitPoint: THREE.Vector3 | null;
  color: THREE.Color;
  active: boolean;
}

// Active beams (one per entity that might fire beams)
const activeBeams = new Map<Entity, ActiveBeam>();

// Reusable objects
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();

/** Distance for falloff calculation (caps damage when very close) */
const MIN_FALLOFF_DISTANCE = 100;

/** Beam system - handles continuous beam damage */
export function beamSystem(world: World, dt: number): void {
  // Clear all beam states first
  for (const beam of activeBeams.values()) {
    beam.active = false;
  }

  // Process each entity with primary weapons
  for (const entity of queryEntities(world, ['transform', 'primaryWeapons', 'heat'])) {
    // Skip dying entities (can't fire while exploding)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDying(health)) continue;

    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const weapons = getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons')!;
    const heat = getComponent<Heat>(world, entity, 'heat')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled');

    const weapon = getCurrentPrimary(weapons);
    if (!weapon || weapon.category !== 'beam') continue;

    // Check if firing (player or AI)
    let isFiring = false;
    if (player) {
      isFiring = player.input.firePrimary;
    }
    // AI beam firing would go here

    if (!isFiring) continue;

    // Check heat - apply heat per second
    const heatToAdd = weapon.heatPerShot * dt;
    if (!addHeat(heat, heatToAdd)) continue; // Overheated

    // Fire beam
    fireBeam(world, entity, transform, weapon, faction, dt);
  }
}

/** Fire a beam and process hits */
function fireBeam(
  world: World,
  owner: Entity,
  transform: Transform,
  weapon: PrimaryWeapon,
  faction: FactionComponent | undefined,
  dt: number
): void {
  const forward = getForward(transform);
  rayOrigin.copy(transform.position);
  rayDirection.copy(forward);

  // Get or create beam state
  let beam = activeBeams.get(owner);
  if (!beam) {
    beam = {
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      hitPoint: null,
      color: getBeamColor(weapon.name),
      active: false,
    };
    activeBeams.set(owner, beam);
  }

  beam.origin.copy(rayOrigin);
  beam.direction.copy(rayDirection);
  beam.active = true;
  beam.hitPoint = null;

  // Find nearest enemy in beam path
  let closestHit: { entity: Entity; distance: number } | null = null;

  for (const other of queryEntities(world, ['transform', 'collision', 'health'])) {
    if (other === owner) continue;
    if (hasComponent(world, other, 'projectile')) continue;
    if (hasComponent(world, other, 'missile')) continue;

    // Skip dying targets (already exploding)
    const otherHealth = getComponent<Health>(world, other, 'health')!;
    if (isDying(otherHealth)) continue;

    const otherFaction = getComponent<FactionComponent>(world, other, 'faction');
    if (faction && otherFaction && !areEnemies(faction.faction, otherFaction.faction)) continue;

    const otherTransform = getComponent<Transform>(world, other, 'transform')!;
    const collision = getComponent<Collision>(world, other, 'collision')!;

    // Simple sphere intersection test
    const distance = rayIntersectsSphere(
      rayOrigin,
      rayDirection,
      otherTransform.position,
      collision.radius
    );

    if (distance !== null && distance <= weapon.range) {
      if (!closestHit || distance < closestHit.distance) {
        closestHit = { entity: other, distance };
      }
    }
  }

  if (closestHit) {
    // Calculate hit point
    beam.hitPoint = new THREE.Vector3()
      .copy(rayDirection)
      .multiplyScalar(closestHit.distance)
      .add(rayOrigin);

    // Apply damage with falloff (damage is per-second, multiply by dt)
    const falloffDamage = calculateFalloffDamage(weapon.damage, closestHit.distance);
    dealDamage(world, closestHit.entity, falloffDamage * dt);
  } else {
    // No hit - beam extends to max range
    beam.hitPoint = new THREE.Vector3()
      .copy(rayDirection)
      .multiplyScalar(weapon.range)
      .add(rayOrigin);
  }
}

/** Calculate damage with 1/d² falloff */
function calculateFalloffDamage(baseDamage: number, distance: number): number {
  const effectiveDistance = Math.max(MIN_FALLOFF_DISTANCE, distance);
  return baseDamage / Math.pow(effectiveDistance / MIN_FALLOFF_DISTANCE, 2);
}

/** Ray-sphere intersection test, returns distance or null */
function rayIntersectsSphere(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  center: THREE.Vector3,
  radius: number
): number | null {
  const oc = new THREE.Vector3().subVectors(origin, center);
  const a = direction.dot(direction);
  const b = 2 * oc.dot(direction);
  const c = oc.dot(oc) - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return null;

  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t > 0) return t;

  // Inside sphere or behind ray
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
  return t2 > 0 ? t2 : null;
}

/** Get beam color based on weapon name */
function getBeamColor(name: string): THREE.Color {
  switch (name) {
    case 'Red Laser': return new THREE.Color(1, 0.2, 0.1);
    case 'Green Laser': return new THREE.Color(0.2, 1, 0.2);
    case 'Blue Laser': return new THREE.Color(0.2, 0.4, 1);
    default: return new THREE.Color(1, 1, 1);
  }
}

/** Get all active beams for rendering */
export function getActiveBeams(): Map<Entity, ActiveBeam> {
  return activeBeams;
}

/** Reset beam system state */
export function resetBeamSystem(): void {
  activeBeams.clear();
}
