#!/usr/bin/env node
/**
 * Stock System Balance Simulation
 *
 * Simulates multiple campaign runs with different player consumption profiles
 * to validate stock system constants.
 *
 * Usage: node scripts/simulations/stock-balance.mjs
 */

import {
  AMMO_WEAPONS,
  MISSILES,
  PRIMARIES,
  PROFILES,
  SHIPS,
} from './stock-balance-data.mjs';
import { printResults } from './stock-balance-output.mjs';
import {
  applyTrickle,
  createPRNG,
  generateSectorStock,
} from './stock-balance-sim.mjs';

// ============ SIMULATION HELPERS ============

function poissonRandom(lambda, rng) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function selectWeighted(preferences, available, rng) {
  // Filter to only available items
  const validItems = Object.entries(preferences).filter(([name]) =>
    available.includes(name),
  );
  if (validItems.length === 0) {
    // Fall back to any available item
    return available.length > 0
      ? available[Math.floor(rng() * available.length)]
      : null;
  }

  const total = validItems.reduce((sum, [_, weight]) => sum + weight, 0);
  let r = rng() * total;
  for (const [name, weight] of validItems) {
    r -= weight;
    if (r <= 0) return name;
  }
  return validItems[0][0];
}

function simulateMission(stock, sector, profile, rng, metrics) {
  const shortages = [];

  // Ship losses and purchases
  const shipsLost = poissonRandom(profile.shipsLostPerMission, rng);
  if (shipsLost > 0) {
    // Try to buy replacement ships
    const availableShips = Object.keys(stock.ships).filter(
      (s) => stock.ships[s] > 0,
    );
    for (let i = 0; i < shipsLost; i++) {
      if (availableShips.length === 0) {
        shortages.push({ type: 'ships', item: 'any' });
        metrics.shipShortages++;
      } else {
        // Pick a random available ship
        const ship = availableShips[Math.floor(rng() * availableShips.length)];
        if (stock.ships[ship] > 0) {
          stock.ships[ship]--;
          metrics.shipsPurchased++;
        } else {
          shortages.push({ type: 'ships', item: ship });
          metrics.shipShortages++;
        }
      }
    }
  }

  // Missile consumption
  const availableMissiles = Object.keys(stock.missiles).filter(
    (m) => MISSILES[m].unlockSector <= sector,
  );
  let missilesToUse = Math.floor(
    profile.missilesPerMission * (0.7 + rng() * 0.6),
  ); // ±30% variance
  while (missilesToUse > 0) {
    const missile = selectWeighted(
      profile.missilePreference,
      availableMissiles.filter((m) => stock.missiles[m] > 0),
      rng,
    );
    if (!missile) {
      shortages.push({ type: 'missiles', item: 'any' });
      metrics.missileShortages += missilesToUse;
      break;
    }
    const use = Math.min(missilesToUse, stock.missiles[missile], 10); // Use up to 10 at a time
    stock.missiles[missile] -= use;
    missilesToUse -= use;
    metrics.missilesUsed += use;
  }

  // Ammo consumption
  const availableAmmo = Object.keys(stock.ammo).filter(
    (a) => AMMO_WEAPONS[a].unlockSector <= sector,
  );
  for (const ammoType of availableAmmo) {
    const pref = profile.ammoPreference[ammoType] ?? 0;
    if (pref > 0 && rng() < pref) {
      // This weapon is equipped, consume ammo
      const baseAmmo = AMMO_WEAPONS[ammoType].baseAmmo;
      const consumption = Math.floor(
        baseAmmo * profile.ammoPercentPerMission * (0.7 + rng() * 0.6),
      );
      if (stock.ammo[ammoType] >= consumption) {
        stock.ammo[ammoType] -= consumption;
        metrics.ammoUsed += consumption;
      } else {
        const shortage = consumption - stock.ammo[ammoType];
        shortages.push({ type: 'ammo', item: ammoType, amount: shortage });
        metrics.ammoShortages += shortage;
        stock.ammo[ammoType] = 0;
      }
    }
  }

  // Primary purchases (per sector, spread across missions)
  if (rng() < profile.primaryPurchasesPerSector / 8) {
    const availablePrimaries = Object.keys(stock.primaries).filter(
      (p) => stock.primaries[p] > 0,
    );
    if (availablePrimaries.length > 0) {
      const primary =
        availablePrimaries[Math.floor(rng() * availablePrimaries.length)];
      stock.primaries[primary]--;
      metrics.primariesPurchased++;
    } else {
      metrics.primaryShortages++;
    }
  }

  return { stock, shortages };
}

