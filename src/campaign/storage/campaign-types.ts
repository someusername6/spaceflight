/**
 * Campaign Storage Types
 *
 * Data structures for persistent campaign storage in IndexedDB.
 * Supports 3 save slots for parallel campaigns.
 */

import type { CampaignState } from '../types';

/** Current storage format version */
export const CAMPAIGN_STORAGE_VERSION = 1;

/** Valid save slot IDs (1, 2, or 3) */
export type SlotId = 1 | 2 | 3;

/** All available slot IDs */
export const ALL_SLOT_IDS: readonly SlotId[] = [1, 2, 3] as const;

/** localStorage key for tracking active slot */
export const ACTIVE_SLOT_KEY = 'spaceflight_active_slot';

/**
 * Compressed storage format (current).
 * State is stored as gzip bytes for space efficiency.
 */
export interface StoredCampaignCompressed {
  version: typeof CAMPAIGN_STORAGE_VERSION;
  createdAt: number;
  savedAt: number;
  compressed: true;
  /** Gzip-compressed JSON of CampaignState */
  compressedState: Uint8Array;
}

/**
 * Uncompressed storage format (fallback).
 * Used when compression is not available.
 */
export interface StoredCampaignUncompressed {
  version: typeof CAMPAIGN_STORAGE_VERSION;
  createdAt: number;
  savedAt: number;
  compressed: false;
  state: CampaignState;
}

/** Union type for stored campaign formats */
export type StoredCampaignData =
  | StoredCampaignCompressed
  | StoredCampaignUncompressed;

/**
 * Campaign metadata for quick checks without loading full state.
 * Used for load campaign screen display.
 */
export interface CampaignMetadata {
  exists: boolean;
  slotId?: SlotId;
  sector?: number;
  credits?: number;
  shipCount?: number;
  missionCount?: number;
  savedAt?: number;
  /** Commander name for display */
  commanderName?: string;
  /** Ironman mode flag */
  ironmanMode?: boolean;
  /** Ship class names for displaying silhouettes */
  shipClasses?: string[];
}

/**
 * Metadata stored separately in IndexedDB for fast access.
 * Updated alongside campaign data to avoid decompression on title screen.
 */
export interface StoredMetadata {
  version: typeof CAMPAIGN_STORAGE_VERSION;
  sector: number;
  credits: number;
  shipCount: number;
  missionCount: number;
  savedAt: number;
  createdAt: number;
  /** Commander name for display (optional for backwards compat) */
  commanderName?: string;
  /** Ironman mode flag (optional for backwards compat) */
  ironmanMode?: boolean;
  /** Ship class names for displaying silhouettes */
  shipClasses?: string[];
}
