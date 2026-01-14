/**
 * Campaign Storage Types
 *
 * Data structures for persistent campaign storage in IndexedDB.
 */

import type { CampaignState } from '../types';

/** Current storage format version */
export const CAMPAIGN_STORAGE_VERSION = 1;

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
 * Used for "Continue" button display.
 */
export interface CampaignMetadata {
  exists: boolean;
  sector?: number;
  credits?: number;
  shipCount?: number;
  missionCount?: number;
  savedAt?: number;
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
}
