#!/usr/bin/env node

/**
 * Weapon Diversity Analysis
 *
 * Analyzes enemy weapon usage across all missions to identify
 * underrepresented weapons (primary and secondary).
 *
 * Usage:
 *   npx tsx scripts/tools/weapon-diversity.mjs
 */

import { MISSILES } from '../../src/data/missiles.ts';
import { PRIMARY_WEAPONS } from '../../src/data/weapons.ts';
import { ENEMY_ARCHETYPES } from '../../src/factories/enemy-archetypes/index.ts';
import { ALL_MISSIONS } from '../../src/ui/screens/missions/index.ts';

const SEPARATOR = '─'.repeat(90);
const HEADER = '═'.repeat(90);

// Thresholds for flagging low-usage weapons
const LOW_MISSION_THRESHOLD = 3; // Flag if in fewer than N missions
const LOW_ENEMY_THRESHOLD = 15; // Flag if fewer than N total enemies use it

/**
 * Analyze missions and return weapon usage stats
 */
function analyzeWeaponDiversity() {
  // Track archetype usage: { archetypeName: { missions: Set, totalEnemies: number, sectors: Set } }
  const archetypeUsage = {};

  // Initialize all archetypes
  for (const name of Object.keys(ENEMY_ARCHETYPES)) {
    archetypeUsage[name] = {
      missions: new Set(),
      totalEnemies: 0,
      sectors: new Set(),
    };
  }

  // Scan all missions
  for (const mission of ALL_MISSIONS) {
    for (const wave of mission.waves) {
      for (const enemy of wave.enemies) {
        const archetype = enemy.archetype;
        if (!archetypeUsage[archetype]) {
          console.warn(
            `Unknown archetype: ${archetype} in mission ${mission.id}`,
          );
          archetypeUsage[archetype] = {
            missions: new Set(),
            totalEnemies: 0,
            sectors: new Set(),
          };
        }
        archetypeUsage[archetype].missions.add(mission.id);
        archetypeUsage[archetype].totalEnemies += enemy.count;
        archetypeUsage[archetype].sectors.add(mission.sector);
      }
    }
  }

  // Now map archetypes to weapons
  const primaryUsage = {};
  const secondaryUsage = {};

  // Initialize all weapons
  for (const name of Object.keys(PRIMARY_WEAPONS)) {
    primaryUsage[name] = {
      missions: new Set(),
      totalEnemies: 0,
      sectors: new Set(),
      archetypes: new Set(),
    };
  }
  for (const name of Object.keys(MISSILES)) {
    secondaryUsage[name] = {
      missions: new Set(),
      totalEnemies: 0,
      sectors: new Set(),
      archetypes: new Set(),
    };
  }

  // Map archetype usage to weapon usage
  for (const [archetypeName, usage] of Object.entries(archetypeUsage)) {
    const archetype = ENEMY_ARCHETYPES[archetypeName];
    if (!archetype) continue;

    // Primary weapons
    for (const bank of archetype.primaryWeapons || []) {
      const weaponName = bank.name;
      if (!primaryUsage[weaponName]) {
        primaryUsage[weaponName] = {
          missions: new Set(),
          totalEnemies: 0,
          sectors: new Set(),
          archetypes: new Set(),
        };
      }
      for (const missionId of usage.missions) {
        primaryUsage[weaponName].missions.add(missionId);
      }
      primaryUsage[weaponName].totalEnemies += usage.totalEnemies;
      for (const sector of usage.sectors) {
        primaryUsage[weaponName].sectors.add(sector);
      }
      primaryUsage[weaponName].archetypes.add(archetypeName);
    }

    // Secondary weapons
    for (const bank of archetype.secondaryWeapons || []) {
      const weaponName = bank.name;
      if (!secondaryUsage[weaponName]) {
        secondaryUsage[weaponName] = {
          missions: new Set(),
          totalEnemies: 0,
          sectors: new Set(),
          archetypes: new Set(),
        };
      }
      for (const missionId of usage.missions) {
        secondaryUsage[weaponName].missions.add(missionId);
      }
      secondaryUsage[weaponName].totalEnemies += usage.totalEnemies;
      for (const sector of usage.sectors) {
        secondaryUsage[weaponName].sectors.add(sector);
      }
      secondaryUsage[weaponName].archetypes.add(archetypeName);
    }
  }

  return { archetypeUsage, primaryUsage, secondaryUsage };
}

