/**
 * Mission Spawning - Handles player and wingman spawning for missions.
 */

import { Quaternion, Vector3 } from 'three';
import { logError } from '../../core/logger';
import type { World } from '../../core/types';
import { getConvoyMaxSpeed } from '../../factories/convoy-ship';
import type { GuestShipInfo } from '../../multiplayer/mission-setup';
import type { ReplayWingman } from '../../replay/types';
import {
  shipToReplayLoadout,
  spawnGuestFromCampaign,
  spawnPlayerFromCampaign,
  spawnWingmanFromCampaign,
} from '../ship-spawning';
import { getCommanderShip, getWingmanShips } from '../state';
import type { CampaignState, Contract, OwnedShip } from '../types';
import {
  getAmbushPlayerSpawn,
  getAmbushWingmenSpawns,
} from './ambush-launcher';

/** Result of spawning player squadron for a mission */
export interface MissionSpawnResult {
  /** Replay-compatible wingman data */
  replayWingmen: ReplayWingman[];
  /** The player's ship (for replay recording) */
  playerShip: OwnedShip | undefined;
}

/**
 * Calculate spawn position and rotation for player based on mission type.
 */
export function getMissionSpawnConfig(contract: Contract): {
  position: Vector3;
  rotation?: Quaternion;
  initialSpeed?: number;
} {
  const escortData =
    contract.missionType === 'escort' ? contract.escortData : undefined;
  const stationDefenseData =
    contract.missionType === 'station-defense'
      ? contract.stationDefenseData
      : undefined;
  const ambushData =
    contract.missionType === 'ambush' ? contract.ambushData : undefined;
  const attackStationData =
    contract.missionType === 'attack-station'
      ? contract.attackStationData
      : undefined;

  let position = new Vector3(0, 0, 0);
  let rotation: Quaternion | undefined;
  let initialSpeed: number | undefined;

  if (ambushData) {
    const spawn = getAmbushPlayerSpawn(ambushData);
    position = spawn.position;
    rotation = spawn.rotation;
  } else if (attackStationData) {
    position = new Vector3(0, 0, 0);
  } else if (stationDefenseData) {
    const stationZ = stationDefenseData.stationDistance;
    position = new Vector3(0, 0, stationZ + 1500);
  } else if (escortData) {
    rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
    initialSpeed = getConvoyMaxSpeed(escortData.convoyType);
  }

  const result: {
    position: Vector3;
    rotation?: Quaternion;
    initialSpeed?: number;
  } = { position };
  if (rotation) result.rotation = rotation;
  if (initialSpeed !== undefined) result.initialSpeed = initialSpeed;
  return result;
}

/**
 * Spawn player and wingmen for a mission.
 * Returns replay-compatible wingman data.
 *
 * @param guestShipMap - Map of ship ID → guest info for multiplayer guests (spawned as PlayerControlled)
 * @param localShipId - Ship ID of the local player (for multiplayer). If not provided, commander is local.
 * @param hostAutoaimBonus - Host player's autoaim bonus in degrees
 */
export function spawnMissionSquadron(
  world: World,
  campaignState: CampaignState,
  contract: Contract,
  deployedShipIds: string[],
  guestShipMap?: Map<string, GuestShipInfo>,
  localShipId?: string,
  hostAutoaimBonus = 0,
): MissionSpawnResult {
  const playerShip = getCommanderShip(campaignState);
  const allWingmen = getWingmanShips(campaignState);
  const deployedIdSet = new Set(deployedShipIds);
  const wingmen = allWingmen.filter((w) => deployedIdSet.has(w.id));

  const spawnConfig = getMissionSpawnConfig(contract);
  const { position: playerPos, rotation, initialSpeed } = spawnConfig;

  // Determine if commander is the local player
  // If localShipId is not provided or matches commander ship, commander is local
  const commanderIsLocal =
    !localShipId || (playerShip && localShipId === playerShip.id);

  // Spawn player
  if (playerShip) {
    spawnPlayerFromCampaign(
      world,
      playerShip,
      playerPos,
      rotation,
      initialSpeed,
      commanderIsLocal,
      hostAutoaimBonus,
    );
  } else {
    logError('[Mission] No commander ship found!', {
      commanderId: campaignState.commanderId,
      shipCount: campaignState.ships.length,
      pilotCount: campaignState.pilots.length,
      deployedShipIds,
    });
  }

  // Spawn wingmen and build replay data
  const replayWingmen: ReplayWingman[] = [];
  const ambushData =
    contract.missionType === 'ambush' ? contract.ambushData : undefined;

  if (ambushData) {
    const wingmenSpawns = getAmbushWingmenSpawns(ambushData, wingmen.length);
    wingmen.forEach((wingman, index) => {
      const spawn = wingmenSpawns[index];
      if (!spawn) return;

      // Use guest spawn for multiplayer guests (PlayerControlled instead of AI)
      const guestInfo = guestShipMap?.get(wingman.id);
      if (guestInfo !== undefined) {
        const isLocal = localShipId === wingman.id;
        spawnGuestFromCampaign(
          world,
          wingman,
          spawn.position,
          spawn.rotation,
          initialSpeed,
          guestInfo.callsign,
          isLocal,
          guestInfo.autoaimDegrees,
        );
        // Guest ships go in players array, not wingmen array for replay
      } else {
        spawnWingmanFromCampaign(
          world,
          wingman,
          spawn.position,
          spawn.rotation,
          initialSpeed,
        );

        // Only AI wingmen go in replayWingmen (guests are in players array)
        const replayWingman: ReplayWingman = {
          loadout: shipToReplayLoadout(wingman),
          position: {
            x: spawn.position.x,
            y: spawn.position.y,
            z: spawn.position.z,
          },
        };
        if (wingman.pilot?.name) replayWingman.pilotName = wingman.pilot.name;
        // Get pilot's skill for this ship class
        const skill = wingman.pilot?.shipSkills[wingman.shipClass];
        if (skill) replayWingman.pilotSkill = skill;
        replayWingmen.push(replayWingman);
      }
    });
  } else {
    wingmen.forEach((wingman, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      const xOffset = 30 * side;
      const zRelative = -15 - Math.floor(index / 2) * 20;
      const zPosition = playerPos.z + zRelative;

      // Use guest spawn for multiplayer guests (PlayerControlled instead of AI)
      const guestInfo = guestShipMap?.get(wingman.id);
      if (guestInfo !== undefined) {
        const isLocal = localShipId === wingman.id;
        spawnGuestFromCampaign(
          world,
          wingman,
          new Vector3(xOffset, 0, zPosition),
          rotation,
          initialSpeed,
          guestInfo.callsign,
          isLocal,
          guestInfo.autoaimDegrees,
        );
        // Guest ships go in players array, not wingmen array for replay
      } else {
        spawnWingmanFromCampaign(
          world,
          wingman,
          new Vector3(xOffset, 0, zPosition),
          rotation,
          initialSpeed,
        );

        // Only AI wingmen go in replayWingmen (guests are in players array)
        const replayWingman: ReplayWingman = {
          loadout: shipToReplayLoadout(wingman),
          position: { x: xOffset, y: 0, z: zPosition },
        };
        if (wingman.pilot?.name) replayWingman.pilotName = wingman.pilot.name;
        // Get pilot's skill for this ship class
        const skill = wingman.pilot?.shipSkills[wingman.shipClass];
        if (skill) replayWingman.pilotSkill = skill;
        replayWingmen.push(replayWingman);
      }
    });
  }

  return { replayWingmen, playerShip };
}
