/**
 * Shared utilities for combat simulation tests.
 */

import { aiSystem } from '../../../src/systems/ai/ai.ts';
import { aimErrorSystem } from '../../../src/systems/aim-error.ts';
import { beamSystem } from '../../../src/systems/beams.ts';
import { cleanupSystem } from '../../../src/systems/cleanup.ts';
import { collisionSystem } from '../../../src/systems/collision.ts';
import { damageSystem } from '../../../src/systems/damage.ts';
import { decoySystem } from '../../../src/systems/decoys.ts';
import { explosionSystem } from '../../../src/systems/explosions.ts';
import { heatSystem } from '../../../src/systems/heat.ts';
import { missileSystem } from '../../../src/systems/missiles.ts';
import { physicsSystem } from '../../../src/systems/physics.ts';
import { projectileSystem } from '../../../src/systems/projectiles.ts';
import { shieldSystem } from '../../../src/systems/shields.ts';
import { targetingSystem } from '../../../src/systems/targeting.ts';
import { weaponSystem } from '../../../src/systems/weapons.ts';

// ============================================================================
// Constants
// ============================================================================

export const TICK_RATE = 60;
export const TICK_SEC = 1 / TICK_RATE;

/** All 7 ship archetypes */
export const ARCHETYPES = [
  'scout',
  'interceptor',
  'striker',
  'defender',
  'bomber',
  'raider',
  'sentinel',
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
    damageDealt: {},
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
