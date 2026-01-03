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
  weaponIndex: number; // Which weapon slot this beam is from
}

// Active beams per entity (multiple beams possible in linked mode)
const activeBeams = new Map<Entity, ActiveBeam[]>();

// Reusable objects
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const tempOC = new THREE.Vector3(); // For ray-sphere intersection

/** Distance for falloff calculation (caps damage when very close) */
const MIN_FALLOFF_DISTANCE = 100;

/** Beam system - handles continuous beam damage */
export function beamSystem(world: World, dt: number): void {
  // Clear all beam states first
  for (const beams of activeBeams.values()) {
    for (const beam of beams) {
      beam.active = false;
    }
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

    // Check if firing (player or AI)
    let isFiring = false;
    if (player) {
      isFiring = player.input.firePrimary;
    }
    // AI beam firing would go here (AI doesn't use beams currently)

    if (!isFiring) continue;

    // Determine which beams to fire based on linked mode
    if (weapons.linked) {
      // Linked mode: fire all beams simultaneously
      fireLinkedBeams(world, entity, transform, weapons, heat, faction, dt);
    } else {
      // Single mode: only fire if current weapon is a beam
      const weapon = getCurrentPrimary(weapons);
      if (!weapon || weapon.category !== 'beam') continue;

      // Check heat - apply heat per second
      const heatToAdd = weapon.heatPerShot * dt;
      if (!addHeat(heat, heatToAdd)) continue; // Overheated

      // Fire single beam
      fireBeam(world, entity, transform, weapon, weapons.currentIndex, faction, dt);
    }
  }
}

/** Fire all beam weapons simultaneously (linked mode) */
function fireLinkedBeams(
  world: World,
  owner: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  dt: number
): void {
  // Find all beam weapons
  const beamWeapons: { weapon: PrimaryWeapon; index: number }[] = [];
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (weapon && weapon.category === 'beam') {
      beamWeapons.push({ weapon, index: i });
    }
  }

  if (beamWeapons.length === 0) return;

  // Calculate total heat per second for all beams
  const totalHeat = beamWeapons.reduce((sum, { weapon }) => sum + weapon.heatPerShot, 0);
  const heatToAdd = totalHeat * dt;

  // Check if we can add all the heat
  if (!addHeat(heat, heatToAdd)) return; // Overheated

  // Fire all beams
  for (const { weapon, index } of beamWeapons) {
    fireBeam(world, owner, transform, weapon, index, faction, dt);
  }
}

/** Fire a beam and process hits */
function fireBeam(
  world: World,
  owner: Entity,
  transform: Transform,
  weapon: PrimaryWeapon,
  weaponIndex: number,
  faction: FactionComponent | undefined,
  dt: number
): void {
  const forward = getForward(transform);
  rayOrigin.copy(transform.position);
  rayDirection.copy(forward);

  // Get or create beam array for this entity
  let beams = activeBeams.get(owner);
  if (!beams) {
    beams = [];
    activeBeams.set(owner, beams);
  }

  // Find or create beam state for this weapon slot
  let beam = beams.find(b => b.weaponIndex === weaponIndex);
  if (!beam) {
    beam = {
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      hitPoint: null,
      color: getBeamColor(weapon.name).clone(), // Clone to avoid modifying cache
      active: false,
      weaponIndex,
    };
    beams.push(beam);
  }

  beam.origin.copy(rayOrigin);
  beam.direction.copy(rayDirection);
  beam.active = true;
  beam.hitPoint = null;
  beam.color.copy(getBeamColor(weapon.name)); // Update color in case weapon changed

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

  // Reuse or create hitPoint vector (avoid per-frame allocation)
  if (!beam.hitPoint) {
    beam.hitPoint = new THREE.Vector3();
  }

  if (closestHit) {
    // Calculate hit point
    beam.hitPoint
      .copy(rayDirection)
      .multiplyScalar(closestHit.distance)
      .add(rayOrigin);

    // Apply damage with falloff (damage is per-second, multiply by dt)
    const falloffDamage = calculateFalloffDamage(weapon.damage, closestHit.distance);
    dealDamage(world, closestHit.entity, falloffDamage * dt);
  } else {
    // No hit - beam extends to max range
    beam.hitPoint
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
};
const DEFAULT_BEAM_COLOR = new THREE.Color(1, 1, 1);

/** Get beam color based on weapon name */
function getBeamColor(name: string): THREE.Color {
  return BEAM_COLORS[name] ?? DEFAULT_BEAM_COLOR;
}

/** Get all active beams for rendering */
export function getActiveBeams(): Map<Entity, ActiveBeam[]> {
  return activeBeams;
}

/** Reset beam system state */
export function resetBeamSystem(): void {
  activeBeams.clear();
}
