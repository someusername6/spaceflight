/**
 * Campaign Database - IndexedDB operations for campaign persistence.
 *
 * Features:
 * - 3 save slots for parallel campaigns
 * - Gzip compression when available
 * - Automatic SlotArray reconstitution on load
 * - Graceful fallback when IndexedDB unavailable
 */

import { logDebug, logError } from '../../core/logger';
import {
  compressJSON,
  decompressJSON,
  isCompressionSupported,
} from '../../replay/gzip';
import type { CampaignState } from '../types';
import {
  ACTIVE_SLOT_KEY,
  ALL_SLOT_IDS,
  CAMPAIGN_STORAGE_VERSION,
  type CampaignMetadata,
  type SlotId,
  type StoredCampaignCompressed,
  type StoredCampaignData,
  type StoredCampaignUncompressed,
  type StoredMetadata,
} from './campaign-types';
import { reconstituteCampaignState } from './campaign-utils';
import {
  clearDBCache as clearSharedDBCache,
  isStorageAvailable,
  openDB,
  STORE_CAMPAIGN,
  STORE_CHECKPOINT,
  STORE_METADATA,
} from './db-connection';

/** Get the campaign storage key for a slot */
function getCampaignKey(slotId: SlotId): string {
  return `slot-${slotId}`;
}

/** Get the metadata storage key for a slot */
function getMetadataKey(slotId: SlotId): string {
  return `slot-${slotId}`;
}

/** Get the checkpoint storage key for a slot */
function getCheckpointKey(slotId: SlotId): string {
  return `checkpoint-slot-${slotId}`;
}

/** Track when each campaign was first created */
const campaignCreatedAtMap: Map<SlotId, number> = new Map();

// Re-export for external use
export { isStorageAvailable };

/**
 * Get the currently active slot ID.
 * Returns null if no slot is active.
 */
export function getActiveSlotId(): SlotId | null {
  try {
    const stored = localStorage.getItem(ACTIVE_SLOT_KEY);
    if (!stored) return null;
    const value = parseInt(stored, 10);
    if (value === 1 || value === 2 || value === 3) {
      return value as SlotId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set the currently active slot ID.
 * Called when loading or creating a campaign.
 */
export function setActiveSlotId(slotId: SlotId | null): void {
  try {
    if (slotId === null) {
      localStorage.removeItem(ACTIVE_SLOT_KEY);
    } else {
      localStorage.setItem(ACTIVE_SLOT_KEY, String(slotId));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save campaign to a specific slot.
 * Compresses with gzip if supported.
 * Also saves metadata separately for quick access.
 */
export async function saveCampaign(
  state: CampaignState,
  slotId: SlotId,
): Promise<void> {
  const db = await openDB();
  const now = Date.now();

  // Track creation time for new campaigns in this slot
  if (!campaignCreatedAtMap.has(slotId)) {
    campaignCreatedAtMap.set(slotId, now);
  }
  const createdAt = campaignCreatedAtMap.get(slotId) ?? now;

  let stored: StoredCampaignData;

  if (isCompressionSupported()) {
    const compressedState = await compressJSON(state);
    stored = {
      version: CAMPAIGN_STORAGE_VERSION,
      createdAt,
      savedAt: now,
      compressed: true,
      compressedState,
    } satisfies StoredCampaignCompressed;
  } else {
    stored = {
      version: CAMPAIGN_STORAGE_VERSION,
      createdAt,
      savedAt: now,
      compressed: false,
      state,
    } satisfies StoredCampaignUncompressed;
  }

  // Extract ship classes for metadata display
  const shipClasses = state.ships.map((ship) => ship.shipClass);

  // Create metadata for quick access
  const metadata: StoredMetadata = {
    version: CAMPAIGN_STORAGE_VERSION,
    sector: state.currentSector,
    credits: state.credits,
    shipCount: state.ships.length,
    missionCount: state.missionCount,
    savedAt: now,
    createdAt,
    commanderName: state.settings.commanderName,
    ironmanMode: state.settings.ironmanMode,
    shipClasses,
  };

  const campaignKey = getCampaignKey(slotId);
  const metadataKey = getMetadataKey(slotId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CAMPAIGN, STORE_METADATA], 'readwrite');
    const campaignStore = tx.objectStore(STORE_CAMPAIGN);
    const metadataStore = tx.objectStore(STORE_METADATA);

    // Save both in the same transaction
    campaignStore.put(stored, campaignKey);
    metadataStore.put(metadata, metadataKey);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load campaign from a specific slot.
 * Automatically decompresses and reconstitutes SlotArrays.
 * Returns null if no campaign exists in that slot.
 */
export async function loadCampaign(
  slotId: SlotId,
): Promise<CampaignState | null> {
  const db = await openDB();
  const campaignKey = getCampaignKey(slotId);

  const stored = await new Promise<StoredCampaignData | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_CAMPAIGN, 'readonly');
      const store = tx.objectStore(STORE_CAMPAIGN);
      const request = store.get(campaignKey);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as StoredCampaignData);
    },
  );

  if (!stored) return null;

  // Version check - support migration from older versions
  if (stored.version > CAMPAIGN_STORAGE_VERSION) {
    logError(
      `Campaign version ${stored.version} is newer than supported (max ${CAMPAIGN_STORAGE_VERSION})`,
    );
    return null;
  }
  // Older versions are migrated in reconstituteCampaignState

  // Remember creation time for future saves
  campaignCreatedAtMap.set(slotId, stored.createdAt);

  let state: CampaignState;

  if (stored.compressed) {
    state = await decompressJSON<CampaignState>(stored.compressedState);
  } else {
    state = stored.state;
  }

  // Reconstitute SlotArrays
  state = reconstituteCampaignState(state);

  logDebug(
    `Campaign loaded from slot ${slotId} (saved ${new Date(stored.savedAt).toLocaleString()})`,
  );

  // Set this slot as active
  setActiveSlotId(slotId);

  return state;
}

/**
 * Delete campaign from a specific slot.
 * Also deletes any associated checkpoint.
 */
export async function deleteCampaign(slotId: SlotId): Promise<void> {
  const db = await openDB();
  campaignCreatedAtMap.delete(slotId);

  const campaignKey = getCampaignKey(slotId);
  const metadataKey = getMetadataKey(slotId);
  const checkpointKey = getCheckpointKey(slotId);

  // If this was the active slot, clear it
  if (getActiveSlotId() === slotId) {
    setActiveSlotId(null);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORE_CAMPAIGN, STORE_METADATA, STORE_CHECKPOINT],
      'readwrite',
    );
    const campaignStore = tx.objectStore(STORE_CAMPAIGN);
    const metadataStore = tx.objectStore(STORE_METADATA);
    const checkpointStore = tx.objectStore(STORE_CHECKPOINT);

    // Delete all slot data in the same transaction
    campaignStore.delete(campaignKey);
    metadataStore.delete(metadataKey);
    checkpointStore.delete(checkpointKey);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Check if any campaign exists in any slot.
 */
export async function hasAnyCampaign(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const request = store.count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result > 0);
    });
  } catch {
    return false;
  }
}

