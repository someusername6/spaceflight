/**
 * Campaign Storage Utilities
 *
 * Shared helpers for campaign storage operations.
 * Includes migration functions for upgrading old save data.
 */

import { COMBAT_SHIP_CLASSES } from '../constants';
import { RECRUIT_BONUS_XP } from '../pilot-skills';
import { slotArrayFromJSON } from '../slot-array';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  HireablePilot,
  Pilot,
  SkillLevel,
} from '../types';

/**
 * Migrate pilot data to include ejection and XP fields if missing.
 * Handles saves from before the ejection/XP systems were added.
 */
function migratePilotFields<
  T extends {
    ejectionCount?: number;
    injuredMissionsLeft?: number;
    xp?: number;
  },
>(pilot: T): T {
  if (
    pilot.ejectionCount === undefined ||
    pilot.injuredMissionsLeft === undefined ||
    pilot.xp === undefined
  ) {
    return {
      ...pilot,
      ejectionCount: pilot.ejectionCount ?? 0,
      injuredMissionsLeft: pilot.injuredMissionsLeft ?? 0,
      xp: pilot.xp ?? 0,
    };
  }
  return pilot;
}

/**
 * Migrate a legacy pilot from single skill to ship-specific skills.
 * - Commander gets empty shipSkills (always ace via commanderId check)
 * - Legacy pilots get their skill applied to all ship classes
 * - Already-migrated pilots are returned unchanged
 */
export function migratePilotToShipSkills(
  pilot: Pilot,
  commanderId: string,
): Pilot {
  // Cast to access legacy field
  const legacyPilot = pilot as Pilot & { skill?: SkillLevel };

  // Commander always gets empty shipSkills (handled via commanderId check)
  if (pilot.id === commanderId) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { skill: _removed, ...rest } = legacyPilot;
    return {
      ...rest,
      shipSkills: {},
      injuredMissionsLeft: pilot.injuredMissionsLeft ?? 0,
    } as Pilot;
  }

  // Check if already migrated (has shipSkills with content)
  if (pilot.shipSkills && Object.keys(pilot.shipSkills).length > 0) {
    // Already has ship skills, just remove legacy field if present
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { skill: _removed, ...rest } = legacyPilot;
    return rest as Pilot;
  }

  // Check for legacy skill field
  const legacySkill = legacyPilot.skill;
  if (!legacySkill) {
    // No skill data at all - initialize empty (shouldn't happen but handle gracefully)
    return {
      ...pilot,
      shipSkills: {},
    };
  }

  // Copy legacy skill to all ship classes
  const shipSkills: Partial<Record<string, SkillLevel>> = {};
  for (const shipClass of COMBAT_SHIP_CLASSES) {
    shipSkills[shipClass] = legacySkill;
  }

  // Remove legacy field and add shipSkills
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { skill: _removed, ...restPilot } = legacyPilot;
  return {
    ...restPilot,
    shipSkills,
    injuredMissionsLeft: pilot.injuredMissionsLeft ?? 0,
  } as Pilot;
}

/**
 * Migrate all pilots in a campaign state.
 */
export function migrateCampaignPilots(
  pilots: Pilot[],
  commanderId: string,
): Pilot[] {
  return pilots.map((pilot) => migratePilotToShipSkills(pilot, commanderId));
}

/**
 * Migrate a legacy recruit to add startingShip and bonusXP fields.
 * - startingShip defaults to 'fighter' if missing
 * - bonusXP derived from skill level if missing
 */
export function migrateRecruit(recruit: HireablePilot): HireablePilot {
  // Check if already has new fields
  if (recruit.startingShip && recruit.bonusXP !== undefined) {
    return recruit;
  }

  return {
    ...recruit,
    startingShip: recruit.startingShip ?? 'fighter',
    bonusXP:
      recruit.bonusXP ??
      RECRUIT_BONUS_XP[recruit.skill as keyof typeof RECRUIT_BONUS_XP] ??
      25,
  };
}

/**
 * Migrate all recruits in a campaign state.
 */
export function migrateCampaignRecruits(
  recruits: HireablePilot[],
): HireablePilot[] {
  return recruits.map(migrateRecruit);
}

/**
 * Reconstitute SlotArrays from loaded JSON.
 * JSON.parse creates plain arrays - we need to wrap them in proper SlotArrays.
 * Also migrates old saves to add new fields and convert data formats.
 */
export function reconstituteCampaignState(state: CampaignState): CampaignState {
  const commanderId = state.commanderId;

  // Step 1: Migrate pilot fields (ejection, XP) - applies to both old and new format
  let migratedPilots = state.pilots.map(migratePilotFields);

  // Step 2: Migrate pilots to ship-specific skills (v1 → v2)
  migratedPilots = migrateCampaignPilots(
    migratedPilots as Pilot[],
    commanderId,
  );

  // Step 3: Migrate recruits to add startingShip and bonusXP (v1 → v2)
  const migratedRecruits = migrateCampaignRecruits(state.availableRecruits);

  // Step 4: Migrate ships (including embedded pilots) and reconstitute SlotArrays
  const migratedShips = state.ships.map((ship) => {
    // Migrate embedded pilot if present
    let migratedPilot = ship.pilot ? migratePilotFields(ship.pilot) : null;
    if (migratedPilot) {
      migratedPilot = migratePilotToShipSkills(
        migratedPilot as Pilot,
        commanderId,
      );
    }

    return {
      ...ship,
      pilot: migratedPilot,
      primaryWeapons: slotArrayFromJSON<EquippedPrimary>(
        ship.primaryWeapons as unknown as (EquippedPrimary | null)[],
      ),
      secondaryWeapons: slotArrayFromJSON<EquippedSecondary>(
        ship.secondaryWeapons as unknown as (EquippedSecondary | null)[],
      ),
    };
  });

  return {
    ...state,
    pilots: migratedPilots,
    ships: migratedShips,
    availableRecruits: migratedRecruits,
  };
}