function simulateCampaign(profile, seed) {
  const rng = createPRNG(seed);
  const metrics = {
    shipShortages: 0,
    missileShortages: 0,
    ammoShortages: 0,
    primaryShortages: 0,
    shipsPurchased: 0,
    missilesUsed: 0,
    ammoUsed: 0,
    primariesPurchased: 0,
    shortageEvents: [],
    stockSnapshots: [],
  };

  const MISSIONS_PER_SECTOR = [9, 8, 8, 8, 20]; // Sector 5 is endless, simulate 20
  let stock = null;

  for (let sector = 1; sector <= 5; sector++) {
    // Generate fresh stock for sector
    stock = generateSectorStock(sector);
    metrics.stockSnapshots.push({
      sector,
      mission: 0,
      stock: JSON.parse(JSON.stringify(stock)),
    });

    const missions = MISSIONS_PER_SECTOR[sector - 1];
    for (let mission = 1; mission <= missions; mission++) {
      // Simulate mission
      const result = simulateMission(stock, sector, profile, rng, metrics);
      stock = result.stock;

      if (result.shortages.length > 0) {
        metrics.shortageEvents.push({
          sector,
          mission,
          shortages: result.shortages,
        });
      }

      // Apply trickle after mission
      stock = applyTrickle(stock, sector, rng);
    }

    // Snapshot at end of sector
    metrics.stockSnapshots.push({
      sector,
      mission: missions,
      stock: JSON.parse(JSON.stringify(stock)),
    });
  }

  return metrics;
}

function runSimulations(numRuns = 500) {
  const results = {};

  for (const [profileId, profile] of Object.entries(PROFILES)) {
    console.log(`Simulating ${profile.name}...`);

    const runs = [];
    for (let i = 0; i < numRuns; i++) {
      const metrics = simulateCampaign(profile, i * 12345 + 67890);
      runs.push(metrics);
    }

    // Aggregate statistics
    const stats = {
      profile: profile.name,
      description: profile.description,
      runsWithShortages: runs.filter((r) => r.shortageEvents.length > 0).length,
      avgShipShortages: runs.reduce((s, r) => s + r.shipShortages, 0) / numRuns,
      avgMissileShortages:
        runs.reduce((s, r) => s + r.missileShortages, 0) / numRuns,
      avgAmmoShortages: runs.reduce((s, r) => s + r.ammoShortages, 0) / numRuns,
      avgPrimaryShortages:
        runs.reduce((s, r) => s + r.primaryShortages, 0) / numRuns,
      avgShipsPurchased:
        runs.reduce((s, r) => s + r.shipsPurchased, 0) / numRuns,
      avgMissilesUsed: runs.reduce((s, r) => s + r.missilesUsed, 0) / numRuns,
      avgAmmoUsed: runs.reduce((s, r) => s + r.ammoUsed, 0) / numRuns,
      avgPrimariesPurchased:
        runs.reduce((s, r) => s + r.primariesPurchased, 0) / numRuns,
      shortagesBySector: {},
      shortagesByItem: {},
    };

    // Analyze shortage patterns
    for (const run of runs) {
      for (const event of run.shortageEvents) {
        const sectorKey = `S${event.sector}`;
        stats.shortagesBySector[sectorKey] =
          (stats.shortagesBySector[sectorKey] ?? 0) + 1;

        for (const shortage of event.shortages) {
          const itemKey = `${shortage.type}:${shortage.item}`;
          stats.shortagesByItem[itemKey] =
            (stats.shortagesByItem[itemKey] ?? 0) + 1;
        }
      }
    }

    // Analyze final stock levels (end of sector 5)
    const finalStocks = runs.map(
      (r) => r.stockSnapshots[r.stockSnapshots.length - 1].stock,
    );
    stats.avgFinalStock = {
      ships: {},
      primaries: {},
      missiles: {},
      ammo: {},
    };

    for (const category of ['ships', 'primaries', 'missiles', 'ammo']) {
      const items =
        category === 'ships'
          ? SHIPS
          : category === 'primaries'
            ? PRIMARIES
            : category === 'missiles'
              ? MISSILES
              : AMMO_WEAPONS;
      for (const name of Object.keys(items)) {
        const values = finalStocks
          .map((s) => s[category]?.[name] ?? 0)
          .filter((v) => v !== undefined);
        if (values.length > 0) {
          stats.avgFinalStock[category][name] = Math.round(
            values.reduce((a, b) => a + b, 0) / values.length,
          );
        }
      }
    }

    results[profileId] = stats;
  }

  return results;
}

// ============ MAIN ============

const NUM_RUNS = 500;
console.log('Stock System Balance Simulation');
console.log('================================\n');

const results = runSimulations(NUM_RUNS);
printResults(results, NUM_RUNS);