/**
 * Format sectors as a string like "1,2,3"
 */
function formatSectors(sectors) {
  if (sectors.size === 0) return '-';
  return Array.from(sectors)
    .sort((a, b) => a - b)
    .join(',');
}

/**
 * Print a weapon table
 */
function printWeaponTable(title, usage, allWeapons) {
  console.log(`\n${title}`);
  console.log(SEPARATOR);
  console.log(
    'Weapon'.padEnd(16) +
      'Missions'.padEnd(10) +
      'Enemies'.padEnd(10) +
      'Sectors'.padEnd(12) +
      'Archetypes',
  );
  console.log(SEPARATOR);

  // Sort by total enemies (descending)
  const sorted = Object.entries(usage).sort(
    (a, b) => b[1].totalEnemies - a[1].totalEnemies,
  );

  for (const [name, data] of sorted) {
    const missionCount = data.missions.size;
    const enemyCount = data.totalEnemies;
    const sectors = formatSectors(data.sectors);
    const archetypes = Array.from(data.archetypes).sort().join(', ') || '-';

    // Flag low usage
    let flag = '';
    if (missionCount === 0) {
      flag = ' ⚠️  UNUSED';
    } else if (
      missionCount < LOW_MISSION_THRESHOLD ||
      enemyCount < LOW_ENEMY_THRESHOLD
    ) {
      flag = ' ⚠️  LOW';
    }

    const displayName = allWeapons[name]?.name || name;
    console.log(
      displayName.padEnd(16) +
        String(missionCount).padEnd(10) +
        String(enemyCount).padEnd(10) +
        sectors.padEnd(12) +
        archetypes +
        flag,
    );
  }
}

/**
 * Print archetype table
 */
function printArchetypeTable(archetypeUsage) {
  console.log('\nARCHETYPE USAGE');
  console.log(SEPARATOR);
  console.log(
    'Archetype'.padEnd(16) +
      'Ship'.padEnd(14) +
      'Missions'.padEnd(10) +
      'Enemies'.padEnd(10) +
      'Sectors',
  );
  console.log(SEPARATOR);

  // Sort by total enemies (descending)
  const sorted = Object.entries(archetypeUsage).sort(
    (a, b) => b[1].totalEnemies - a[1].totalEnemies,
  );

  for (const [name, data] of sorted) {
    const archetype = ENEMY_ARCHETYPES[name];
    const shipClass = archetype?.shipClassName || '?';
    const missionCount = data.missions.size;
    const enemyCount = data.totalEnemies;
    const sectors = formatSectors(data.sectors);

    // Flag low usage
    let flag = '';
    if (missionCount === 0) {
      flag = ' ⚠️  UNUSED';
    } else if (missionCount < LOW_MISSION_THRESHOLD) {
      flag = ' ⚠️  LOW';
    }

    console.log(
      name.padEnd(16) +
        shipClass.padEnd(14) +
        String(missionCount).padEnd(10) +
        String(enemyCount).padEnd(10) +
        sectors +
        flag,
    );
  }
}

/**
 * Print summary of issues
 */
