/**
 * Missile component - tracking missiles in flight.
 */

import type { ComponentBase, Entity, Vector3 } from '../core/types';
import type { SecondaryWeapon } from './weapons';

/** Missile type for visual differentiation */
export type MissileType =
  | 'rocket'
  | 'seeker'
  | 'dart'
  | 'cluster'
  | 'swarm'
  | 'torpedo'
  | 'nuke';

/** Missile in-flight component */
export interface Missile extends ComponentBase {
  readonly type: 'missile';
  owner: Entity;
  target: Entity | undefined;
  damage: number;
  speed: number;
  turnRate: number; // Radians per second
  range: number;
  distanceTraveled: number;
  direction: Vector3;
  aoeRadius: number; // Area of effect radius (0 = no AoE)
  isNuke: boolean; // For visual effects (larger explosion)
  missileType: MissileType; // Visual appearance type
  resistedDecoys: Set<Entity>; // Decoys this missile already resisted (no re-roll)
}

/** Creates a Missile component */
export function createMissile(
  owner: Entity,
  target: Entity | undefined,
  damage: number,
  speed: number,
  turnRate: number,
  range: number,
  direction: Vector3,
  aoeRadius = 0,
  isNuke = false,
  missileType: MissileType = 'seeker',
): Missile {
  return {
    type: 'missile',
    owner,
    target,
    damage,
    speed,
    turnRate: (turnRate * Math.PI) / 180, // Convert deg/s to rad/s
    range,
    distanceTraveled: 0,
    direction: direction.clone().normalize(),
    aoeRadius,
    isNuke,
    missileType,
    resistedDecoys: new Set(),
  };
}

/** Check if missile has exceeded its range */
export function isMissileExpired(missile: Missile): boolean {
  return missile.distanceTraveled >= missile.range;
}

/** Missile definitions from WEAPONS.md (bankSize, count, maxCount set at creation) */
export const MISSILE_DEFS: Record<
  string,
  Omit<SecondaryWeapon, 'count' | 'maxCount' | 'bankSize'>
> = {
  rocket: {
    name: 'Rocket',
    requiresLock: false,
    speed: 600,
    turnRate: 0,
    range: 1000,
    damage: 50,
    fireRate: 0.5,
    lockSpeed: 0,
  },
  seeker: {
    name: 'Seeker',
    requiresLock: true,
    speed: 400,
    turnRate: 90,
    range: 2000,
    damage: 60,
    fireRate: 1.0,
    lockSpeed: 0.5, // 2 seconds to lock
  },
  dart: {
    name: 'Dart',
    requiresLock: true,
    speed: 600,
    turnRate: 120,
    range: 800,
    damage: 30,
    fireRate: 0.5,
    lockSpeed: 1.0, // 1 second to lock
  },
  cluster: {
    name: 'Cluster',
    requiresLock: false,
    speed: 400,
    turnRate: 60,
    range: 1200,
    damage: 25,
    fireRate: 0.8,
    lockSpeed: 0,
  },
  swarm: {
    name: 'Swarm',
    requiresLock: true,
    speed: 500,
    turnRate: 100,
    range: 600,
    damage: 10,
    fireRate: 0.1, // Rapid fire
    lockSpeed: 0.8,
  },
  torpedo: {
    name: 'Torpedo',
    requiresLock: true,
    speed: 200,
    turnRate: 30,
    range: 4000,
    damage: 150,
    fireRate: 2.0,
    lockSpeed: 0.25, // 4 seconds to lock
  },
  nuke: {
    name: 'Nuke',
    requiresLock: true,
    speed: 150,
    turnRate: 20,
    range: 3000,
    damage: 300,
    fireRate: 3.0,
    lockSpeed: 0.2, // 5 seconds to lock
    aoeRadius: 100, // Large AoE damage radius
    isNuke: true, // Special explosion effects
  },
  decoy: {
    name: 'Decoy',
    requiresLock: false,
    speed: 50,
    turnRate: 0,
    range: 0, // Decoys don't travel far
    damage: 0, // No damage
    fireRate: 0.5,
    lockSpeed: 0,
    isDecoy: true, // Mark as countermeasure
  },
};

/** Creates a SecondaryWeapon from a missile definition (count is scaled by bankSize) */
export function createSecondaryWeaponFromDef(
  name: string,
  baseCount: number,
  bankSize = 1,
): SecondaryWeapon {
  const def = MISSILE_DEFS[name];
  if (!def) throw new Error(`Unknown missile: ${name}`);
  const count = baseCount * bankSize;
  return { ...def, count, maxCount: count, bankSize };
}
