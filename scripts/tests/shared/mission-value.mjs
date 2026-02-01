/**
 * Mission Value Calculator
 *
 * Computes the economic value of:
 * - Enemy compositions (for salvage calculation)
 * - Player loadouts (for replacement cost calculation)
 * - Consumables (missiles, ammo)
 *
 * Used by reward calculation to implement the formula:
 * reward = expected_replacement_cost - expected_salvage + profit_margin
 */

import { MISSILES } from '../../../src/data/missiles.ts';
import {
  AMMO_PRICES,
  PRIMARY_PRICES,
  SECONDARY_PRICES,
  SHIP_PRICES,
} from '../../../src/data/prices.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { ENEMY_ARCHETYPES } from '../../../src/factories/enemy-archetypes/index.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';

// ============================================================================
// Pilot Costs
// ============================================================================

/** Pilot hire costs by skill level */
export const PILOT_COSTS = {
  green: 0, // Enemies only, no hire cost
  rookie: 75,
  regular: 200,
  veteran: 400,
  ace: 700,
};

/**
 * Get pilot hire cost for a skill level.
 * Returns 0 for unknown skills.
 */
export function getPilotCost(skill) {
  return PILOT_COSTS[skill] ?? 0;
}

// ============================================================================
// Archetype Value Calculation
// ============================================================================

/**
 * Calculate total value of an archetype's loadout.
 * Includes: ship hull + primary weapons + ammo capacity + secondary missiles
 *
 * @param {string} archetypeName - Name of the archetype
 * @param {boolean} isEnemy - True for enemy archetypes, false for player
 * @returns {{ hull: number, primaries: number, ammo: number, missiles: number, total: number }}
 */
export function getArchetypeValue(archetypeName, isEnemy = false) {
  const archetype = isEnemy
    ? ENEMY_ARCHETYPES[archetypeName]
    : SHIP_ARCHETYPES[archetypeName];

  if (!archetype) {
    console.warn(`Unknown archetype: ${archetypeName}`);
    return { hull: 0, primaries: 0, ammo: 0, missiles: 0, total: 0 };
  }

  // Ship hull value
  const shipClass = archetype.shipClassName;
  const hull = SHIP_PRICES[shipClass]?.buy ?? 0;

  // Primary weapons value (weapon + full ammo for ballistic)
  let primaries = 0;
  let ammo = 0;
  for (const bank of archetype.primaryWeapons || []) {
    const weaponPrice = PRIMARY_PRICES[bank.name]?.buy ?? 0;
    primaries += weaponPrice;

    // Add ammo cost for ballistic weapons
    const weaponStats = PRIMARY_WEAPONS[bank.name];
    if (weaponStats?.ammo) {
      const ammoCapacity = weaponStats.ammo * bank.size;
      const ammoPricePerRound = AMMO_PRICES[bank.name]?.buy ?? 0;
      ammo += ammoCapacity * ammoPricePerRound;
    }
  }

  // Secondary weapons value (missiles at full capacity)
  let missiles = 0;
  for (const bank of archetype.secondaryWeapons || []) {
    const missilePrice = SECONDARY_PRICES[bank.name]?.buy ?? 0;
    const missileStats = MISSILES[bank.name];
    const capacity = bank.count ?? (missileStats?.capacity ?? 0) * bank.size;
    missiles += capacity * missilePrice;
  }

  const total = hull + primaries + ammo + missiles;
  return { hull, primaries, ammo, missiles, total };
}

/**
 * Calculate the value of a player ship with pilot.
 *
 * @param {string} archetypeName - Archetype name
 * @param {string} skill - Pilot skill level
 * @returns {{ ship: number, pilot: number, total: number, breakdown: object }}
 */
export function getPlayerShipValue(archetypeName, skill) {
  const shipValue = getArchetypeValue(archetypeName, false);
  const pilotCost = getPilotCost(skill);

  return {
    ship: shipValue.total,
    pilot: pilotCost,
    total: shipValue.total + pilotCost,
    breakdown: shipValue,
  };
}

// ============================================================================
// Mission Value Calculation
// ============================================================================

/**
 * Calculate total enemy value for a mission (all waves).
 *
 * @param {object} mission - Mission contract with waves
 * @returns {{ totalValue: number, perWave: number[], breakdown: object[] }}
 */
export function getMissionEnemyValue(mission) {
  const perWave = [];
  const breakdown = [];
  let totalValue = 0;

  for (const wave of mission.waves || []) {
    let waveValue = 0;
    const waveBreakdown = [];

    for (const enemy of wave.enemies || []) {
      const value = getArchetypeValue(enemy.archetype, true);
      const enemyTotal = value.total * enemy.count;
      waveValue += enemyTotal;
      waveBreakdown.push({
        archetype: enemy.archetype,
        count: enemy.count,
        unitValue: value.total,
        totalValue: enemyTotal,
        breakdown: value,
      });
    }

    perWave.push(waveValue);
    breakdown.push(waveBreakdown);
    totalValue += waveValue;
  }

  return { totalValue, perWave, breakdown };
}

/**
 * Calculate total player squadron value for a sector loadout.
 *
 * @param {Array<{archetype: string, skill: string}>} loadout - Sector loadout
 * @returns {{ totalValue: number, ships: object[] }}
 */
export function getSquadronValue(loadout) {
  const ships = [];
  let totalValue = 0;

  for (const ship of loadout) {
    const value = getPlayerShipValue(ship.archetype, ship.skill);
    ships.push({
      archetype: ship.archetype,
      skill: ship.skill,
      value: value.total,
      breakdown: value,
    });
    totalValue += value.total;
  }

  return { totalValue, ships };
}

// ============================================================================
// Consumable Tracking
// ============================================================================