function printSummary(primaryUsage, secondaryUsage, archetypeUsage) {
  console.log(`\n${HEADER}`);
  console.log('SUMMARY');
  console.log(HEADER);

  const unusedPrimary = Object.entries(primaryUsage)
    .filter(([_, d]) => d.missions.size === 0)
    .map(([n]) => PRIMARY_WEAPONS[n]?.name || n);

  const lowPrimary = Object.entries(primaryUsage)
    .filter(
      ([_, d]) =>
        d.missions.size > 0 &&
        (d.missions.size < LOW_MISSION_THRESHOLD ||
          d.totalEnemies < LOW_ENEMY_THRESHOLD),
    )
    .map(
      ([n, d]) =>
        `${PRIMARY_WEAPONS[n]?.name || n} (${d.missions.size} missions, ${d.totalEnemies} enemies)`,
    );

  const unusedSecondary = Object.entries(secondaryUsage)
    .filter(([_, d]) => d.missions.size === 0)
    .map(([n]) => MISSILES[n]?.name || n);

  const lowSecondary = Object.entries(secondaryUsage)
    .filter(
      ([_, d]) =>
        d.missions.size > 0 &&
        (d.missions.size < LOW_MISSION_THRESHOLD ||
          d.totalEnemies < LOW_ENEMY_THRESHOLD),
    )
    .map(
      ([n, d]) =>
        `${MISSILES[n]?.name || n} (${d.missions.size} missions, ${d.totalEnemies} enemies)`,
    );

  const unusedArchetypes = Object.entries(archetypeUsage)
    .filter(([_, d]) => d.missions.size === 0)
    .map(([n]) => n);

  const lowArchetypes = Object.entries(archetypeUsage)
    .filter(
      ([_, d]) =>
        d.missions.size > 0 && d.missions.size < LOW_MISSION_THRESHOLD,
    )
    .map(([n, d]) => `${n} (${d.missions.size} missions)`);

  console.log('\nPrimary Weapons:');
  if (unusedPrimary.length > 0) {
    console.log(`  UNUSED: ${unusedPrimary.join(', ')}`);
  }
  if (lowPrimary.length > 0) {
    console.log(`  LOW: ${lowPrimary.join(', ')}`);
  }
  if (unusedPrimary.length === 0 && lowPrimary.length === 0) {
    console.log('  All weapons have adequate coverage ✓');
  }

  console.log('\nSecondary Weapons:');
  if (unusedSecondary.length > 0) {
    console.log(`  UNUSED: ${unusedSecondary.join(', ')}`);
  }
  if (lowSecondary.length > 0) {
    console.log(`  LOW: ${lowSecondary.join(', ')}`);
  }
  if (unusedSecondary.length === 0 && lowSecondary.length === 0) {
    console.log('  All weapons have adequate coverage ✓');
  }

  console.log('\nArchetypes:');
  if (unusedArchetypes.length > 0) {
    console.log(`  UNUSED: ${unusedArchetypes.join(', ')}`);
  }
  if (lowArchetypes.length > 0) {
    console.log(`  LOW: ${lowArchetypes.join(', ')}`);
  }
  if (unusedArchetypes.length === 0 && lowArchetypes.length === 0) {
    console.log('  All archetypes have adequate coverage ✓');
  }

  // Total stats
  const totalMissions = ALL_MISSIONS.length;
  const usedArchetypes = Object.values(archetypeUsage).filter(
    (d) => d.missions.size > 0,
  ).length;
  const totalArchetypes = Object.keys(archetypeUsage).length;

  console.log(`\nTotal missions: ${totalMissions}`);
  console.log(`Archetypes used: ${usedArchetypes}/${totalArchetypes}`);
}

// Main
console.log(HEADER);
console.log('WEAPON DIVERSITY ANALYSIS');
console.log(
  `Thresholds: <${LOW_MISSION_THRESHOLD} missions or <${LOW_ENEMY_THRESHOLD} enemies = LOW`,
);
console.log(HEADER);

const { archetypeUsage, primaryUsage, secondaryUsage } =
  analyzeWeaponDiversity();

printWeaponTable('PRIMARY WEAPONS BY USAGE', primaryUsage, PRIMARY_WEAPONS);
printWeaponTable('SECONDARY WEAPONS BY USAGE', secondaryUsage, MISSILES);
printArchetypeTable(archetypeUsage);
printSummary(primaryUsage, secondaryUsage, archetypeUsage);
