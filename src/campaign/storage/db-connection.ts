/**
 * Shared IndexedDB Connection - Single connection manager for campaign storage.
 *
 * Manages the database connection and store creation for:
 * - Campaign data (main save)
 * - Campaign metadata (quick access)
 * - Checkpoint data (pre-mission save for non-ironman)
 */

import { logWarn } from '../../core/logger';

/** Callback type for user notifications */
type NotifyCallback = (message: string) => void;

/** Configured notification callback (optional) */
let notifyUser: NotifyCallback | null = null;

/** Configure the notification callback for database events */
export function configureDBNotifications(callback: NotifyCallback): void {
  notifyUser = callback;
}

/** Database configuration */
export const DB_NAME = 'spaceflight-campaign';
export const DB_VERSION = 2; // Incremented for STORE_CHECKPOINT addition

/** Store names */
export const STORE_CAMPAIGN = 'campaign';
export const STORE_METADATA = 'metadata';
export const STORE_CHECKPOINT = 'checkpoint';

/** Timeout for database operations (ms) */
const DB_OPEN_TIMEOUT = 3000;
/** Extended timeout when blocked by another tab (gives onversionchange time to work) */
const DB_BLOCKED_TIMEOUT = 10000;
/** Delay before showing user notification about blocked state */
const DB_BLOCKED_NOTIFY_DELAY = 2000;

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
    let blocked = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let notifyTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (notifyTimeoutId) clearTimeout(notifyTimeoutId);
    };

    // Timeout to prevent hanging if IndexedDB doesn't respond
    timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        dbPromise = null;
        logWarn(`IndexedDB open timed out after ${DB_OPEN_TIMEOUT}ms`);
        reject(new Error('IndexedDB open timed out'));
      }
    }, DB_OPEN_TIMEOUT);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      if (!settled) {
        settled = true;
        cleanup();
        dbPromise = null;
        reject(request.error);
      }
    };

    request.onblocked = () => {
      // Another connection is preventing the upgrade
      // This can happen if another tab has the database open
      blocked = true;
      logWarn('IndexedDB upgrade blocked - close other tabs using this app');

      // Extend timeout to give onversionchange time to work in the other tab
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          dbPromise = null;
          reject(
            new Error(
              'Database blocked by another tab. Close other tabs and try again.',
            ),
          );
        }
      }, DB_BLOCKED_TIMEOUT);

      // Show user notification after a short delay (if configured)
      notifyTimeoutId = setTimeout(() => {
        if (!settled && blocked) {
          notifyUser?.('Waiting for other tabs to close...');
        }
      }, DB_BLOCKED_NOTIFY_DELAY);
    };

    request.onsuccess = () => {
      if (!settled) {
        settled = true;
        cleanup();
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
