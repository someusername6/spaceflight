/**
 * Debrief Data Collection - Gathers pilot stats from world state.
 *
 * Extracts combat statistics for all player faction ships (surviving and destroyed)
 * to create debrief cards after a mission.
 */

import type { CampaignState } from '../../../campaign/types';
import type { WeaponStats } from '../../../components/combat-stats';
import { snapshotStats } from '../../../components/combat-stats';
import { Faction } from '../../../components/faction';
import { getComponent, hasComponent, queryEntities } from '../../../core/ecs';
import type { World } from '../../../core/types';

/** Data for a pilot's debrief card */
export interface PilotDebriefData {
  callsign: string;
  archetype: string;
  isPlayer: boolean;
  isKIA: boolean;
  /** Ejected from destroyed ship (wingman only, not commander) */
  isEjected: boolean;
  /** Retiring after 2nd ejection (shown in debrief, removed from roster after) */
  isRetiring: boolean;
  kills: number;
  assists: number;
  damageDealt: number;
  damageReceived: number;
  hullRemaining: number;
  hullMax: number;
  timeOfDeath: number | null; // null if survived
  weaponStats: WeaponStats[];
  /** Campaign ship ID for mapping back to pilot (undefined for reinforcements) */
  campaignShipId?: string;
}

/** Debrief data for the entire mission */
export interface MissionDebriefData {
  missionDuration: number;
  pilots: PilotDebriefData[];
}

/** Collect debrief data from world state */
export function collectDebriefData(world: World): MissionDebriefData {
  const matchStats = world.systemState.matchStats;
  const missionDuration = matchStats
    ? matchStats.missionEndTime - matchStats.missionStartTime
    : 0;

  const pilots: PilotDebriefData[] = [];

  // Add destroyed ships (KIA/Ejected) from match stats
  // Note: isKIA/isEjected/isRetiring will be updated by enhanceDebriefWithEjections
  if (matchStats) {
    for (const record of matchStats.destroyedShips) {
      const pilot: PilotDebriefData = {
        callsign: record.callsign,
        archetype: record.archetype,
        isPlayer: record.wasPlayer,
        isKIA: true, // Will be updated for wingman ejections
        isEjected: false,
        isRetiring: false,
        kills: record.stats.kills,
        assists: record.stats.assists,
        damageDealt: record.stats.damageDealt,
        damageReceived: record.stats.damageReceived,
        hullRemaining: 0,
        hullMax: record.hullMax,
        timeOfDeath: record.timeOfDeath,
        weaponStats: record.stats.weaponStats,
      };
      if (record.campaignShipId) {
        pilot.campaignShipId = record.campaignShipId;
      }
      pilots.push(pilot);
    }
  }

  // Add surviving player faction ships
  for (const entity of queryEntities(world, ['shipIdentity', 'combatStats'])) {
    const faction = getComponent(world, entity, 'faction');
    if (!faction || faction.faction !== Faction.Player) continue;

    const identity = getComponent(world, entity, 'shipIdentity');
    const combatStats = getComponent(world, entity, 'combatStats');
    const health = getComponent(world, entity, 'health');

    if (!identity || !combatStats || !health) continue;

    const isPlayer = hasComponent(world, entity, 'playerControlled');
    const snapshot = snapshotStats(combatStats);

    const pilot: PilotDebriefData = {
      callsign: identity.callsign,
      archetype: identity.archetype,
      isPlayer,
      isKIA: false,
      isEjected: false,
      isRetiring: false,
      kills: snapshot.kills,
      assists: snapshot.assists,
      damageDealt: snapshot.damageDealt,
      damageReceived: snapshot.damageReceived,
      hullRemaining: health.hull,
      hullMax: health.maxHull,
      timeOfDeath: null,
      weaponStats: snapshot.weaponStats,
    };
    if (identity.campaignShipId) {
      pilot.campaignShipId = identity.campaignShipId;
    }
    pilots.push(pilot);
  }

  // Sort: Player first, then non-reinforcement by kills/damage, reinforcements last
  // Reinforcement ships have callsigns starting with "Rescue"
  pilots.sort((a, b) => {
    // Player always first
    if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;

    // Reinforcements go last (callsign starts with "Rescue")
    const aIsReinforcement = a.callsign.startsWith('Rescue');
    const bIsReinforcement = b.callsign.startsWith('Rescue');
    if (aIsReinforcement !== bIsReinforcement) {
      return aIsReinforcement ? 1 : -1;
    }

    // Within each group, sort by kills then damage
    if (a.kills !== b.kills) return b.kills - a.kills;
    return b.damageDealt - a.damageDealt;
  });

  return { missionDuration, pilots };
}

/**
 * Enhance debrief data with ejection status from campaign state.
 *
 * Called BEFORE applyMissionResults, so campaign state has the PRE-mission
 * ejection counts. This lets us determine if a destroyed wingman is:
 * - 1st ejection (ejectionCount was 0) → injured
 * - 2nd ejection (ejectionCount was 1) → retiring
 *
 * Commander deaths remain as KIA (no ejection).
 */
export function enhanceDebriefWithEjections(
  debrief: MissionDebriefData,
  campaignState: CampaignState,
): MissionDebriefData {
  // Map campaign ship IDs to pilot data for lookup
  const pilotByShipId = new Map<string, (typeof campaignState.pilots)[0]>();
  for (const ship of campaignState.ships) {
    if (ship.pilot) {
      pilotByShipId.set(ship.id, ship.pilot);
    }
  }

  const enhancedPilots = debrief.pilots.map((pilotData) => {
    // Skip survivors (no ejection)
    if (!pilotData.isKIA) {
      return pilotData;
    }

    // Skip reinforcements (no campaign ship ID)
    if (!pilotData.campaignShipId) {
      return pilotData;
    }

    // Look up the pilot from campaign state
    const campaignPilot = pilotByShipId.get(pilotData.campaignShipId);
    if (!campaignPilot) {
      return pilotData;
    }

    // Commander death = KIA (no ejection)
    if (campaignPilot.id === campaignState.commanderId) {
      return pilotData;
    }

    // Wingman destroyed = ejection
    // Check PRE-mission ejection count to determine if retiring
    const isRetiring = campaignPilot.ejectionCount >= 1;

    return {
      ...pilotData,
      isKIA: false, // Not KIA, just ejected
      isEjected: true,
      isRetiring,
    };
  });

  return {
    ...debrief,
    pilots: enhancedPilots,
  };
}
