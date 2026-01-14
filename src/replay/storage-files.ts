/**
 * Replay File Export/Import
 *
 * Functions for exporting replays to files and importing from files.
 * Supports both compressed (.replay.gz) and JSON (.json, .replay) formats.
 */

import { compressJSON, decompressToString, isGzipCompressed } from './gzip';
import {
  migrateReplay,
  validateCoreFields,
  validateMetadata,
  validateReplayStructure,
  validateVersion,
} from './storage-validation';
import type { FullReplayData } from './types';

/**
 * Export replay to JSON string (readable format).
 */
export function exportReplayToJSON(replay: FullReplayData): string {
  return JSON.stringify(replay, null, 2);
}

/**
 * Export replay to compressed gzip bytes.
 */
export async function exportReplayCompressed(
  replay: FullReplayData,
): Promise<Uint8Array> {
  return compressJSON(replay);
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

  return validateAndMigrateReplay(data);
}

/**
 * Import replay from compressed gzip bytes.
 * Throws on invalid data.
 */
export async function importReplayCompressed(
  compressed: Uint8Array,
): Promise<FullReplayData> {
  const json = await decompressToString(compressed);
  return importReplayFromJSON(json);
}

/**
 * Validate replay data and apply migrations.
 */
function validateAndMigrateReplay(data: unknown): FullReplayData {
  validateReplayStructure(data);
  validateVersion(data);
  validateCoreFields(data);
  validateMetadata(data);
  const migrated = migrateReplay(data);
  return migrated as unknown as FullReplayData;
}

/**
 * Download replay as a compressed .replay.gz file (default).
 */
export async function downloadReplay(
  replay: FullReplayData,
  filename?: string,
): Promise<void> {
  const compressed = await exportReplayCompressed(replay);
  // Copy to new Uint8Array with dedicated ArrayBuffer to satisfy TypeScript's
  // BlobPart requirement (avoids ArrayBufferLike vs ArrayBuffer mismatch)
  const buffer = new Uint8Array(compressed.length);
  buffer.set(compressed);
  const blob = new Blob([buffer], { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);

  const baseName = replay.metadata.missionName.replace(/\s+/g, '-');
  const name = filename ?? `replay-${baseName}.replay.gz`;

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Download replay as a readable JSON file (for debugging).
 */
export function downloadReplayJSON(
  replay: FullReplayData,
  filename?: string,
): void {
  const json = exportReplayToJSON(replay);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const baseName = replay.metadata.missionName.replace(/\s+/g, '-');
  const name = filename ?? `replay-${baseName}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Open file picker to import a replay.
 * Automatically detects compressed (.gz) vs JSON format.
 * Uses File System Access API if available, falls back to input element.
 */
export async function openReplayFile(): Promise<FullReplayData | null> {
  const file = await pickFile();
  if (!file) return null;

  // Read as bytes to detect format
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Detect gzip by magic bytes
  if (isGzipCompressed(bytes)) {
    return importReplayCompressed(bytes);
  }

  // Assume JSON text
  const decoder = new TextDecoder();
  const json = decoder.decode(bytes);
  return importReplayFromJSON(json);
}

/**
 * Pick a file using best available method.
 * Accepts both compressed (.gz, .replay.gz) and uncompressed (.json, .replay) files.
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
            accept: {
              'application/gzip': ['.gz', '.replay.gz'],
              'application/json': ['.json', '.replay'],
            },
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
    input.accept = '.json,.replay,.gz';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