/**
 * Get metadata for a specific slot.
 */
export async function getSlotMetadata(
  slotId: SlotId,
): Promise<CampaignMetadata> {
  try {
    const db = await openDB();
    const metadataKey = getMetadataKey(slotId);

    const stored = await new Promise<StoredMetadata | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_METADATA, 'readonly');
        const store = tx.objectStore(STORE_METADATA);
        const request = store.get(metadataKey);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as StoredMetadata);
      },
    );

    if (!stored) {
      return { exists: false, slotId };
    }

    const metadata: CampaignMetadata = {
      exists: true,
      slotId,
      sector: stored.sector,
      credits: stored.credits,
      shipCount: stored.shipCount,
      missionCount: stored.missionCount,
      savedAt: stored.savedAt,
    };

    // Add optional fields only if defined
    if (stored.commanderName !== undefined) {
      metadata.commanderName = stored.commanderName;
    }
    if (stored.ironmanMode !== undefined) {
      metadata.ironmanMode = stored.ironmanMode;
    }
    if (stored.shipClasses !== undefined) {
      metadata.shipClasses = stored.shipClasses;
    }

    return metadata;
  } catch {
    return { exists: false, slotId };
  }
}

/**
 * Get metadata for all 3 slots.
 * Returns an array of metadata objects in slot order.
 */
export async function getAllSlotsMetadata(): Promise<CampaignMetadata[]> {
  const results = await Promise.all(
    ALL_SLOT_IDS.map((slotId) => getSlotMetadata(slotId)),
  );
  return results;
}

/**
 * Set the campaign creation time for a slot.
 * Called when starting a new campaign.
 */
export function setCampaignCreatedAt(slotId: SlotId, timestamp: number): void {
  campaignCreatedAtMap.set(slotId, timestamp);
}

/**
 * Clear cached database connection and state.
 * Useful for testing.
 */
export function clearDBCache(): void {
  clearSharedDBCache();
  campaignCreatedAtMap.clear();
}

// ============================================================================
// Legacy compatibility - these will be removed once migration is complete
// ============================================================================

/**
 * @deprecated Use hasAnyCampaign() instead
 */
export const hasCampaign = hasAnyCampaign;

/**
 * @deprecated Use getSlotMetadata() or getAllSlotsMetadata() instead
 */
export async function getCampaignMetadata(): Promise<CampaignMetadata> {
  // Return first occupied slot's metadata for backwards compat
  const slots = await getAllSlotsMetadata();
  const occupied = slots.find((s) => s.exists);
  return occupied ?? { exists: false };
}
