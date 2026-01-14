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

import {
  migrateReplay,
  validateCoreFields,
  validateMetadata,
  validateReplayStructure,
  validateVersion,
} from './storage-validation';
import type { FullReplayData, ReplaySummary, StoredReplay } from './types';
import { MAX_STORED_REPLAYS, toReplaySummary } from './types';

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
  const replayWithId: FullReplayData = {
    ...replay,
    metadata: {
      ...replay.metadata,
      id,
    },
  };

  const stored: StoredReplay = {
    id,
    data: replayWithId,
    savedAt: Date.now(),
  };

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
 * Returns null if not found.
 */
export async function loadReplay(id: string): Promise<FullReplayData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const stored = request.result as StoredReplay | undefined;
      resolve(stored?.data ?? null);
    };
  });
}

/**
 * List all replays as summaries (sorted by date, newest first).
 * More efficient than loading full replay data.
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
        results.push(toReplaySummary(stored.data.metadata));
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

// ============================================================================
// File Export/Import
// ============================================================================

/**
 * Export replay to JSON string for file download.
 */
export function exportReplayToJSON(replay: FullReplayData): string {
  return JSON.stringify(replay, null, 2);
}

/**
 * Validate and import replay from JSON string.
 * Throws on invalid data.
 */
export function importReplayFromJSON(json: string): FullReplayData {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON format');
  }

  // Validate structure and fields
  validateReplayStructure(data);
  validateVersion(data);
  validateCoreFields(data);
  validateMetadata(data);

  // Version migration - upgrade older replay formats to current version
  const migrated = migrateReplay(data);

  return migrated as unknown as FullReplayData;
}

/**
 * Download replay as a JSON file.
 */
export function downloadReplay(
  replay: FullReplayData,
  filename?: string,
): void {
  const json = exportReplayToJSON(replay);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const name =
    filename ??
    `replay-${replay.metadata.missionName.replace(/\s+/g, '-')}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Open file picker to import a replay.
 * Uses File System Access API if available, falls back to input element.
 */
export async function openReplayFile(): Promise<FullReplayData | null> {
  const file = await pickFile();
  if (!file) return null;

  const json = await file.text();
  return importReplayFromJSON(json);
}

/**
 * Pick a file using best available method.
 */
async function pickFile(): Promise<File | null> {
  // Try modern File System Access API (Chromium)
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await (
        window as Window & {
          showOpenFilePicker: (options: {
            types: { description: string; accept: Record<string, string[]> }[];
          }) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        types: [
          {
            description: 'Replay files',
            accept: { 'application/json': ['.json', '.replay'] },
          },
        ],
      });
      const handle = handles[0];
      if (!handle) return null;
      return await handle.getFile();
    } catch (e) {
      // User cancelled or API error
      if ((e as Error).name === 'AbortError') return null;
      // Fall through to legacy method
    }
  }

  // Fallback for Firefox/Safari
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.replay';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
