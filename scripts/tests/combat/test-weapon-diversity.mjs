/**
 * Weapon Damage Diversity Test
 *
 * Tests:
 * 1. Overall weapon damage diversity (projectile vs beam vs missile)
 * 2. Per-archetype weapon mix breakdown
 *
 * Target metrics:
 * - No single weapon type should exceed 60% of total damage
 * - Each archetype should have a clear primary damage type matching its role
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  ARCHETYPES,
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 30;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

console.log(`\n${'='.repeat(70)}`);
console.log('WEAPON DAMAGE DIVERSITY TEST');
console.log('='.repeat(70));

// ============================================================================
// TEST 1: Weapon Damage Diversity
// ============================================================================
console.log('\n--- TEST 1: WEAPON DAMAGE DIVERSITY ---');
console.log('Verifying no single weapon type exceeds 60% of total damage\n');

const damageByType = { projectile: 0, beam: 0, missile: 0 };

for (const archetype of ARCHETYPES) {
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 3000 + ARCHETYPES.indexOf(archetype) * 100);
    initCombatStats(world);

    const shipA = createAIShip(
      world,
      archetype,
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const shipB = createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
      new Quaternion(),
      'regular',
    );

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);
      const aAlive = !!getComponent(world, shipA, 'health');
      const bAlive = !!getComponent(world, shipB, 'health');
      if (!aAlive || !bAlive) break;
    }

    const cs = world.systemState.combatStats;

    // Projectile damage
    for (const dmg of Object.values(cs.damageDealt)) {
      damageByType.projectile += dmg;
    }

    // Beam damage
    for (const dmg of Object.values(cs.beamDamage)) {
      damageByType.beam += dmg;
    }

    // Missile damage
    for (const dmg of Object.values(cs.missileDamage || {})) {
      damageByType.missile += dmg;
    }
  }
}

const totalDamage =
  damageByType.projectile + damageByType.beam + damageByType.missile;

console.log('Weapon Type   | Total Damage | % of Total');
console.log('-'.repeat(45));
for (const [type, damage] of Object.entries(damageByType)) {
  const pct = totalDamage > 0 ? (damage / totalDamage) * 100 : 0;
  const flag = pct > 60 ? ' ⚠ >60%' : '';
  console.log(
    `${type.padEnd(13)} | ${damage.toFixed(0).padStart(12)} | ${pct.toFixed(1).padStart(9)}%${flag}`,
  );
}
console.log('-'.repeat(45));
console.log(
  `${'TOTAL'.padEnd(13)} | ${totalDamage.toFixed(0).padStart(12)} | ${(100).toFixed(1).padStart(9)}%`,
);

// Analysis
console.log('\nDiversity Analysis:');
const maxPct = Math.max(
  ...Object.values(damageByType).map((d) => (d / totalDamage) * 100),
);
if (maxPct <= 60) {
  console.log(
    `  ✓ Good diversity: No weapon type exceeds 60% (max: ${maxPct.toFixed(1)}%)`,
  );
} else {
  console.log(
    `  ⚠ Poor diversity: ${maxPct.toFixed(1)}% from single type (target: <60%)`,
  );
}

// ============================================================================
// TEST 2: Per-Archetype Weapon Mix
// ============================================================================
console.log('\n--- TEST 2: PER-ARCHETYPE WEAPON MIX ---');
console.log('Damage breakdown by weapon type for each archetype\n');

const archetypeDamage = {};

for (const archetype of ARCHETYPES) {
  archetypeDamage[archetype] = { projectile: 0, beam: 0, missile: 0 };

  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 4000 + ARCHETYPES.indexOf(archetype) * 100);
    initCombatStats(world);

    const shipA = createAIShip(
      world,
      archetype,
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const shipB = createAIShip(
      world,
      'defender', // Use defender as target (tanky, survives longer for more data)
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
      new Quaternion(),
      'regular',
    );

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);
      const aAlive = !!getComponent(world, shipA, 'health');
      const bAlive = !!getComponent(world, shipB, 'health');
      if (!aAlive || !bAlive) break;
    }

    const cs = world.systemState.combatStats;
    for (const dmg of Object.values(cs.damageDealt)) {
      archetypeDamage[archetype].projectile += dmg;
    }
    for (const dmg of Object.values(cs.beamDamage)) {
      archetypeDamage[archetype].beam += dmg;
    }
    for (const dmg of Object.values(cs.missileDamage || {})) {
      archetypeDamage[archetype].missile += dmg;
    }
  }
}

console.log('Archetype    | Projectile | Beam   | Missile | Primary Type');
console.log('-'.repeat(65));
for (const archetype of ARCHETYPES) {
  const d = archetypeDamage[archetype];
  const total = d.projectile + d.beam + d.missile;
  const projPct = total > 0 ? (d.projectile / total) * 100 : 0;
  const beamPct = total > 0 ? (d.beam / total) * 100 : 0;
  const missilePct = total > 0 ? (d.missile / total) * 100 : 0;

  let primary = 'projectile';
  if (beamPct > projPct && beamPct > missilePct) primary = 'beam';
  if (missilePct > projPct && missilePct > beamPct) primary = 'missile';

  console.log(
    `${archetype.padEnd(12)} | ${projPct.toFixed(0).padStart(9)}% | ${beamPct.toFixed(0).padStart(5)}% | ${missilePct.toFixed(0).padStart(6)}% | ${primary}`,
  );
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n${'='.repeat(70)}`);
console.log('WEAPON DIVERSITY SUMMARY');
console.log('='.repeat(70));

console.log('\nKey Findings:');

// Weapon diversity
const projPct = (damageByType.projectile / totalDamage) * 100;
const beamPct = (damageByType.beam / totalDamage) * 100;
const missilePct = (damageByType.missile / totalDamage) * 100;
console.log(
  `  Damage mix: Projectile ${projPct.toFixed(0)}%, Beam ${beamPct.toFixed(0)}%, Missile ${missilePct.toFixed(0)}%`,
);

// Beam specialist check
const sentinelData = archetypeDamage.sentinel;
const sentinelTotal =
  sentinelData.projectile + sentinelData.beam + sentinelData.missile;
const sentinelBeamPct =
  sentinelTotal > 0 ? (sentinelData.beam / sentinelTotal) * 100 : 0;
if (sentinelBeamPct >= 40) {
  console.log(
    `  ✓ Sentinel beam focus: ${sentinelBeamPct.toFixed(0)}% (target: 40-50%)`,
  );
} else {
  console.log(
    `  ⚠ Sentinel beam focus: ${sentinelBeamPct.toFixed(0)}% (target: 40-50%)`,
  );
}

console.log(`\n${'='.repeat(70)}`);
console.log('WEAPON DIVERSITY TEST COMPLETE');
console.log(`${'='.repeat(70)}\n`);
