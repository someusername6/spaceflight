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
  loadCampaign,
  saveCampaign,
  setCampaignCreatedAt,
} from './campaign-db';
import { CAMPAIGN_STORAGE_VERSION } from './campaign-types';
import { reconstituteCampaignState } from './campaign-utils';

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
 * Export current campaign to compressed bytes.
 * Returns null if no campaign exists.
 */
export async function exportCampaignCompressed(): Promise<Uint8Array | null> {
  const state = await loadCampaign();
  if (!state) return null;

  const exported: ExportedCampaign = {
    version: CAMPAIGN_STORAGE_VERSION,
    exportedAt: Date.now(),
    state,
  };

  return compressJSON(exported);
}

/**
 * Export current campaign to JSON string.
 * Returns null if no campaign exists.
 */
export async function exportCampaignJSON(): Promise<string | null> {
  const state = await loadCampaign();
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
  if (obj.version !== CAMPAIGN_STORAGE_VERSION) return false;
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
 * Import campaign from compressed bytes.
 * Overwrites any existing campaign.
 * Returns the imported state on success.
 */
export async function importCampaignCompressed(
  data: Uint8Array,
): Promise<ImportResult> {
  try {
    const json = await decompressToString(data);
    const parsed: unknown = JSON.parse(json);

    if (!validateExportedCampaign(parsed)) {
      return { success: false, error: 'Invalid campaign file format' };
    }

    // Delete existing campaign first
    await deleteCampaign();

    // Reconstitute and save
    const state = reconstituteCampaignState(parsed.state);
    setCampaignCreatedAt(parsed.exportedAt);
    await saveCampaign(state);

    return { success: true, state };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during import';
    logError('Failed to import campaign:', error);
    return { success: false, error: message };
  }
}

/**
 * Import campaign from JSON string.
 * Overwrites any existing campaign.
 * Returns the imported state on success.
 */
export async function importCampaignJSON(json: string): Promise<ImportResult> {
  try {
    const parsed: unknown = JSON.parse(json);

    if (!validateExportedCampaign(parsed)) {
      return { success: false, error: 'Invalid campaign file format' };
    }

    await deleteCampaign();

    const state = reconstituteCampaignState(parsed.state);
    setCampaignCreatedAt(parsed.exportedAt);
    await saveCampaign(state);

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
  error?: string;
}

/**
 * Download current campaign as a .campaign.gz file.
 */
export async function downloadCampaign(
  filename?: string,
): Promise<ExportResult> {
  try {
    const compressed = await exportCampaignCompressed();
    if (!compressed) {
      return { success: false, error: 'No campaign to export' };
    }

    const buffer = new Uint8Array(compressed.length);
    buffer.set(compressed);
    const blob = new Blob([buffer], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);

    const name = filename ?? `spaceflight-campaign-${Date.now()}.campaign.gz`;

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
 * Open file picker to import a campaign.
 * Automatically detects compressed vs JSON format.
 * Returns the imported state on success, or null if cancelled.
 */
export async function openCampaignFile(): Promise<ImportResult | null> {
  const file = await pickFile();
  if (!file) return null; // User cancelled

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Detect gzip by magic bytes
  if (isGzipCompressed(bytes)) {
    return importCampaignCompressed(bytes);
  }

  // Assume JSON text
  const decoder = new TextDecoder();
  const json = decoder.decode(bytes);
  return importCampaignJSON(json);
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
