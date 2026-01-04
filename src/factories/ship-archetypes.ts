/**
 * Ship Archetypes - Predefined ship configurations and stats.
 */

import type { WeaponBankSpec } from '../components/weapons';

/** Secondary weapon bank specification */
export interface SecondaryBankSpec {
  name: string;
  count: number;
  size: number;
}

/** Ship archetype stats */
export interface ShipStats {
  hull: number;
  shields: number;
  shieldRegen: number;
  shieldDelay: number;
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  rollRate: number;
  collisionRadius: number;
  maxHeat: number;
  coolingRate: number;
  afterburnerHeatRate: number;
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
}

/** Predefined ship archetypes - all stats from SHIPS.md */
export const SHIP_ARCHETYPES: Record<string, ShipStats> = {
  // Scout: Fast, fragile gun platform - GUNS focus
  scout: {
    hull: 50,
    shields: 30,
    shieldRegen: 8,
    shieldDelay: 2,
    maxSpeed: 300,
    acceleration: 150,
    turnRate: 120,
    rollRate: 180,
    collisionRadius: 4,
    maxHeat: 80,
    coolingRate: 15,
    afterburnerHeatRate: 25,
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 6, size: 1 }],
  },
  // Interceptor: Balanced fighter - BALANCED focus
  interceptor: {
    hull: 80,
    shields: 60,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 250,
    acceleration: 100,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 5,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryWeapons: [
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 1 },
      { name: 'rocket', count: 6, size: 2 },
    ],
  },
  // Striker: Heavy gun platform - GUNS focus
  striker: {
    hull: 120,
    shields: 80,
    shieldRegen: 12,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 80,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 6,
    maxHeat: 150,
    coolingRate: 25,
    afterburnerHeatRate: 60,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'redLaser', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 4, size: 1 }],
  },
  // Bomber: Dedicated missile boat - MISSILES focus
  bomber: {
    hull: 100,
    shields: 70,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 75,
    rollRate: 110,
    collisionRadius: 7,
    maxHeat: 80,
    coolingRate: 12,
    afterburnerHeatRate: 55,
    primaryWeapons: [{ name: 'plasma', size: 2 }],
    secondaryWeapons: [
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
  },
  // Defender: Tanky missile platform - MISSILES focus
  defender: {
    hull: 150,
    shields: 120,
    shieldRegen: 18,
    shieldDelay: 2.5,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 70,
    rollRate: 100,
    collisionRadius: 7,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 50,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
  },
  // Raider: Glass cannon gun platform - GUNS focus
  raider: {
    hull: 60,
    shields: 40,
    shieldRegen: 6,
    shieldDelay: 4,
    maxSpeed: 280,
    acceleration: 120,
    turnRate: 110,
    rollRate: 160,
    collisionRadius: 5,
    maxHeat: 140,
    coolingRate: 22,
    afterburnerHeatRate: 35,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 4, size: 1 },
      { name: 'rocket', count: 4, size: 1 },
    ],
  },
  // Sentinel: Long-range support - BALANCED (beam-optimized)
  sentinel: {
    hull: 100,
    shields: 100,
    shieldRegen: 15,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 90,
    turnRate: 90,
    rollRate: 130,
    collisionRadius: 6,
    maxHeat: 130,
    coolingRate: 22,
    afterburnerHeatRate: 45,
    primaryWeapons: [
      { name: 'blueLaser', size: 3 },
      { name: 'greenLaser', size: 2 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'torpedo', count: 2, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
  },
};
