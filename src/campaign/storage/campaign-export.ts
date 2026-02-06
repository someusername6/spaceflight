/**
 * Campaign Export/Import
 *
 * File-based import and export for campaign saves.
 * Uses gzip compression matching the replay system.
 */

import { logError } from '../../core/logger';
import {
  compressJSON,
  decompressToString,
  isGzipCompressed,
} from '../../replay/gzip';
import type { CampaignState } from '../types';
import {
  deleteCampaign,
  getActiveSlotId,
  loadCampaign,
  saveCampaign,
  setCampaignCreatedAt,
} from './campaign-db';
import { CAMPAIGN_STORAGE_VERSION, type SlotId } from './campaign-types';
import { reconstituteCampaignState } from './campaign-utils';

// =============================================================================
// File System Access API Types (non-standard, Chromium only)
// =============================================================================

/** File type filter for File System Access API */
interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}

/** Window with File System Access API (Chromium) */
interface WindowWithFileSystemAccess extends Window {
  showOpenFilePicker: (options: {
    types: FilePickerType[];
  }) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker: (options: {
    suggestedName?: string;
    types?: FilePickerType[];
  }) => Promise<FileSystemFileHandle>;
}

/** Type guard for File System Access API availability */
function hasFileSystemAccess(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

/** Get window with File System Access API (call after hasFileSystemAccess check) */
function getFileSystemWindow(): WindowWithFileSystemAccess {
  // Safe cast - only called after hasFileSystemAccess() confirms API exists
  return window as Window as WindowWithFileSystemAccess;
}

// =============================================================================
// Import/Export Result Types
// =============================================================================

/** Result of an import operation */
export interface ImportResult {
  success: boolean;
  state?: CampaignState;
  error?: string;
}

/** Export format for campaign files */
interface ExportedCampaign {
  version: typeof CAMPAIGN_STORAGE_VERSION;
  exportedAt: number;
  state: CampaignState;
}

/**
 * Export campaign from a slot to compressed bytes.
 * Uses active slot if not specified.
 * Returns null if no campaign exists.
 */
export async function exportCampaignCompressed(
  slotId?: SlotId,
): Promise<Uint8Array | null> {
  const targetSlot = slotId ?? getActiveSlotId();
  if (!targetSlot) return null;

  const state = await loadCampaign(targetSlot);
  if (!state) return null;

  const exported: ExportedCampaign = {
    version: CAMPAIGN_STORAGE_VERSION,
    exportedAt: Date.now(),
    state,
  };

  return compressJSON(exported);
}

/**
 * Export campaign from a slot to JSON string.
 * Uses active slot if not specified.
 * Returns null if no campaign exists.
 */
export async function exportCampaignJSON(
  slotId?: SlotId,
): Promise<string | null> {
  const targetSlot = slotId ?? getActiveSlotId();
  if (!targetSlot) return null;

  const state = await loadCampaign(targetSlot);
  if (!state) return null;

  const exported: ExportedCampaign = {
    version: CAMPAIGN_STORAGE_VERSION,
    exportedAt: Date.now(),
    state,
  };

  return JSON.stringify(exported, null, 2);
}

/**
 * Validate exported campaign data structure.
 */
function validateExportedCampaign(data: unknown): data is ExportedCampaign {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') return false;
  if (obj.version > CAMPAIGN_STORAGE_VERSION) return false;
  if (typeof obj.exportedAt !== 'number') return false;
  if (!obj.state || typeof obj.state !== 'object') return false;

  // Basic state validation
  const state = obj.state as Record<string, unknown>;
  if (typeof state.credits !== 'number') return false;
  if (typeof state.currentSector !== 'number') return false;
  if (!Array.isArray(state.ships)) return false;
  if (!Array.isArray(state.pilots)) return false;

  return true;
}

/**
 * Import campaign from compressed bytes into a specific slot.
 * Uses active slot if not specified.
 * Overwrites any existing campaign in the slot.
 * Returns the imported state on success.
 */
export async function importCampaignCompressed(
  data: Uint8Array,
  slotId?: SlotId,
): Promise<ImportResult> {
  try {
    const targetSlot = slotId ?? getActiveSlotId();
    if (!targetSlot) {
      return { success: false, error: 'No target slot specified' };
    }

    const json = await decompressToString(data);
    const parsed: unknown = JSON.parse(json);

    if (!validateExportedCampaign(parsed)) {
      return { success: false, error: 'Invalid campaign file format' };
    }

    // Delete existing campaign in target slot first
    await deleteCampaign(targetSlot);

    // Reconstitute and save
    const state = reconstituteCampaignState(parsed.state);
    setCampaignCreatedAt(targetSlot, parsed.exportedAt);
    await saveCampaign(state, targetSlot);

    return { success: true, state };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during import';
    logError('Failed to import campaign:', error);
    return { success: false, error: message };
  }
}

/**
 * Import campaign from JSON string into a specific slot.
 * Uses active slot if not specified.
 * Overwrites any existing campaign in the slot.
 * Returns the imported state on success.
 */
export async function importCampaignJSON(
  json: string,
  slotId?: SlotId,
): Promise<ImportResult> {
  try {
    const targetSlot = slotId ?? getActiveSlotId();
    if (!targetSlot) {
      return { success: false, error: 'No target slot specified' };
    }

    const parsed: unknown = JSON.parse(json);

    if (!validateExportedCampaign(parsed)) {
      return { success: false, error: 'Invalid campaign file format' };
    }

    await deleteCampaign(targetSlot);

    const state = reconstituteCampaignState(parsed.state);
    setCampaignCreatedAt(targetSlot, parsed.exportedAt);
    await saveCampaign(state, targetSlot);

    return { success: true, state };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during import';
    logError('Failed to import campaign:', error);
    return { success: false, error: message };
  }
}

/** Result of an export operation */
export interface ExportResult {
  success: boolean;
  /** True if user cancelled the save dialog */
  cancelled?: boolean;
  error?: string;
}

/**
 * Download campaign from a slot as a .campaign.gz file.
 * Uses active slot if not specified.
 * Shows system save dialog on supported browsers (Chromium).
 */
export async function downloadCampaign(
  filename?: string,
  slotId?: SlotId,
): Promise<ExportResult> {
  try {
    const compressed = await exportCampaignCompressed(slotId);
    if (!compressed) {
      return { success: false, error: 'No campaign to export' };
    }

    // Cast to ArrayBuffer for Blob constructor (TypeScript strictness)
    const blob = new Blob([compressed.buffer as ArrayBuffer], {
      type: 'application/gzip',
    });
    const name = filename ?? `spaceflight-campaign-${Date.now()}.campaign.gz`;

    // Try modern File System Access API (Chromium) for save dialog
    const saved = await saveWithFilePicker(blob, name);
    if (saved !== null) {
      return saved; // Success or error from picker
    }

    // Fallback: direct download to browser's default location
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during export';
    logError('Failed to export campaign:', error);
    return { success: false, error: message };
  }
}

/**
 * Try to save a blob using the File System Access API.
 * Returns ExportResult on success/error/cancel, or null if API unavailable.
 */
async function saveWithFilePicker(
  blob: Blob,
  suggestedName: string,
): Promise<ExportResult | null> {
  if (!hasFileSystemAccess()) {
    return null; // API not available, use fallback
  }

  try {
    const handle = await getFileSystemWindow().showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Campaign files',
          accept: { 'application/gzip': ['.campaign.gz'] },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

    return { success: true };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      // User cancelled - not an error, just don't save
      return { success: true, cancelled: true };
    }
    // Other errors: report them
    const message =
      e instanceof Error ? e.message : 'Unknown error during save';
    logError('Failed to save campaign file:', e);
    return { success: false, error: message };
  }
}

