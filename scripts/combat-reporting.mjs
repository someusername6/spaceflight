/**
 * Combat Simulation Reporting
 *
 * Aggregates and displays combat statistics from simulation runs.
 */

/**
 * Aggregate combat stats from multiple simulation results
 */
export function aggregateCombatStats(results) {
  const aggregated = {
    shotsFired: {},
    damageDealt: {},
    missilesFired: {},
    missilesHit: {},
    missileDamage: {},
    missilesExpired: 0,
    missilesHitOwner: 0,
    missilesSeduced: 0,
    missilesInFlight: 0,
    beamDamage: {},
    decoysLaunched: 0,
    decoysSuccessful: 0,
  };

  for (const r of results) {
    if (!r.combatStats) continue;
    const cs = r.combatStats;

    // Aggregate weapon shots/damage
    for (const [weapon, count] of Object.entries(cs.shotsFired)) {
      aggregated.shotsFired[weapon] =
        (aggregated.shotsFired[weapon] || 0) + count;
    }
    for (const [weapon, dmg] of Object.entries(cs.damageDealt)) {
      aggregated.damageDealt[weapon] =
        (aggregated.damageDealt[weapon] || 0) + dmg;
    }
    for (const [weapon, dmg] of Object.entries(cs.beamDamage)) {
      aggregated.beamDamage[weapon] =
        (aggregated.beamDamage[weapon] || 0) + dmg;
    }

    // Aggregate missile stats
    for (const [missile, count] of Object.entries(cs.missilesFired)) {
      aggregated.missilesFired[missile] =
        (aggregated.missilesFired[missile] || 0) + count;
    }
    for (const [missile, count] of Object.entries(cs.missilesHit)) {
      aggregated.missilesHit[missile] =
        (aggregated.missilesHit[missile] || 0) + count;
    }
    for (const [missile, dmg] of Object.entries(cs.missileDamage || {})) {
      aggregated.missileDamage[missile] =
        (aggregated.missileDamage[missile] || 0) + dmg;
    }
    aggregated.missilesExpired += cs.missilesExpired;
    aggregated.missilesHitOwner += cs.missilesHitOwner;
    aggregated.missilesSeduced += cs.missilesSeduced;
    aggregated.missilesInFlight += cs.missilesInFlight ?? 0;

    // Decoy stats
    aggregated.decoysLaunched += cs.decoysLaunched;
    aggregated.decoysSuccessful += cs.decoysSuccessful;
  }

  return aggregated;
}

/**
 * Print weapon stats (projectile and beam)
 */
export function printWeaponStats(aggregatedStats, runs, avgTime) {
  const hasStats =
    Object.keys(aggregatedStats.shotsFired).length > 0 ||
    Object.keys(aggregatedStats.beamDamage).length > 0;

  if (!hasStats) return;

  console.log(`\nWeapon Stats (avg per fight):`);

  // Projectile weapons
  for (const weapon of Object.keys(aggregatedStats.shotsFired).sort()) {
    const shotsFired = aggregatedStats.shotsFired[weapon] / runs;
    const damageDealt = (aggregatedStats.damageDealt[weapon] || 0) / runs;
    const dps = avgTime > 0 ? damageDealt / avgTime : 0;
    console.log(
      `  ${weapon}: ${shotsFired.toFixed(1)} shots, ${damageDealt.toFixed(0)} dmg (${dps.toFixed(1)} dps)`,
    );
  }

  // Beam weapons
  for (const weapon of Object.keys(aggregatedStats.beamDamage).sort()) {
    const damage = aggregatedStats.beamDamage[weapon] / runs;
    const dps = avgTime > 0 ? damage / avgTime : 0;
    console.log(
      `  ${weapon} (beam): ${damage.toFixed(0)} dmg (${dps.toFixed(1)} dps)`,
    );
  }
}

/**
 * Print missile stats
 */
