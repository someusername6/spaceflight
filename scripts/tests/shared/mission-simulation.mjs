/**
 * Mission Simulation Shared Utilities
 *
 * Common utilities for mission balance testing and reward calculation.
 * Used by test-sector-balance.mjs and calculate-rewards.mjs.
 */

import { Quaternion, Vector3 } from 'three';
import { getComponent, queryEntities } from '../../../src/core/ecs.ts';
import { randomRange } from '../../../src/core/prng.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { getArchetypeValue, getPlayerShipValue } from './mission-value.mjs';

// ============================================================================
// Sector Loadouts
// ============================================================================

/**
 * Sector-specific test loadouts for balance simulation.
 * Player skill progresses: Regular -> Veteran -> Veteran -> Ace -> Ace
 * Wingmen and ships improve based on expected progression.
 */
export const SECTOR_LOADOUTS = {
  1: [
    // Sector 1: New player, all regular skill, basic fighters
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
  ],
  2: [
    // Sector 2: Improving player, mixed ships
    { archetype: 'fighter', skill: 'veteran' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'interceptor', skill: 'regular' },
    { archetype: 'defender', skill: 'regular' },
  ],
  3: [
    // Sector 3: Solid player, better ships and wingmen
    { archetype: 'interceptor', skill: 'veteran' },
    { archetype: 'interceptor', skill: 'regular' },
    { archetype: 'defender', skill: 'regular' },
    { archetype: 'defender', skill: 'regular' },
  ],
  4: [
    // Sector 4: Skilled player, advanced ships
    { archetype: 'striker', skill: 'ace' },
    { archetype: 'striker', skill: 'veteran' },
    { archetype: 'defender', skill: 'veteran' },
    { archetype: 'defender', skill: 'veteran' },
    { archetype: 'sentinel', skill: 'regular' },
  ],
  5: [
    // Sector 5: Master player, top-tier loadout (all ace)
    { archetype: 'striker', skill: 'ace' },
    { archetype: 'striker', skill: 'ace' },
    { archetype: 'defender', skill: 'ace' },
    { archetype: 'defender', skill: 'ace' },
    { archetype: 'sentinel', skill: 'ace' },
    { archetype: 'sentinel', skill: 'ace' },
  ],
};

// ============================================================================
// Wave Delay
// ============================================================================

/**
 * Calculate wave spawn delay (matching mission-waves.ts).
 * @param delay - Fixed delay number, or [min, max] range
 * @param prng - PRNG instance for random range
 */
export function calculateWaveDelay(delay, prng) {
  if (delay === undefined) return 0;
  if (typeof delay === 'number') return delay;
  return randomRange(prng, delay[0], delay[1]);
}

// ============================================================================
// Enemy Spawning
// ============================================================================

const MIN_SPAWN_DISTANCE = 2000;

/**
 * Get positions of all allied ships.
 */
export function getAlliedPositions(world) {
  const positions = [];
  for (const entity of queryEntities(world, ['faction', 'transform'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;
    const transform = getComponent(world, entity, 'transform');
    if (transform) positions.push(transform.position.clone());
  }
  return positions;
}

/**
 * Spawn a wave of enemies facing the player squadron.
 */
export function spawnWave(world, wave) {
  const allies = getAlliedPositions(world);
  const centroid = new Vector3();
  for (const pos of allies) centroid.add(pos);
  if (allies.length > 0) centroid.divideScalar(allies.length);

  const spawnCenter = centroid
    .clone()
    .add(new Vector3(0, 0, -MIN_SPAWN_DISTANCE));
  const toAllies = centroid.clone().sub(spawnCenter).normalize();
  const forward = new Vector3(0, 0, -1);
  const facing = new Quaternion().setFromUnitVectors(forward, toAllies);

  const totalEnemies = wave.enemies.reduce((sum, e) => sum + e.count, 0);
  let shipIndex = 0;
  const right = new Vector3(1, 0, 0).applyQuaternion(facing);
  const up = new Vector3(0, 1, 0).applyQuaternion(facing);

  wave.enemies.forEach((enemySpec) => {
    for (let i = 0; i < enemySpec.count; i++) {
      const lateralOffset = (shipIndex - (totalEnemies - 1) / 2) * 20;
      const verticalOffset = (shipIndex % 2 === 0 ? 1 : -1) * 5;
      const position = spawnCenter
        .clone()
        .addScaledVector(right, lateralOffset)
        .addScaledVector(up, verticalOffset);

      createAIShip(
        world,
        enemySpec.archetype,
        Faction.Enemy,
        position,
        facing,
        enemySpec.skill,
      );
      shipIndex++;
    }
  });
}

/**
 * Get the loadout for a sector.
 */
export function getLoadout(sector) {
  return SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
}

/**
 * Get a human-readable description of a loadout.
 */
export function getLoadoutDescription(sector) {
  const loadout = getLoadout(sector);
  return loadout.map((s) => `${s.skill} ${s.archetype}`).join(', ');
}

// ============================================================================
// Loadout Value Calculations
// ============================================================================

/**
 * Calculate average ship value for a sector loadout.
 * Includes hull + weapons + missiles + pilot.
 */
export function getLoadoutAverageShipValue(sector) {
  const loadout = getLoadout(sector);
  let totalValue = 0;

  for (const ship of loadout) {
    const value = getPlayerShipValue(ship.archetype, ship.skill);
    totalValue += value.total;
  }

  return totalValue / loadout.length;
}

/**
 * Calculate total consumable value for a loadout (missiles + ammo).
 */
export function getLoadoutConsumableValue(sector) {
  const loadout = getLoadout(sector);
  let totalValue = 0;

  for (const ship of loadout) {
    const archValue = getArchetypeValue(ship.archetype, false);
    totalValue += archValue.missiles + archValue.ammo;
  }

  return totalValue;
}
