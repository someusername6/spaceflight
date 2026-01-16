/**
 * Replay Builder - Constructs replay data from mission state.
 *
 * Extracted from mission-callbacks.ts to keep files under 400 lines.
 */

import type { CombatStats } from '../components/combat-stats';
import { getComponent, queryEntities } from '../core/ecs';
import { logWarn } from '../core/logger';
import type { World } from '../core/types';
import type { InputRecorder } from '../input/input-recorder';
import type { DebriefData } from '../ui/screens/results/debrief';
import { encodeRLE } from './compression';
import type { FullReplayData, ReplayDebriefData, ReplayOutcome } from './types';
import { REPLAY_VERSION } from './types';

/** Contract info needed for replay metadata */
export interface ReplayContractInfo {
  id: string;
  name: string;
  sector: number;
}

/** Parameters for building replay data */
export interface ReplayBuildParams {
  recorder: InputRecorder;
  world: World;
  contract: ReplayContractInfo;
  shipType: string;
  victory: boolean;
  debriefData: DebriefData;
}

/** Build full replay data from mission state */
export function buildReplayData(
  params: ReplayBuildParams,
): FullReplayData | null {
  const { recorder, world, contract, shipType, victory, debriefData } = params;
  const replayData = recorder.getReplayData();
  const matchStats = world.systemState.matchStats;

  // Calculate stats - first try living player, then check destroyed ships
  let kills = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let foundLivingPlayer = false;

  // Query living player entity for stats (player survived)
  for (const entity of queryEntities(world, [
    'playerControlled',
    'combatStats',
  ])) {
    const stats = getComponent<CombatStats>(world, entity, 'combatStats');
    if (stats) {
      kills = stats.kills;
      damageDealt = stats.damageDealt;
      damageTaken = stats.damageReceived;
      foundLivingPlayer = true;
      break; // Only one player
    }
  }

  // If player died, get stats from destroyed ships record
  if (!foundLivingPlayer && matchStats) {
    for (const record of matchStats.destroyedShips) {
      if (record.wasPlayer) {
        kills = record.stats.kills;
        damageDealt = record.stats.damageDealt;
        damageTaken = record.stats.damageReceived;
        break;
      }
    }
  }

  // Determine outcome
  const outcome: ReplayOutcome = victory ? 'victory' : 'defeat';

  // RLE compress inputs
  const { data: compressedInputs, compressed } = encodeRLE(replayData.inputs);

  // Build full replay data with deployment loadouts for deterministic reconstruction
  const playerLoadout = recorder.getPlayerLoadout();
  if (!playerLoadout) {
    logWarn('[Replay] No player loadout captured, skipping replay save');
    return null;
  }

  const wingmen = recorder.getWingmen();
  const wingmenShips = wingmen.map((w) => w.loadout.shipClass);

  // Build metadata (conditionally add wingmenShips for exact optional types)
  const metadata: FullReplayData['metadata'] = {
    id: '', // Assigned by storage
    missionId: contract.id,
    missionName: contract.name,
    sector: contract.sector,
    shipType,
    outcome,
    durationTicks: replayData.tickCount,
    recordedAt: Date.now(),
    gameVersion: __APP_VERSION__,
    stats: { kills, damageDealt, damageTaken },
  };
  if (wingmenShips.length > 0) {
    metadata.wingmenShips = wingmenShips;
  }

  // Convert debrief data to replay format
  const replayDebriefData: ReplayDebriefData = {
    missionDuration: debriefData.missionDuration,
    pilots: debriefData.pilots.map((p) => ({
      callsign: p.callsign,
      archetype: p.archetype,
      isPlayer: p.isPlayer,
      isKIA: p.isKIA,
      kills: p.kills,
      assists: p.assists,
      damageDealt: p.damageDealt,
      damageReceived: p.damageReceived,
      hullRemaining: p.hullRemaining,
      hullMax: p.hullMax,
      timeOfDeath: p.timeOfDeath,
      weaponStats: p.weaponStats.map((w) => ({
        weaponName: w.weaponName,
        category: w.category,
        shotsFired: w.shotsFired,
        shotsOnTarget: w.shotsOnTarget,
        timeFired: w.timeFired,
        timeOnTarget: w.timeOnTarget,
        isPulseBeam: w.isPulseBeam,
        ammoCarried: w.ammoCarried,
        missilesLaunched: w.missilesLaunched,
        missilesHit: w.missilesHit,
        missilesSeduced: w.missilesSeduced,
        decoysCarried: w.decoysCarried,
        decoysDeployed: w.decoysDeployed,
        missilesSeducedByDecoy: w.missilesSeducedByDecoy,
        damageDealt: w.damageDealt,
      })),
    })),
  };

  return {
    version: REPLAY_VERSION,
    seed: replayData.seed,
    inputs: compressedInputs,
    inputsCompressed: compressed,
    tickCount: replayData.tickCount,
    metadata,
    playerLoadout,
    wingmen,
    playerAutoaim: recorder.getPlayerAutoaim(),
    debriefData: replayDebriefData,
    // salvageData will be added by caller after salvage calculation
  };
}