export function printMissileStats(aggregatedStats, runs, avgTime) {
  if (Object.keys(aggregatedStats.missilesFired).length === 0) return;

  console.log(`\nMissile Stats (avg per fight):`);
  for (const missile of Object.keys(aggregatedStats.missilesFired).sort()) {
    const fired = aggregatedStats.missilesFired[missile] / runs;
    const hit = (aggregatedStats.missilesHit[missile] || 0) / runs;
    const damage = (aggregatedStats.missileDamage[missile] || 0) / runs;
    const hitRate = fired > 0 ? (hit / fired) * 100 : 0;
    const dps = avgTime > 0 ? damage / avgTime : 0;
    console.log(
      `  ${missile}: ${fired.toFixed(1)} fired, ${hit.toFixed(1)} hit (${hitRate.toFixed(0)}%), ${damage.toFixed(0)} dmg (${dps.toFixed(1)} dps)`,
    );
  }

  // Show missile outcomes
  const avgExpired = aggregatedStats.missilesExpired / runs;
  const avgHitOwner = aggregatedStats.missilesHitOwner / runs;
  const avgSeduced = aggregatedStats.missilesSeduced / runs;
  const avgInFlight = aggregatedStats.missilesInFlight / runs;
  console.log(
    `  Outcomes: ${avgExpired.toFixed(1)} expired, ${avgHitOwner.toFixed(1)} hit owner, ${avgSeduced.toFixed(1)} seduced, ${avgInFlight.toFixed(1)} in flight`,
  );
}

/**
 * Print decoy stats
 */
export function printDecoyStats(aggregatedStats, runs) {
  if (aggregatedStats.decoysLaunched === 0) return;

  console.log(`\nDecoy Stats (avg per fight):`);
  const avgLaunched = aggregatedStats.decoysLaunched / runs;
  const avgSuccessful = aggregatedStats.decoysSuccessful / runs;
  const successRate = avgLaunched > 0 ? (avgSuccessful / avgLaunched) * 100 : 0;
  console.log(
    `  Launched: ${avgLaunched.toFixed(1)}, Successful: ${avgSuccessful.toFixed(1)} (${successRate.toFixed(0)}% success)`,
  );
}

/**
 * Print first strike advantage stats
 */
export function printFirstStrikeStats(results, runs) {
  const firstKillByA = results.filter((r) => r.firstKillTeam === 'A').length;
  const firstKillByB = results.filter((r) => r.firstKillTeam === 'B').length;
  console.log(`\nFirst Strike Advantage:`);
  console.log(
    `  First kill: A=${firstKillByA} (${((firstKillByA / runs) * 100).toFixed(0)}%), B=${firstKillByB} (${((firstKillByB / runs) * 100).toFixed(0)}%)`,
  );
}

/**
 * Print spawn order analysis to detect entity ID bias
 */
export function printSpawnOrderAnalysis(results) {
  const spawnAFirstRuns = results.filter((r) => r.spawnAFirst);
  const spawnBFirstRuns = results.filter((r) => !r.spawnAFirst);
  if (spawnAFirstRuns.length === 0 || spawnBFirstRuns.length === 0) return;

  const aWinsWhenAFirst = spawnAFirstRuns.filter(
    (r) => r.winner === 'A',
  ).length;
  const aWinsWhenBFirst = spawnBFirstRuns.filter(
    (r) => r.winner === 'A',
  ).length;
  const aWinRateWhenAFirst = (aWinsWhenAFirst / spawnAFirstRuns.length) * 100;
  const aWinRateWhenBFirst = (aWinsWhenBFirst / spawnBFirstRuns.length) * 100;

  console.log(`\nSpawn Order Analysis:`);
  console.log(
    `  A spawns first (${spawnAFirstRuns.length} runs): A wins ${aWinRateWhenAFirst.toFixed(1)}%`,
  );
  console.log(
    `  B spawns first (${spawnBFirstRuns.length} runs): A wins ${aWinRateWhenBFirst.toFixed(1)}%`,
  );
}

/**
 * Print summary table for all scenarios
 */
export function printSummaryTable(allResults) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('\n| Scenario | A Win% | B Win% | Avg Time | σ |');
  console.log('|----------|--------|--------|----------|---|');

  for (const r of allResults) {
    const aWinPct = ((r.teamAWins / r.runs) * 100).toFixed(0);
    const bWinPct = ((r.teamBWins / r.runs) * 100).toFixed(0);
    console.log(
      `| ${r.name.substring(0, 35).padEnd(35)} | ${aWinPct.padStart(4)}% | ${bWinPct.padStart(4)}% | ${r.avgTime.toFixed(1).padStart(6)}s | ${r.stdDev.toFixed(1).padStart(4)}s |`,
    );
  }
}
