/**
 * Save System - localStorage persistence with versioning for campaign state.
 *
 * Features:
 * - 3 save slots
 * - Version tracking for future migrations
 * - Metadata (save time, mission count, credits) for UI display
 */

import { computeMaxIdFromState } from './id-generator';
import { slotArrayFromJSON } from './slot-array';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from './types';

/** Current save format version - increment when CampaignState changes */
export const SAVE_VERSION = 4;

/** Number of available save slots */
export const MAX_SAVE_SLOTS = 3;

/** localStorage key prefix for saves */
const SAVE_KEY_PREFIX = 'spaceflight_save_';

/** Metadata about a save slot (displayed in load UI) */
export interface SaveMetadata {
  slot: number;
  version: number;
  timestamp: number;
  credits: number;
  missionCount: number;
  currentSector: number;
  shipCount: number;
  pilotCount: number;
}

/** Full save data stored in localStorage */
interface SaveData {
  version: number;
  timestamp: number;
  state: CampaignState;
}

/**
 * Validate that parsed JSON is a valid SaveData structure.
 * @param data - Parsed JSON data
 * @returns true if data has required SaveData fields
 */
function isValidSaveData(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.version === 'number' &&
    typeof obj.timestamp === 'number' &&
    obj.state !== null &&
    typeof obj.state === 'object'
  );
}

/**
 * Validate that CampaignState has minimum required fields.
 * Note: seed is validated separately since v1 saves may not have it.
 * @param state - Campaign state to validate
 * @returns true if state has required fields
 */
function isValidCampaignState(state: unknown): state is CampaignState {
  if (!state || typeof state !== 'object') return false;
  const obj = state as Record<string, unknown>;
  return (
    typeof obj.credits === 'number' &&
    typeof obj.currentSector === 'number' &&
    Array.isArray(obj.ships) &&
    Array.isArray(obj.pilots)
  );
}

/**
 * Migrate save data from older versions.
 * @param state - The campaign state to migrate
 * @param fromVersion - The version of the save data
 * @returns Migrated campaign state
 */
function migrateState(
  state: CampaignState,
  fromVersion: number,
): CampaignState {
  const migrated = { ...state };

  // v1 -> v2: Add seed field for deterministic PRNG
  if (fromVersion < 2) {
    if (typeof migrated.seed !== 'number') {
      // Generate a deterministic seed from existing state fields
      // This ensures the same v1 save always migrates to the same seed
      const missionFactor = (migrated.missionCount ?? 0) * 12345;
      const creditsFactor = (migrated.credits ?? 0) * 31;
      const sectorFactor = (migrated.currentSector ?? 1) * 7919;
      migrated.seed = (missionFactor + creditsFactor + sectorFactor) >>> 0;
      console.log(`[Save Migration] v1->v2: Added seed ${migrated.seed}`);
    }
  }

  // v2 -> v3: Add nextId field for deterministic ID generation
  if (fromVersion < 3) {
    if (typeof migrated.nextId !== 'number') {
      // Compute max ID from existing entities and set nextId = max + 1
      const maxId = computeMaxIdFromState(migrated);
      migrated.nextId = maxId + 1;
      console.log(`[Save Migration] v2->v3: Set nextId to ${migrated.nextId}`);
    }
  }

  // v3 -> v4: SlotArray serialization fix
  // v3 saves have corrupted weapon data (SlotArray WeakMap didn't serialize).
  // The weapon arrays are just { slotCount: N } objects with no actual data.
  // We reset weapons to empty slots - player will need to re-equip.
  if (fromVersion < 4) {
    console.log(
      '[Save Migration] v3->v4: Fixing corrupted SlotArray weapon data',
    );
    for (const ship of migrated.ships) {
      // Check if weapon data is corrupted (raw object instead of array)
      const primary = ship.primaryWeapons as unknown;
      const secondary = ship.secondaryWeapons as unknown;

      if (!Array.isArray(primary)) {
        const slotCount = (primary as { slotCount?: number })?.slotCount ?? 2;
        console.log(
          `[Save Migration] Ship ${ship.id}: Resetting ${slotCount} primary slots`,
        );
        (ship as unknown as Record<string, unknown>).primaryWeapons =
          Array(slotCount).fill(null);
      }

      if (!Array.isArray(secondary)) {
        const slotCount = (secondary as { slotCount?: number })?.slotCount ?? 2;
        console.log(
          `[Save Migration] Ship ${ship.id}: Resetting ${slotCount} secondary slots`,
        );
        (ship as unknown as Record<string, unknown>).secondaryWeapons =
          Array(slotCount).fill(null);
      }
    }
  }

  return migrated;
}

