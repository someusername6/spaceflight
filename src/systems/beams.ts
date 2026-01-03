/**
 * Beam System - Handles continuous beam weapon firing and damage.
 */

import * as THREE from 'three';
import type { Health } from '../components/health';
import { isDying } from '../components/health';
import type { Heat } from '../components/heat';
import { addHeat } from '../components/heat';
import type { PlayerControlled } from '../components/player';
import type { Transform } from '../components/transform';
import type { PrimaryWeapon, PrimaryWeapons } from '../components/weapons';
import { getCurrentPrimary } from '../components/weapons';
import { getComponent, hasComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Collision } from './collision';
import { dealDamage } from './damage';
import { getForward } from './physics';
import { calculateBankOffset } from './weapon-spawning';

/** Active beam state for rendering */
export interface ActiveBeam {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  hitPoint: THREE.Vector3 | null;
  color: THREE.Color;
  active: boolean;
  weaponIndex: number; // Which weapon slot this beam is from
}

// Reusable objects
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const tempOC = new THREE.Vector3(); // For ray-sphere intersection

// Pool for beam weapon info objects (avoid per-frame allocations)
interface BeamWeaponInfo {
  weapon: PrimaryWeapon;
  index: number;
}
const beamWeaponPool: BeamWeaponInfo[] = [];
let beamWeaponPoolIndex = 0;

function getBeamWeaponInfo(
  weapon: PrimaryWeapon,
  index: number,
): BeamWeaponInfo {
  if (beamWeaponPoolIndex >= beamWeaponPool.length) {
    beamWeaponPool.push({ weapon: null as unknown as PrimaryWeapon, index: 0 });
  }
  const info = beamWeaponPool[beamWeaponPoolIndex++] as BeamWeaponInfo;
  info.weapon = weapon;
  info.index = index;
  return info;
}

// Reusable array for linked beam firing (stores pool references)
const beamWeaponsCollector: BeamWeaponInfo[] = [];

// Reusable object for beam hit detection (avoid per-frame allocations)
const closestHitResult = { entity: 0 as Entity, distance: 0 };
let hasClosestHit = false;

/** Distance for falloff calculation (caps damage when very close) */
const MIN_FALLOFF_DISTANCE = 100;

/** Beam system - handles continuous beam damage */
export function beamSystem(world: World, dt: number): void {
  const activeBeams = world.systemState.beams.activeBeams;

  // Clear all beam states first
  for (const beams of activeBeams.values()) {
    for (const beam of beams) {
      beam.active = false;
    }
  }

  // Process each entity with primary weapons
  for (const entity of queryEntities(world, [
    'transform',
    'primaryWeapons',
    'heat',
  ])) {
    // Skip dying entities (can't fire while exploding)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDying(health)) continue;

    // Query guarantees these components exist
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const weapons = getComponent<PrimaryWeapons>(
      world,
      entity,
      'primaryWeapons',
    ) as PrimaryWeapons;
    const heat = getComponent<Heat>(world, entity, 'heat') as Heat;
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );

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
      fireLinkedBeams(world, entity, transform, weapons, heat, dt, activeBeams);
    } else {
      // Single mode: only fire if current weapon is a beam
      const weapon = getCurrentPrimary(weapons);
      if (!weapon || weapon.category !== 'beam') continue;

      // Check heat - apply heat per second
      const heatToAdd = weapon.heatPerShot * dt;
      if (!addHeat(heat, heatToAdd)) continue; // Overheated

      // Fire single beam
      fireBeam(
        world,
        entity,
        transform,
        weapon,
        weapons.currentIndex,
        weapons.weapons.length,
        dt,
        activeBeams,
      );
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
  dt: number,
  activeBeams: Map<Entity, ActiveBeam[]>,
): void {
  // Reset pool and clear collector (avoid per-frame allocations)
  beamWeaponPoolIndex = 0;
  beamWeaponsCollector.length = 0;

  // Find all beam weapons
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (weapon && weapon.category === 'beam') {
      beamWeaponsCollector.push(getBeamWeaponInfo(weapon, i));
    }
  }

  if (beamWeaponsCollector.length === 0) return;

  // Calculate total heat per second for all beams (avoid reduce callback allocation)
  let totalHeat = 0;
  for (const { weapon } of beamWeaponsCollector) {
    totalHeat += weapon.heatPerShot;
  }
  const heatToAdd = totalHeat * dt;

  // Check if we can add all the heat
  if (!addHeat(heat, heatToAdd)) return; // Overheated

  // Fire all beams
  const totalBanks = weapons.weapons.length;
  for (const { weapon, index } of beamWeaponsCollector) {
    fireBeam(
      world,
      owner,
      transform,
      weapon,
      index,
      totalBanks,
      dt,
      activeBeams,
    );
  }
}

