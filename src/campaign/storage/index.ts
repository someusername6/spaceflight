/**
 * Campaign Storage Module
 *
 * Unified export for campaign persistence functionality.
 */

// Auto-save
export {
  autoSave,
  clearEmergencySave,
  forceSave,
  recoverEmergencySave,
  resetAutoSaveState,
  setupAutoSaveHandlers,
} from './campaign-autosave';
// Database operations
export {
  clearDBCache,
  deleteCampaign,
  getActiveSlotId,
  getAllSlotsMetadata,
  getCampaignMetadata,
  getSlotMetadata,
  hasAnyCampaign,
  hasCampaign,
  isStorageAvailable,
  loadCampaign,
  saveCampaign,
  setActiveSlotId,
  setCampaignCreatedAt,
} from './campaign-db';
export type { ExportResult, ImportResult } from './campaign-export';
// Export/Import
export {
  downloadCampaign,
  exportCampaignCompressed,
  exportCampaignJSON,
  importCampaignCompressed,
  importCampaignJSON,
  openCampaignFile,
} from './campaign-export';
// Types
export type {
  CampaignMetadata,
  SlotId,
  StoredCampaignData,
} from './campaign-types';
export { ALL_SLOT_IDS, CAMPAIGN_STORAGE_VERSION } from './campaign-types';
// Checkpoint (pre-mission save for non-ironman recovery)
export {
  deleteCheckpoint,
  hasCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
} from './checkpoint';
