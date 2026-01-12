/**
 * Shared utilities for combat simulation tests.
 */

import { aiSystem } from '../../../src/systems/ai/ai.ts';
import { aimErrorSystem } from '../../../src/systems/aim-error.ts';
import { cleanupSystem } from '../../../src/systems/cleanup.ts';
import { collisionSystem } from '../../../src/systems/collision.ts';
import { damageSystem } from '../../../src/systems/damage.ts';
import { decoySystem } from '../../../src/systems/decoys.ts';
import { explosionSystem } from '../../../src/systems/explosions.ts';
import { heatSystem } from '../../../src/systems/heat.ts';
import { physicsSystem } from '../../../src/systems/physics.ts';
import { shieldSystem } from '../../../src/systems/shields.ts';
import { targetingSystem } from '../../../src/systems/targeting.ts';
import { beamSystem } from '../../../src/systems/weapons/beams.ts';
import { missileSystem } from '../../../src/systems/weapons/missiles.ts';
import { projectileSystem } from '../../../src/systems/weapons/projectiles.ts';
import { weaponSystem } from '../../../src/systems/weapons/weapons.ts';

// ============================================================================
// Constants
// ============================================================================

export const TICK_RATE = 60;
export const TICK_SEC = 1 / TICK_RATE;

/** All ship archetypes (base + variants) */
export const ARCHETYPES = [
  // Base archetypes (one per ship class)
  'scout',
  'interceptor',
  'striker',
  'defender',
  'bomber',
  'raider',
  'sentinel',
  // Variant archetypes (different loadout on existing chassis)
  'sniper', // Raider chassis + railguns, kiting playstyle
  'lancer', // Sentinel chassis + green lasers, mid-range beams
  'lancerBlue', // Sentinel chassis + blue lasers, longer range
  'lancerRed', // Sentinel chassis + red lasers, close range high DPS
];

/** Spawn position jitter to break determinism (±10m) */
export function jitter() {
  return (Math.random() - 0.5) * 20;
}

// ============================================================================
// Systems
// ============================================================================

/** Combat systems in execution order */
export const SYSTEMS = [
  targetingSystem,
  aiSystem,
  aimErrorSystem,
  weaponSystem,
  beamSystem,
  physicsSystem,
  projectileSystem,
  missileSystem,
  decoySystem,
  collisionSystem,
  damageSystem,
  shieldSystem,
  heatSystem,
  cleanupSystem,
  explosionSystem,
];

// ============================================================================
// Combat Stats
// ============================================================================

export function initCombatStats(world) {
  world.systemState.combatStats = {
    shotsFired: {},
    shotsHit: {},
    damageDealt: {},
    shrapnelHit: {},
    shrapnelSpawned: 0,
    missilesFired: {},
    missilesHit: {},
    missileDamage: {},
    missilesExpired: 0,
    missilesHitOwner: 0,
    missilesSeduced: 0,
    beamDamage: {},
    decoysLaunched: 0,
    decoysSuccessful: 0,
  };
}

// ============================================================================
// Simulation
// ============================================================================

/** Run one frame of combat simulation */
export function runFrame(world) {
  world.systemState.gameTime += TICK_SEC;
  for (const system of SYSTEMS) {
    system(world, TICK_SEC);
  }
}