/**
 * Reconstitute SlotArrays from loaded JSON.
 * JSON.parse creates plain arrays - we need to wrap them in proper SlotArrays.
 * @param state - The loaded campaign state with raw arrays
 * @returns Campaign state with proper SlotArray instances
 */
function reconstituteSave(state: CampaignState): CampaignState {
  return {
    ...state,
    ships: state.ships.map((ship) => ({
      ...ship,
      primaryWeapons: slotArrayFromJSON<EquippedPrimary>(
        ship.primaryWeapons as unknown as (EquippedPrimary | null)[],
      ),
      secondaryWeapons: slotArrayFromJSON<EquippedSecondary>(
        ship.secondaryWeapons as unknown as (EquippedSecondary | null)[],
      ),
    })),
  };
}

/** Get localStorage key for a save slot */
function getSaveKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

/**
 * Save campaign state to a slot.
 * @param slot - Slot number (1-3)
 * @param state - Campaign state to save
 * @returns true if save succeeded
 */
export function saveGame(slot: number, state: CampaignState): boolean {
  if (slot < 1 || slot > MAX_SAVE_SLOTS) {
    console.error(`Invalid save slot: ${slot}`);
    return false;
  }

  const saveData: SaveData = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    state,
  };

  try {
    const json = JSON.stringify(saveData);
    localStorage.setItem(getSaveKey(slot), json);
    return true;
  } catch (error) {
    console.error(`Failed to save game to slot ${slot}:`, error);
    return false;
  }
}

/**
 * Load campaign state from a slot.
 * @param slot - Slot number (1-3)
 * @returns Campaign state or null if not found/invalid
 */
export function loadGame(slot: number): CampaignState | null {
  if (slot < 1 || slot > MAX_SAVE_SLOTS) {
    console.error(`Invalid save slot: ${slot}`);
    return null;
  }

  try {
    const json = localStorage.getItem(getSaveKey(slot));
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);

    // Validate save data structure
    if (!isValidSaveData(parsed)) {
      console.error(`Invalid save data structure in slot ${slot}`);
      return null;
    }

    // Validate campaign state structure
    if (!isValidCampaignState(parsed.state)) {
      console.error(`Invalid campaign state in slot ${slot}`);
      return null;
    }

    // Apply migrations if save is from older version
    let state = parsed.state;
    if (parsed.version < SAVE_VERSION) {
      console.log(
        `[Save] Migrating save from v${parsed.version} to v${SAVE_VERSION}`,
      );
      state = migrateState(state, parsed.version);
    }

    // Reconstitute SlotArrays from raw JSON arrays
    state = reconstituteSave(state);

    return state;
  } catch (error) {
    console.error(`Failed to load game from slot ${slot}:`, error);
    return null;
  }
}

/**
 * Delete save data from a slot.
 * @param slot - Slot number (1-3)
 */
export function deleteSave(slot: number): void {
  if (slot < 1 || slot > MAX_SAVE_SLOTS) {
    console.error(`Invalid save slot: ${slot}`);
    return;
  }

  localStorage.removeItem(getSaveKey(slot));
}

/**
 * Get metadata for a save slot (for displaying in UI).
 * @param slot - Slot number (1-3)
 * @returns Save metadata or null if slot is empty
 */
export function getSaveMetadata(slot: number): SaveMetadata | null {
  if (slot < 1 || slot > MAX_SAVE_SLOTS) {
    return null;
  }

  try {
    const json = localStorage.getItem(getSaveKey(slot));
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);

    // Validate save data structure
    if (!isValidSaveData(parsed)) {
      console.warn(`Invalid save data structure in slot ${slot}`);
      return null;
    }

    // Validate campaign state structure
    if (!isValidCampaignState(parsed.state)) {
      console.warn(`Invalid campaign state in slot ${slot}`);
      return null;
    }

    const state = parsed.state;

    return {
      slot,
      version: parsed.version,
      timestamp: parsed.timestamp,
      credits: state.credits,
      missionCount: state.missionCount ?? 0,
      currentSector: state.currentSector,
      shipCount: state.ships.length,
      pilotCount: state.pilots.length,
    };
  } catch {
    return null;
  }
}

/**
 * Get metadata for all save slots.
 * @returns Array of metadata (null for empty slots)
 */
export function getAllSaveMetadata(): (SaveMetadata | null)[] {
  return [1, 2, 3].map((slot) => getSaveMetadata(slot));
}

/**
 * Check if any saves exist.
 * @returns true if at least one save slot has data
 */
export function hasSaves(): boolean {
  for (let slot = 1; slot <= MAX_SAVE_SLOTS; slot++) {
    if (localStorage.getItem(getSaveKey(slot))) {
      return true;
    }
  }
  return false;
}

/**
 * Format timestamp for display.
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatSaveDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