/**
 * Open file picker to import a campaign into a specific slot.
 * Uses active slot if not specified.
 * Automatically detects compressed vs JSON format.
 * Returns the imported state on success, or null if cancelled.
 */
export async function openCampaignFile(
  slotId?: SlotId,
): Promise<ImportResult | null> {
  const file = await pickFile();
  if (!file) return null; // User cancelled

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Detect gzip by magic bytes
  if (isGzipCompressed(bytes)) {
    return importCampaignCompressed(bytes, slotId);
  }

  // Assume JSON text
  const decoder = new TextDecoder();
  const json = decoder.decode(bytes);
  return importCampaignJSON(json, slotId);
}

/**
 * Pick a file using best available method.
 */
async function pickFile(): Promise<File | null> {
  // Try modern File System Access API (Chromium)
  if (hasFileSystemAccess()) {
    try {
      const handles = await getFileSystemWindow().showOpenFilePicker({
        types: [
          {
            description: 'Campaign files',
            accept: {
              'application/gzip': ['.gz', '.campaign.gz'],
              'application/json': ['.json', '.campaign'],
            },
          },
        ],
      });
      const handle = handles[0];
      if (!handle) return null;
      return await handle.getFile();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
      // Fall through to legacy method
    }
  }

  // Fallback for Firefox/Safari
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.campaign,.gz';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
