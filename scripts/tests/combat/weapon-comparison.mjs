#!/usr/bin/env node
/**
 * Weapon Comparison Simulation
 *
 * Runs 4v4 mirror matches with different primary weapons to compare
 * actual combat performance including hit rates, DPS, and win rates.
 *
 * Usage: npx tsx scripts/tests/combat/weapon-comparison.mjs [runs]
 */

import { getWeaponStats } from '../../../src/data/weapons.ts';
import { runWeaponComparison } from './combat-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

// Weapons to test (ballistic + plasma baseline)
const WEAPONS_TO_TEST = [
  'plasma', // Energy baseline
  'autocannon', // Fast ballistic
  'slugCannon', // Slow heavy ballistic
  'gyrojet', // Accelerating + tracking
  'flak', // AoE ballistic
];

const SHIP_CLASS = 'fighter';
const SKILL_LEVEL = 'regular';
const CONFIG = { shipClass: SHIP_CLASS, skillLevel: SKILL_LEVEL };

// ============================================================================
// Main
// ============================================================================

const runs = parseInt(process.argv[2], 10) || 50;

console.log('='.repeat(90));
console.log('WEAPON COMPARISON - Full primary weapon analysis');
console.log(
  `Ship: ${SHIP_CLASS} | Skill: ${SKILL_LEVEL} | 4v4 | ${runs} runs per test`,
);
console.log('='.repeat(90));

// Run mirror matches first (same weapon vs same weapon - should be ~50%)
console.log('\n--- MIRROR MATCHES (sanity check - should be ~50%) ---\n');
console.log(
  'Weapon'.padEnd(14) +
    'WinRate'.padEnd(10) +
    'Time'.padEnd(8) +
    'Shots'.padEnd(8) +
    'Hits'.padEnd(8) +
    'Accuracy'.padEnd(10) +
    'Damage'.padEnd(10) +
    'Ammo%'.padEnd(8) +
    'Shrapnel',
);
console.log('-'.repeat(100));

for (const weapon of WEAPONS_TO_TEST) {
  const weaponStats = getWeaponStats(weapon);
  if (!weaponStats) {
    console.log(`Skipping ${weapon} - not found`);
    continue;
  }

  const result = runWeaponComparison(weapon, weapon, runs, CONFIG);
  const shrapnelInfo = result.shrapnelRateA
    ? `${result.totalHitsA} (${result.shrapnelRateA}%)`
    : '-';
  console.log(
    weaponStats.name.padEnd(14) +
      `${result.winRateA.toFixed(0)}%`.padEnd(10) +
      `${result.avgTime.toFixed(0)}s`.padEnd(8) +
      `${result.totalShotsA}`.padEnd(8) +
      `${result.totalHitsA}`.padEnd(8) +
      `${result.hitRateA}%`.padEnd(10) +
      `${Math.round(result.totalDamageA)}`.padEnd(10) +
      `${result.ammoUsedA}%`.padEnd(8) +
      shrapnelInfo,
  );
}

// Run Gyrojet vs each other weapon
console.log('\n--- GYROJET VS OTHER WEAPONS ---\n');
console.log(
  'Matchup'.padEnd(26) +
    'GyroWin'.padEnd(9) +
    'OtherWin'.padEnd(10) +
    'GyroHit%'.padEnd(10) +
    'OtherHit%'.padEnd(11) +
    'GyroDmg'.padEnd(9) +
    'OtherDmg',
);
console.log('-'.repeat(85));

const gyrojetStats = getWeaponStats('gyrojet');
for (const weapon of WEAPONS_TO_TEST) {
  if (weapon === 'gyrojet') continue;

  const weaponStats = getWeaponStats(weapon);
  if (!weaponStats) continue;

  const result = runWeaponComparison('gyrojet', weapon, runs, CONFIG);
  const matchup = `${gyrojetStats.name} vs ${weaponStats.name}`;

  console.log(
    matchup.padEnd(26) +
      `${result.winRateA.toFixed(0)}%`.padEnd(9) +
      `${result.winRateB.toFixed(0)}%`.padEnd(10) +
      `${result.hitRateA}%`.padEnd(10) +
      `${result.hitRateB}%`.padEnd(11) +
      `${Math.round(result.totalDamageA)}`.padEnd(9) +
      `${Math.round(result.totalDamageB)}`,
  );
}

// Run all weapons vs Plasma baseline
console.log('\n--- ALL WEAPONS VS PLASMA BASELINE ---\n');
console.log(
  'Weapon'.padEnd(14) +
    'vs Plasma'.padEnd(12) +
    'Time'.padEnd(8) +
    'WeaponDmg'.padEnd(12) +
    'PlasmaDmg'.padEnd(12) +
    'WeaponDPS'.padEnd(10) +
    'PlasmaDPS',
);
console.log('-'.repeat(80));

for (const weapon of WEAPONS_TO_TEST) {
  if (weapon === 'plasma') continue;

  const weaponStats = getWeaponStats(weapon);
  if (!weaponStats) continue;

  const result = runWeaponComparison(weapon, 'plasma', runs, CONFIG);

  console.log(
    weaponStats.name.padEnd(14) +
      `${result.winRateA.toFixed(0)}%`.padEnd(12) +
      `${result.avgTime.toFixed(0)}s`.padEnd(8) +
      `${Math.round(result.totalDamageA)}`.padEnd(12) +
      `${Math.round(result.totalDamageB)}`.padEnd(12) +
      `${result.dpsA.toFixed(1)}`.padEnd(10) +
      `${result.dpsB.toFixed(1)}`,
  );
}

// Calculate theoretical DPS for reference
console.log('\n--- THEORETICAL VS ACTUAL DPS ---\n');
console.log(
  'Weapon'.padEnd(14) +
    'Damage'.padEnd(8) +
    'FireRate'.padEnd(10) +
    'TheoryDPS'.padEnd(12) +
    'MirrorDPS'.padEnd(12) +
    'Efficiency',
);
console.log('-'.repeat(70));

for (const weapon of WEAPONS_TO_TEST) {
  const stats = getWeaponStats(weapon);
  if (!stats) continue;

  const theoryDPS = stats.damage / stats.fireRate;
  const result = runWeaponComparison(weapon, weapon, 30, CONFIG);
  const efficiency =
    result.dpsA > 0 ? ((result.dpsA / theoryDPS) * 100).toFixed(1) : '0.0';

  console.log(
    stats.name.padEnd(14) +
      `${stats.damage}`.padEnd(8) +
      `${stats.fireRate}s`.padEnd(10) +
      `${theoryDPS.toFixed(1)}`.padEnd(12) +
      `${result.dpsA.toFixed(1)}`.padEnd(12) +
      `${efficiency}%`,
  );
}

console.log(`\n${'='.repeat(90)}`);
console.log('ANALYSIS NOTES:');
console.log('- Mirror matches should be ~50% (sanity check)');
console.log(
  '- If Gyrojet wins >60% vs other weapons, tracking may be too strong',
);
console.log('- Compare DPS values to see effective damage output');
console.log('- Lower DPS with higher win rate = better accuracy from tracking');
console.log(
  '- Efficiency = Actual DPS / Theoretical DPS (accounts for misses, heat, etc.)',
);
console.log(
  '- Shrapnel weapons: Accuracy = shrapnel pieces hit / total shrapnel spawned',
);
console.log('  Shrapnel column shows: total hits (accuracy%)');
console.log('='.repeat(90));
