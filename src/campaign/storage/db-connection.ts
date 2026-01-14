/**
 * Shared IndexedDB Connection - Single connection manager for campaign storage.
 *
 * Manages the database connection and store creation for:
 * - Campaign data (main save)
 * - Campaign metadata (quick access)
 * - Checkpoint data (pre-mission save for non-ironman)
 */

import { logWarn } from '../../core/logger';

/** Database configuration */
export const DB_NAME = 'spaceflight-campaign';
export const DB_VERSION = 2; // Incremented for STORE_CHECKPOINT addition

/** Store names */
export const STORE_CAMPAIGN = 'campaign';
export const STORE_METADATA = 'metadata';
export const STORE_CHECKPOINT = 'checkpoint';

/** Timeout for database operations (ms) */
const DB_OPEN_TIMEOUT = 3000;

/** Cached database connection */
let dbPromise: Promise<IDBDatabase> | null = null;

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
 * Reuses cached connection. Creates all required stores on upgrade.
 *
 * Includes timeout handling for cases where IndexedDB hangs (e.g., after
 * database deletion while page was open, or blocked upgrades).
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!isStorageAvailable()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    let settled = false;

    // Timeout to prevent hanging if IndexedDB doesn't respond
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        dbPromise = null;
        logWarn(`IndexedDB open timed out after ${DB_OPEN_TIMEOUT}ms`);
        reject(new Error('IndexedDB open timed out'));
      }
    }, DB_OPEN_TIMEOUT);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        dbPromise = null;
        reject(request.error);
      }
    };

    request.onblocked = () => {
      // Another connection is preventing the upgrade
      // This can happen if another tab has the database open
      logWarn('IndexedDB upgrade blocked - close other tabs using this app');
      // Don't reject yet - wait for the block to clear or timeout
    };

    request.onsuccess = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        const db = request.result;

        db.onclose = () => {
          dbPromise = null;
        };

        db.onversionchange = () => {
          // Another tab is trying to upgrade the database
          db.close();
          dbPromise = null;
        };

        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create all stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_CAMPAIGN)) {
        db.createObjectStore(STORE_CAMPAIGN);
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA);
      }
      if (!db.objectStoreNames.contains(STORE_CHECKPOINT)) {
        db.createObjectStore(STORE_CHECKPOINT);
      }
    };
  });

  return dbPromise;
}

/**
 * Clear cached database connection.
 * Useful for testing or after database errors.
 */
export function clearDBCache(): void {
  dbPromise = null;
}
