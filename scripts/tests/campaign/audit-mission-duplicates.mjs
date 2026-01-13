#!/usr/bin/env node
/**
 * Mission Duplicate Audit
 *
 * Scans all missions across all sectors and identifies duplicates
 * based on wave composition (enemy archetypes and counts).
 */

import { getMissionsForSector } from '../../../src/ui/screens/contracts-data.ts';

// ============================================================================
// Fingerprinting
// ============================================================================

/**
 * Create a fingerprint for a mission based on wave composition.
 * Ignores wave delays, mission name, rewards - only looks at enemy composition.
 */
function getMissionFingerprint(mission) {
  const waveFingerprints = mission.waves.map((wave) => {
    // Sort enemies by archetype for consistent fingerprinting
    const enemies = wave.enemies
      .map((e) => `${e.count}x${e.archetype}@${e.skill || 'default'}`)
      .sort()
      .join(',');
    return enemies;
  });
  return waveFingerprints.join('|');
}

/**
 * Create a human-readable summary of wave composition.
 */
function getWaveSummary(mission) {
  return mission.waves
    .map((wave, i) => {
      const enemies = wave.enemies
        .map((e) => `${e.count}x${e.archetype}`)
        .join(', ');
      return `W${i + 1}: ${enemies}`;
    })
    .join(' -> ');
}

// ============================================================================
// Main Audit
// ============================================================================

console.log('='.repeat(80));
console.log('MISSION DUPLICATE AUDIT');
console.log('='.repeat(80));
console.log('');

// Collect all missions
const allMissions = [];
for (let sector = 1; sector <= 5; sector++) {
  const missions = getMissionsForSector(sector);
  for (const mission of missions) {
    allMissions.push({
      ...mission,
      sector,
      fingerprint: getMissionFingerprint(mission),
      waveSummary: getWaveSummary(mission),
    });
  }
}

console.log(`Total missions scanned: ${allMissions.length}`);
console.log('');

// Group by fingerprint
const fingerprintGroups = new Map();
for (const mission of allMissions) {
  if (!fingerprintGroups.has(mission.fingerprint)) {
    fingerprintGroups.set(mission.fingerprint, []);
  }
  fingerprintGroups.get(mission.fingerprint).push(mission);
}

// Find duplicates (groups with more than one mission)
const duplicateGroups = [...fingerprintGroups.entries()]
  .filter(([_, missions]) => missions.length > 1)
  .map(([fingerprint, missions]) => ({ fingerprint, missions }));

if (duplicateGroups.length === 0) {
  console.log('No duplicates found!');
} else {
  console.log(`Found ${duplicateGroups.length} duplicate group(s):`);
  console.log('');

  for (let i = 0; i < duplicateGroups.length; i++) {
    const group = duplicateGroups[i];
    console.log('-'.repeat(80));
    console.log(
      `DUPLICATE GROUP ${i + 1} (${group.missions.length} missions with identical waves):`,
    );
    console.log(`Waves: ${group.missions[0].waveSummary}`);
    console.log('');

    for (const mission of group.missions) {
      console.log(`  - "${mission.name}" (${mission.difficulty})`);
      console.log(`    Sector ${mission.sector}, ID: ${mission.id}`);
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const totalDuplicates = duplicateGroups.reduce(
    (sum, g) => sum + g.missions.length - 1,
    0,
  );
  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Total duplicate missions to remove: ${totalDuplicates}`);
  console.log('');

  // List missions to remove (keep first, remove rest)
  console.log('Recommended removals (keep first in each group):');
  for (const group of duplicateGroups) {
    const [keep, ...remove] = group.missions;
    console.log(`  Keep: "${keep.name}" (S${keep.sector} ${keep.difficulty})`);
    for (const m of remove) {
      console.log(
        `  Remove: "${m.name}" (S${m.sector} ${m.difficulty}) - ID: ${m.id}`,
      );
    }
  }
}

console.log('');
console.log('='.repeat(80));
console.log('AUDIT COMPLETE');
console.log('='.repeat(80));
