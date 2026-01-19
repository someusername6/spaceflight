/**
 * Ambush Mission Balance Test
 *
 * Simulates ambush missions using the SAME code path as live gameplay:
 * - Uses mission definitions from src/ui/screens/missions/sector{1-5}/ambush.ts
 * - Uses setupAmbushMission and processAmbushMissionTick
 * - Spawns wingmen using sector-specific loadouts
 *
 * Results show:
 * - Win/loss rate
 * - Average convoy stopped vs destroyed
 * - Average wingman survival
 * - Mission duration
 *
 * Target win rates (from ambush.ts header):
 * - Easy: 75-95% win rate, 75-90% squad survival
 * - Medium: 60-80% win rate, 60-75% squad survival
 * - Hard: 45-65% win rate, 45-60% squad survival
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SECTOR_1_AMBUSH } from '../../../src/ui/screens/missions/sector1/ambush.ts';
import { SECTOR_2_AMBUSH } from '../../../src/ui/screens/missions/sector2/ambush.ts';
import { SECTOR_3_AMBUSH } from '../../../src/ui/screens/missions/sector3/ambush.ts';
import { SECTOR_4_AMBUSH } from '../../../src/ui/screens/missions/sector4/ambush.ts';
import { SECTOR_5_AMBUSH } from '../../../src/ui/screens/missions/sector5/ambush.ts';
import { runAmbushTrials } from '../shared/ambush-simulation.mjs';

// All ambush missions by sector
const ALL_AMBUSH_MISSIONS = [
  ...SECTOR_1_AMBUSH,
  ...SECTOR_2_AMBUSH,
  ...SECTOR_3_AMBUSH,
  ...SECTOR_4_AMBUSH,
  ...SECTOR_5_AMBUSH,
];

const TRIALS = 50;

// Parse command-line arguments for filtering missions
// Usage: npx tsx test-ambush-balance.mjs [mission-id...]
// Examples:
//   npx tsx test-ambush-balance.mjs s1-supply-interdiction s1-cargo-heist
const args = process.argv.slice(2);
const filterMissions = args.length > 0 ? args : null;

// Filter missions if specific IDs provided
const missionsToTest = filterMissions
  ? ALL_AMBUSH_MISSIONS.filter((m) => filterMissions.includes(m.id))
  : ALL_AMBUSH_MISSIONS;

if (filterMissions && missionsToTest.length === 0) {
  console.error(`No missions found matching: ${filterMissions.join(', ')}`);
  console.error('Available mission IDs:');
  for (const m of ALL_AMBUSH_MISSIONS) {
    console.error(`  ${m.id}`);
  }
  process.exit(1);
}

if (filterMissions) {
  console.log(
    `Testing ${missionsToTest.length} mission(s): ${missionsToTest.map((m) => m.id).join(', ')}\n`,
  );
}

describe('Ambush Mission Balance', () => {
  // Test filtered or all missions
  for (const mission of missionsToTest) {
    it(`S${mission.sector} ${mission.name} (${mission.difficulty}) balance check`, () => {
      const results = runAmbushTrials(mission, mission.sector, TRIALS);

      console.log(
        `\n=== S${mission.sector} ${mission.name} (${mission.difficulty}) ===`,
      );
      console.log(
        `Win Rate: ${results.winRate.toFixed(1)}% (${results.wins}/${results.runs})`,
      );
      console.log(`Avg Time to Win: ${results.avgTime.toFixed(1)}s`);
      console.log(
        `Squad Survival: ${results.avgPlayerSurvivors.toFixed(2)}/${results.squadSize} (${results.avgSquadSurvivalRate.toFixed(1)}% on wins)`,
      );
      console.log(
        `Avg Convoy Stopped: ${results.avgConvoyStopped.toFixed(1)}/${results.convoyTotal}`,
      );
      console.log(
        `Avg Convoy Destroyed: ${results.avgConvoyDestroyed.toFixed(1)}/${results.convoyTotal}`,
      );
      console.log(
        `Avg Reward Multiplier: ${(results.avgRewardMultiplier * 100).toFixed(1)}%`,
      );
      console.log(`Timeouts: ${results.timeouts}`);

      // Balance targets for ambush missions (from ambush.ts header)
      // Squad survival targets scaled by squad size (base is 4 ships)
      const baseTargets = {
        easy: { minWin: 75, maxWin: 95, minSquadPct: 75, maxSquadPct: 90 },
        medium: { minWin: 60, maxWin: 80, minSquadPct: 60, maxSquadPct: 75 },
        hard: { minWin: 45, maxWin: 65, minSquadPct: 45, maxSquadPct: 60 },
      };
      const target = baseTargets[mission.difficulty];

      // Report win rate status
      let winStatus = 'BALANCED';
      if (results.winRate < target.minWin) {
        winStatus = 'TOO HARD';
      } else if (results.winRate > target.maxWin) {
        winStatus = 'TOO EASY';
      }

      // Report squad survival status
      let squadStatus = 'BALANCED';
      if (results.avgSquadSurvivalRate < target.minSquadPct) {
        squadStatus = 'TOO FEW';
      } else if (results.avgSquadSurvivalRate > target.maxSquadPct) {
        squadStatus = 'TOO MANY';
      }

      console.log(
        `WIN RATE: ${winStatus} (target ${target.minWin}-${target.maxWin}%)`,
      );
      console.log(
        `SQUAD: ${squadStatus} (target ${target.minSquadPct}-${target.maxSquadPct}%)`,
      );

      // Assert win rate is non-zero (mission is completable)
      assert.ok(
        results.wins > 0,
        `Mission should be winnable (got ${results.wins} wins)`,
      );
    });
  }
});
