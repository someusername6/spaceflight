/**
 * Campaign Database - IndexedDB operations for campaign persistence.
 *
 * Features:
 * - Single active campaign (no slots)
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
  CAMPAIGN_STORAGE_VERSION,
  type CampaignMetadata,
  type StoredCampaignCompressed,
  type StoredCampaignData,
  type StoredCampaignUncompressed,
  type StoredMetadata,
} from './campaign-types';
import { reconstituteCampaignState } from './campaign-utils';

const DB_NAME = 'spaceflight-campaign';
const DB_VERSION = 1;
const STORE_NAME = 'campaign';
const METADATA_STORE_NAME = 'metadata';
const CAMPAIGN_KEY = 'active';
const METADATA_KEY = 'active';

/** Cached database connection */
let dbPromise: Promise<IDBDatabase> | null = null;

/** Track when campaign was first created (set on new campaign) */
let campaignCreatedAt: number | null = null;

/** Check if IndexedDB is available */
export function isStorageAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Open or create the database.
 * Reuses cached connection.
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!isStorageAvailable()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.createObjectStore(METADATA_STORE_NAME);
      }
    };
  });

  return dbPromise;
}

/**
 * Save campaign to IndexedDB.
 * Compresses with gzip if supported.
 * Also saves metadata separately for quick access.
 */
export async function saveCampaign(state: CampaignState): Promise<void> {
  const db = await openDB();
  const now = Date.now();

  // Track creation time for new campaigns
  if (campaignCreatedAt === null) {
    campaignCreatedAt = now;
  }

  let stored: StoredCampaignData;

  if (isCompressionSupported()) {
    const compressedState = await compressJSON(state);
    stored = {
      version: CAMPAIGN_STORAGE_VERSION,
      createdAt: campaignCreatedAt,
      savedAt: now,
      compressed: true,
      compressedState,
    } satisfies StoredCampaignCompressed;
  } else {
    stored = {
      version: CAMPAIGN_STORAGE_VERSION,
      createdAt: campaignCreatedAt,
      savedAt: now,
      compressed: false,
      state,
    } satisfies StoredCampaignUncompressed;
  }

  // Create metadata for quick access
  const metadata: StoredMetadata = {
    version: CAMPAIGN_STORAGE_VERSION,
    sector: state.currentSector,
    credits: state.credits,
    shipCount: state.ships.length,
    missionCount: state.missionCount,
    savedAt: now,
    createdAt: campaignCreatedAt,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
    const campaignStore = tx.objectStore(STORE_NAME);
    const metadataStore = tx.objectStore(METADATA_STORE_NAME);

    // Save both in the same transaction
    campaignStore.put(stored, CAMPAIGN_KEY);
    metadataStore.put(metadata, METADATA_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load campaign from IndexedDB.
 * Automatically decompresses and reconstitutes SlotArrays.
 * Returns null if no campaign exists.
 */
export async function loadCampaign(): Promise<CampaignState | null> {
  const db = await openDB();

  const stored = await new Promise<StoredCampaignData | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CAMPAIGN_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as StoredCampaignData);
    },
  );

  if (!stored) return null;

  // Version check
  if (stored.version !== CAMPAIGN_STORAGE_VERSION) {
    logError(
      `Campaign version ${stored.version} not supported (expected ${CAMPAIGN_STORAGE_VERSION})`,
    );
    return null;
  }

  // Remember creation time for future saves
  campaignCreatedAt = stored.createdAt;

  let state: CampaignState;

  if (stored.compressed) {
    state = await decompressJSON<CampaignState>(stored.compressedState);
  } else {
    state = stored.state;
  }

  // Reconstitute SlotArrays
  state = reconstituteCampaignState(state);

  logDebug(
    `Campaign loaded (saved ${new Date(stored.savedAt).toLocaleString()})`,
  );

  return state;
}

/**
 * Delete campaign from IndexedDB.
 * Called on commander death or when starting new campaign.
 */
export async function deleteCampaign(): Promise<void> {
  const db = await openDB();
  campaignCreatedAt = null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
    const campaignStore = tx.objectStore(STORE_NAME);
    const metadataStore = tx.objectStore(METADATA_STORE_NAME);

    // Delete both in the same transaction
    campaignStore.delete(CAMPAIGN_KEY);
    metadataStore.delete(METADATA_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Check if a campaign exists without loading full state.
 * Uses metadata store for fast check.
 */
export async function hasCampaign(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(METADATA_STORE_NAME, 'readonly');
      const store = tx.objectStore(METADATA_STORE_NAME);
      const request = store.count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result > 0);
    });
  } catch {
    return false;
  }
}

/**
 * Get campaign metadata without loading full state.
 * Reads from separate metadata store for fast access.
 */
export async function getCampaignMetadata(): Promise<CampaignMetadata> {
  try {
    const db = await openDB();
    const stored = await new Promise<StoredMetadata | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(METADATA_STORE_NAME, 'readonly');
        const store = tx.objectStore(METADATA_STORE_NAME);
        const request = store.get(METADATA_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as StoredMetadata);
      },
    );

    if (!stored) {
      return { exists: false };
    }

    return {
      exists: true,
      sector: stored.sector,
      credits: stored.credits,
      shipCount: stored.shipCount,
      missionCount: stored.missionCount,
      savedAt: stored.savedAt,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Set the campaign creation time.
 * Called when starting a new campaign.
 */
export function setCampaignCreatedAt(timestamp: number): void {
  campaignCreatedAt = timestamp;
}

/**
 * Clear cached database connection.
 * Useful for testing.
 */
export function clearDBCache(): void {
  dbPromise = null;
  campaignCreatedAt = null;
}
