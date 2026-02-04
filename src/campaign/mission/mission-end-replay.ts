/**
 * Mission End Replay Helpers
 *
 * Handles replay building and saving at mission end.
 * Separated from mission-end-helpers.ts for file size compliance.
 */

import { logWarn } from '../../core/logger';
import type { World } from '../../core/types';
import {
  buildMultiplayerReplayData,
  type MultiplayerPlayerInfo,
} from '../../replay/multiplayer-replay';
import { buildReplayData } from '../../replay/replay-builder';
import { saveReplay } from '../../replay/storage';
import type { FullReplayData, MultiplayerReplayData } from '../../replay/types';
import type { stopRecording } from '../../systems/input';
import type { collectDebriefData } from '../../ui/screens/results/debrief';
import type { CampaignController } from '../controller-types';
import { getLobbyContext } from '../handlers/lobby-context';
import type { calculateSalvage } from '../salvage';
import { shipToReplayLoadout } from '../ship-ammo';
import { getCommanderShip } from '../state';
import type { Contract, OwnedShip } from '../types';
import type { MissionEndState } from './mission-waves';

// =============================================================================
// Replay Building
// =============================================================================

/** Build replay data if we were recording */
export function buildReplayIfRecording(
  recorder: ReturnType<typeof stopRecording>,
  world: World,
  contract: Contract,
  campaignState: CampaignController['screenManager']['campaignState'],
  missionEndState: MissionEndState,
  debriefData: ReturnType<typeof collectDebriefData>,
): FullReplayData | null {
  if (!recorder) return null;

  const playerShip = getCommanderShip(campaignState);
  const shipType = playerShip?.shipClass ?? 'fighter';

  const contractInfo: import('../../replay/replay-builder').ReplayContractInfo =
    {
      id: contract.id,
      name: contract.name,
      sector: contract.sector,
    };
  if (contract.missionType) {
    contractInfo.missionType = contract.missionType;
  }

  return buildReplayData({
    recorder,
    world,
    contract: contractInfo,
    shipType,
    victory: missionEndState.victory,
    debriefData,
  });
}

/** Build multiplayer replay data from the session's input recorder */
export function buildMultiplayerReplayIfRecording(
  controller: CampaignController,
  contract: Contract,
  campaignState: CampaignController['screenManager']['campaignState'],
  missionEndState: MissionEndState,
  debriefData: ReturnType<typeof collectDebriefData>,
): MultiplayerReplayData | null {
  const lobbyCtx = getLobbyContext();
  if (!lobbyCtx) return null;

  const mpState = controller.multiplayerGameState;
  if (!mpState) return null;

  const recorder = mpState.session.getInputRecorder();
  if (!recorder) return null;

  // Build a map of shipId -> OwnedShip for quick lookups
  const shipMap = new Map<string, OwnedShip>();
  for (const ship of campaignState.ships) {
    shipMap.set(ship.id, ship);
  }

  // Find the host player
  const hostPlayer = lobbyCtx.lobbyState.players.find((p) => p.isHost);
  const hostPlayerId = hostPlayer?.playerId ?? '';

  // Build player info from lobby state with actual ship loadouts
  const playerInfos: MultiplayerPlayerInfo[] = lobbyCtx.lobbyState.players.map(
    (p) => {
      const ship = p.shipId ? shipMap.get(p.shipId) : undefined;
      const loadout = ship
        ? shipToReplayLoadout(ship)
        : { shipClass: 'fighter', primaryWeapons: [], secondaryWeapons: [] };

      return {
        playerId: p.playerId,
        callsign: p.callsign,
        shipEntityId: 0, // Entity IDs are assigned during replay playback
        campaignShipId: p.shipId ?? '',
        isHost: p.isHost,
        loadout,
        autoaimDegrees: p.autoaimDegrees,
      };
    },
  );
  const hostShip = hostPlayer?.shipId
    ? shipMap.get(hostPlayer.shipId)
    : undefined;
  const hostLoadout = hostShip
    ? shipToReplayLoadout(hostShip)
    : { shipClass: 'fighter', primaryWeapons: [], secondaryWeapons: [] };

  // Build set of player-controlled ship IDs for stats aggregation
  const playerShipIds = new Set<string>();
  for (const player of lobbyCtx.lobbyState.players) {
    if (player.shipId) {
      playerShipIds.add(player.shipId);
    }
  }

  // Aggregate stats from all player-controlled pilots (not AI wingmen)
  let totalKills = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  for (const pilot of debriefData.pilots) {
    // Match pilots to player ships via campaignShipId
    if (pilot.campaignShipId && playerShipIds.has(pilot.campaignShipId)) {
      totalKills += pilot.kills;
      totalDamageDealt += pilot.damageDealt;
      totalDamageTaken += pilot.damageReceived;
    }
  }

  // Build metadata using host's ship type
  const metadata = {
    missionId: contract.id,
    missionName: contract.name,
    sector: contract.sector,
    shipType: hostLoadout.shipClass,
    outcome: missionEndState.victory ? 'victory' : 'defeat',
    durationTicks: recorder.getTickCount(),
    recordedAt: Date.now(),
    gameVersion: __APP_VERSION__,
    stats: {
      kills: totalKills,
      damageDealt: totalDamageDealt,
      damageTaken: totalDamageTaken,
    },
  } as const;

  // Convert debrief data
  const replayDebriefData = {
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

  // Get AI wingmen and autoaim setting stored at mission start
  const wingmen = recorder.getWingmen();
  const playerAutoaim = recorder.getPlayerAutoaim();

  return buildMultiplayerReplayData(
    recorder,
    playerInfos,
    hostPlayerId,
    metadata,
    hostLoadout,
    wingmen,
    playerAutoaim,
    replayDebriefData,
  );
}

// =============================================================================
// Replay Saving
// =============================================================================

/** Save replay with salvage data (works for both single-player and multiplayer) */
export function saveReplayWithSalvage(
  fullReplay: FullReplayData | MultiplayerReplayData | null,
  salvageResult: ReturnType<typeof calculateSalvage> | null,
): void {
  if (!fullReplay) return;

  if (salvageResult) {
    fullReplay.salvageData = {
      scrap: { ...salvageResult.scrap },
      weapons: salvageResult.weapons.map((w) => ({
        weaponType: w.weaponType,
        category: w.category,
        count: w.count,
      })),
      ammo: salvageResult.ammo.map((a) => ({
        weaponType: a.weaponType,
        count: a.count,
      })),
      totalValue: salvageResult.totalValue,
    };
  } else {
    fullReplay.salvageData = null;
  }

  saveReplay(fullReplay).catch((err) => {
    logWarn('[Replay] Failed to save replay:', err);
  });
}