/**
 * Calculate missile/ammo value for a single ship's secondary loadout.
 * Used to compute consumable costs when missiles are used.
 *
 * @param {string} archetypeName - Archetype name
 * @param {boolean} isEnemy - True for enemy archetypes
 * @returns {{ missiles: Array<{name: string, count: number, unitPrice: number, totalValue: number}>, totalValue: number }}
 */
export function getSecondaryLoadoutValue(archetypeName, isEnemy = false) {
  const archetype = isEnemy
    ? ENEMY_ARCHETYPES[archetypeName]
    : SHIP_ARCHETYPES[archetypeName];

  if (!archetype) {
    return { missiles: [], totalValue: 0 };
  }

  const missiles = [];
  let totalValue = 0;

  for (const bank of archetype.secondaryWeapons || []) {
    const price = SECONDARY_PRICES[bank.name]?.buy ?? 0;
    const missileStats = MISSILES[bank.name];
    const count = bank.count ?? (missileStats?.capacity ?? 0) * bank.size;
    const value = count * price;

    missiles.push({
      name: bank.name,
      count,
      unitPrice: price,
      totalValue: value,
    });
    totalValue += value;
  }

  return { missiles, totalValue };
}

/**
 * Calculate ammo value for a single ship's primary ballistic weapons.
 *
 * @param {string} archetypeName - Archetype name
 * @param {boolean} isEnemy - True for enemy archetypes
 * @returns {{ ammo: Array<{name: string, capacity: number, pricePerRound: number, totalValue: number}>, totalValue: number }}
 */
export function getPrimaryAmmoValue(archetypeName, isEnemy = false) {
  const archetype = isEnemy
    ? ENEMY_ARCHETYPES[archetypeName]
    : SHIP_ARCHETYPES[archetypeName];

  if (!archetype) {
    return { ammo: [], totalValue: 0 };
  }

  const ammo = [];
  let totalValue = 0;

  for (const bank of archetype.primaryWeapons || []) {
    const weaponStats = PRIMARY_WEAPONS[bank.name];
    if (!weaponStats?.ammo) continue; // Energy weapons have no ammo cost

    const capacity = weaponStats.ammo * bank.size;
    const pricePerRound = AMMO_PRICES[bank.name]?.buy ?? 0;
    const value = capacity * pricePerRound;

    ammo.push({
      name: bank.name,
      capacity,
      pricePerRound,
      totalValue: value,
    });
    totalValue += value;
  }

  return { ammo, totalValue };
}

// ============================================================================
// Reward Calculation
// ============================================================================

/** Profit margins by difficulty */
export const PROFIT_MARGINS = {
  easy: 500,
  medium: 750,
  hard: 1000,
};

/** Expected salary overhead by sector (covers wingman salaries) */
export const SALARY_OVERHEAD = {
  1: 300,
  2: 300,
  3: 600,
  4: 750,
  5: 750,
};

/**
 * Get expected salary overhead for a sector.
 * @param {number} sector - Sector number (1-5)
 * @returns {number} Expected salary overhead in credits
 */
export function getExpectedSalary(sector) {
  return SALARY_OVERHEAD[sector] ?? 0;
}

/** Expected salvage rate (fraction of enemy value recovered) */
export const SALVAGE_RATE = 0.05;

/**
 * Calculate recommended reward for a mission based on simulation results.
 *
 * Formula: reward = expected_replacement_cost - expected_salvage + profit_margin + salary_overhead
 *
 * @param {object} params - Calculation parameters
 * @param {string} params.difficulty - Mission difficulty (easy/medium/hard)
 * @param {number} params.enemyValue - Total enemy composition value
 * @param {number} params.avgShipsLost - Average ships lost per mission
 * @param {number} params.avgShipValue - Average value of lost ships (hull + weapons + missiles + pilot)
 * @param {number} params.avgConsumablesUsed - Average consumables used by ALL ships (survivors + lost)
 * @param {number} [params.sector] - Sector number (1-5) for salary overhead calculation
 * @returns {{ reward: number, breakdown: object }}
 */
export function calculateReward({
  difficulty,
  enemyValue,
  avgShipsLost,
  avgShipValue,
  avgConsumablesUsed,
  sector,
}) {
  // Expected replacement cost = ships lost × average ship value + consumables used by all
  const replacementCost = avgShipsLost * avgShipValue + avgConsumablesUsed;

  // Expected salvage = enemy value × salvage rate
  const expectedSalvage = enemyValue * SALVAGE_RATE;

  // Profit margin by difficulty
  const profitMargin = PROFIT_MARGINS[difficulty] ?? PROFIT_MARGINS.medium;

  // Salary overhead for wingmen (sector-based)
  const salaryOverhead = sector ? getExpectedSalary(sector) : 0;

  // Final reward
  const reward = Math.round(
    replacementCost - expectedSalvage + profitMargin + salaryOverhead,
  );

  return {
    reward: Math.max(reward, 100), // Minimum 100 credits
    breakdown: {
      replacementCost: Math.round(replacementCost),
      avgShipsLost,
      avgShipValue: Math.round(avgShipValue),
      avgConsumablesUsed: Math.round(avgConsumablesUsed),
      enemyValue,
      expectedSalvage: Math.round(expectedSalvage),
      profitMargin,
      salaryOverhead,
    },
  };
}

// ============================================================================
// Export utilities for testing
// ============================================================================

export {
  SHIP_PRICES,
  PRIMARY_PRICES,
  SECONDARY_PRICES,
  AMMO_PRICES,
  ENEMY_ARCHETYPES,
  SHIP_ARCHETYPES,
  PRIMARY_WEAPONS,
  MISSILES,
};
