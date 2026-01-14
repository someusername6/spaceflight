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
  getCampaignMetadata,
  hasCampaign,
  isStorageAvailable,
  loadCampaign,
  saveCampaign,
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
export type { CampaignMetadata, StoredCampaignData } from './campaign-types';
export { CAMPAIGN_STORAGE_VERSION } from './campaign-types';