/** Beam spawn offset from ship center (forward) */
const BEAM_SPAWN_OFFSET = 3;

/** Fire a beam and process hits */
function fireBeam(
  world: World,
  owner: Entity,
  transform: Transform,
  weapon: PrimaryWeapon,
  weaponIndex: number,
  totalBanks: number,
  dt: number,
  activeBeams: Map<Entity, ActiveBeam[]>,
): void {
  const forward = getForward(transform);
  // Calculate beam origin with bank offset
  const origin = calculateBankOffset(
    transform,
    weaponIndex,
    totalBanks,
    BEAM_SPAWN_OFFSET,
  );
  rayOrigin.copy(origin);
  rayDirection.copy(forward);

  // Get or create beam array for this entity
  let beams = activeBeams.get(owner);
  if (!beams) {
    beams = [];
    activeBeams.set(owner, beams);
  }

  // Find or create beam state for this weapon slot (loop instead of .find())
  let beam: ActiveBeam | undefined;
  for (let i = 0; i < beams.length; i++) {
    if (beams[i]?.weaponIndex === weaponIndex) {
      beam = beams[i];
      break;
    }
  }
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

  // Find nearest enemy in beam path (use reusable object instead of allocating)
  hasClosestHit = false;
  closestHitResult.distance = Infinity;

  for (const other of queryEntities(world, [
    'transform',
    'collision',
    'health',
  ])) {
    if (other === owner) continue;
    if (hasComponent(world, other, 'projectile')) continue;
    if (hasComponent(world, other, 'missile')) continue;

    // Skip dying targets (already exploding)
    // Query guarantees health component exists
    const otherHealth = getComponent<Health>(world, other, 'health') as Health;
    if (isDying(otherHealth)) continue;

    // Friendly fire enabled - beams damage anyone except owner

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

    if (distance !== null && distance <= weapon.range) {
      if (distance < closestHitResult.distance) {
        hasClosestHit = true;
        closestHitResult.entity = other;
        closestHitResult.distance = distance;
      }
    }
  }

  // Reuse or create hitPoint vector (avoid per-frame allocation)
  if (!beam.hitPoint) {
    beam.hitPoint = new THREE.Vector3();
  }

  if (hasClosestHit) {
    // Calculate hit point
    beam.hitPoint
      .copy(rayDirection)
      .multiplyScalar(closestHitResult.distance)
      .add(rayOrigin);

    // Apply damage with falloff (damage is per-second, multiply by dt)
    const falloffDamage = calculateFalloffDamage(
      weapon.damage,
      closestHitResult.distance,
    );
    dealDamage(
      world,
      closestHitResult.entity,
      falloffDamage * dt,
      beam.hitPoint,
    );
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
  return baseDamage / (effectiveDistance / MIN_FALLOFF_DISTANCE) ** 2;
}

/** Ray-sphere intersection test, returns distance or null */
function rayIntersectsSphere(
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
};
const DEFAULT_BEAM_COLOR = new THREE.Color(1, 1, 1);

/** Get beam color based on weapon name */
function getBeamColor(name: string): THREE.Color {
  return BEAM_COLORS[name] ?? DEFAULT_BEAM_COLOR;
}

/** Get all active beams for rendering */
export function getActiveBeams(world: World): Map<Entity, ActiveBeam[]> {
  return world.systemState.beams.activeBeams;
}
