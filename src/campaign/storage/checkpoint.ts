/**
 * Campaign Checkpoint - Pre-mission save for non-ironman defeat recovery.
 *
 * Stores campaign state before a mission starts so players can retry
 * if they lose (non-ironman mode only). Each slot has its own checkpoint.
 */

import { logDebug, logError } from '../../core/logger';
import {
  compressJSON,
  decompressJSON,
  isCompressionSupported,
} from '../../replay/gzip';
import type { CampaignState } from '../types';
import type { SlotId } from './campaign-types';
import { reconstituteCampaignState } from './campaign-utils';
import { openDB, STORE_CHECKPOINT } from './db-connection';

/** Get the checkpoint key for a slot */
function getCheckpointKey(slotId: SlotId): string {
  return `checkpoint-slot-${slotId}`;
}

/** Stored checkpoint format */
interface StoredCheckpoint {
  savedAt: number;
  compressed: boolean;
  data: Uint8Array | CampaignState;
}

/**
 * Save a checkpoint before mission starts.
 * Called only for non-ironman campaigns.
 */
export async function saveCheckpoint(
  state: CampaignState,
  slotId: SlotId,
): Promise<void> {
  try {
    const db = await openDB();
    const now = Date.now();
    const key = getCheckpointKey(slotId);

    let stored: StoredCheckpoint;

    if (isCompressionSupported()) {
      const compressed = await compressJSON(state);
      stored = {
        savedAt: now,
        compressed: true,
        data: compressed,
      };
    } else {
      stored = {
        savedAt: now,
        compressed: false,
        data: state,
      };
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHECKPOINT, 'readwrite');
      const store = tx.objectStore(STORE_CHECKPOINT);
      store.put(stored, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    logDebug(`Checkpoint saved for slot ${slotId}`);
  } catch (error) {
    logError('Failed to save checkpoint:', error);
    throw error;
  }
}

/**
 * Load checkpoint from storage for a specific slot.
 * Returns null if no checkpoint exists.
 */
export async function loadCheckpoint(
  slotId: SlotId,
): Promise<CampaignState | null> {
  try {
    const db = await openDB();
    const key = getCheckpointKey(slotId);

    const stored = await new Promise<StoredCheckpoint | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_CHECKPOINT, 'readonly');
        const store = tx.objectStore(STORE_CHECKPOINT);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as StoredCheckpoint);
      },
    );

    if (!stored) return null;

    let state: CampaignState;

    if (stored.compressed) {
      state = await decompressJSON<CampaignState>(stored.data as Uint8Array);
    } else {
      state = stored.data as CampaignState;
    }

    // Reconstitute SlotArrays
    state = reconstituteCampaignState(state);

    logDebug(`Checkpoint loaded for slot ${slotId}`);
    return state;
  } catch (error) {
    logError('Failed to load checkpoint:', error);
    return null;
  }
}

/**
 * Delete checkpoint from storage for a specific slot.
 * Called after successful mission completion or when starting a new campaign.
 */
export async function deleteCheckpoint(slotId: SlotId): Promise<void> {
  try {
    const db = await openDB();
    const key = getCheckpointKey(slotId);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHECKPOINT, 'readwrite');
      const store = tx.objectStore(STORE_CHECKPOINT);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    logDebug(`Checkpoint deleted for slot ${slotId}`);
  } catch (error) {
    // Log but don't throw - checkpoint cleanup is not critical
    logError('Failed to delete checkpoint:', error);
  }
}

/**
 * Check if a checkpoint exists for a specific slot.
 */
export async function hasCheckpoint(slotId: SlotId): Promise<boolean> {
  try {
    const db = await openDB();
    const key = getCheckpointKey(slotId);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHECKPOINT, 'readonly');
      const store = tx.objectStore(STORE_CHECKPOINT);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result !== undefined);
    });
  } catch {
    return false;
  }
}
