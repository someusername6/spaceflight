/**
 * Replay Storage
 *
 * IndexedDB wrapper for saving and loading replays.
 * Features:
 * - FIFO eviction when exceeding MAX_STORED_REPLAYS
 * - File export/import for sharing
 * - Graceful fallback when IndexedDB unavailable
 *
 * Note on async patterns: This module uses a hybrid async/await + Promise
 * pattern. IndexedDB uses callbacks, not promises, so individual operations
 * (get, put, delete, cursor iteration) must be wrapped in raw Promises.
 * However, we use async/await at the function level for cleaner orchestration
 * of multiple operations (e.g., await openDB(), await getReplayCount()).
 */

import { logWarn } from '../core/logger';
import { compressJSON, decompressJSON, isCompressionSupported } from './gzip';
import type { FullReplayData, ReplaySummary, StoredReplay } from './types';
import { MAX_STORED_REPLAYS, toReplaySummary } from './types';

// Re-export file operations from storage-files
export {
  downloadReplay,
  downloadReplayJSON,
  exportReplayCompressed,
  exportReplayToJSON,
  importReplayCompressed,
  importReplayFromJSON,
  openReplayFile,
} from './storage-files';

const DB_NAME = 'spaceflight-replays';
const DB_VERSION = 1;
const STORE_NAME = 'replays';

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
      // Handle unexpected database close (e.g., browser clearing data)
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
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Generate a unique replay ID.
 * Combines timestamp with random suffix for uniqueness.
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Get total replay count.
 */
export async function getReplayCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Evict oldest N replays to make room.
 */
async function evictOldest(count: number): Promise<void> {
  if (count <= 0) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('savedAt');
    const request = index.openCursor(null, 'next'); // Oldest first

    let deleted = 0;
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && deleted < count) {
        cursor.delete();
        deleted++;
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

/**
 * Save a replay to IndexedDB.
 * Auto-evicts oldest replays if over limit.
 * Compresses replay data with gzip if supported.
 * Returns the assigned ID.
 */
export async function saveReplay(replay: FullReplayData): Promise<string> {
  const db = await openDB();

  // Check count and evict if needed
  const count = await getReplayCount();
  if (count >= MAX_STORED_REPLAYS) {
    await evictOldest(count - MAX_STORED_REPLAYS + 1);
  }

  const id = generateId();

  // Update metadata with assigned ID
  const metadataWithId = { ...replay.metadata, id };
  const replayWithId: FullReplayData = {
    ...replay,
    metadata: metadataWithId,
  };

  // Build stored replay - compress if supported
  let stored: StoredReplay;
  if (isCompressionSupported()) {
    const compressedData = await compressJSON(replayWithId);
    stored = {
      id,
      savedAt: Date.now(),
      metadata: metadataWithId,
      compressedData,
    };
  } else {
    // Fallback to uncompressed storage
    stored = {
      id,
      savedAt: Date.now(),
      metadata: metadataWithId,
      data: replayWithId,
    };
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(stored);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(id);
  });
}

/**
 * Load a replay by ID.
 * Automatically decompresses if stored in compressed format.
 * Returns null if not found.
 */
export async function loadReplay(id: string): Promise<FullReplayData | null> {
  const db = await openDB();
  const stored = await new Promise<StoredReplay | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as StoredReplay);
    },
  );

  if (!stored) return null;

  // New format: compressed data
  if (stored.compressedData) {
    return decompressJSON<FullReplayData>(stored.compressedData);
  }

  // Legacy format: uncompressed data
  return stored.data ?? null;
}

/**
 * List all replays as summaries (sorted by date, newest first).
 * More efficient than loading full replay data.
 * Uses separate metadata field for compressed replays (no decompression needed).
 */
export async function listReplays(): Promise<ReplaySummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('savedAt');
    const request = index.openCursor(null, 'prev'); // Newest first

    const results: ReplaySummary[] = [];
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const stored = cursor.value as StoredReplay;
        // New format has metadata at top level, legacy has it in data
        const metadata = stored.metadata ?? stored.data?.metadata;
        if (metadata) {
          results.push(toReplaySummary(metadata));
        } else {
          logWarn(`Replay ${stored.id} has no metadata, skipping`);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

/**
 * Delete a replay by ID.
 */
export async function deleteReplay(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all replays (for testing or user reset).
 */
export async function clearAllReplays(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
