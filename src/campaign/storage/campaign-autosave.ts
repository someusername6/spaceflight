/**
 * Campaign Auto-Save Coordinator
 *
 * Manages automatic saving of campaign state at key points.
 * Features:
 * - Debounces rapid save requests
 * - Emergency localStorage backup on browser close
 * - Recovery from emergency saves on startup
 */

import { logDebug, logError, logWarn } from '../../core/logger';
import type { CampaignState } from '../types';
import { getActiveSlotId, saveCampaign } from './campaign-db';
import { CAMPAIGN_STORAGE_VERSION } from './campaign-types';

const EMERGENCY_SAVE_KEY = 'spaceflight_emergency_save';

/** Track if a save is in progress */
let saveInProgress = false;

/** Track if another save was requested while one was in progress */
let pendingSave: CampaignState | null = null;

/** Last saved state (to detect actual changes) */
let lastSavedJSON: string | null = null;

/**
 * Trigger an auto-save of the campaign state.
 *
 * Safe to call frequently - will debounce rapid calls.
 * If called while a save is in progress, will queue another save
 * with the latest state.
 *
 * @param state - Current campaign state
 * @param reason - Human-readable reason for the save (for logging)
 */
export async function autoSave(
  state: CampaignState,
  reason: string,
): Promise<void> {
  // Quick check: skip if state hasn't actually changed
  const stateJSON = JSON.stringify(state);
  if (stateJSON === lastSavedJSON) {
    logDebug(`Auto-save skipped (no changes): ${reason}`);
    return;
  }

  // If a save is already in progress, queue this one
  if (saveInProgress) {
    pendingSave = state;
    logDebug(`Auto-save queued: ${reason}`);
    return;
  }

  saveInProgress = true;

  try {
    const slotId = getActiveSlotId();
    if (!slotId) {
      logDebug(`Auto-save skipped (no active slot): ${reason}`);
      return;
    }
    await saveCampaign(state, slotId);
    lastSavedJSON = stateJSON;
    logDebug(`Auto-saved to slot ${slotId}: ${reason}`);
  } catch (error) {
    logError(`Auto-save failed (${reason}):`, error);
  } finally {
    saveInProgress = false;

    // Process any queued save
    if (pendingSave) {
      const queuedState = pendingSave;
      pendingSave = null;
      await autoSave(queuedState, 'queued');
    }
  }
}

/**
 * Force an immediate save, waiting for completion.
 * Use sparingly - prefer autoSave for most cases.
 */
export async function forceSave(
  state: CampaignState,
  reason: string,
): Promise<boolean> {
  try {
    const slotId = getActiveSlotId();
    if (!slotId) {
      logError(`Force-save failed (no active slot): ${reason}`);
      return false;
    }
    await saveCampaign(state, slotId);
    lastSavedJSON = JSON.stringify(state);
    logDebug(`Force-saved to slot ${slotId}: ${reason}`);
    return true;
  } catch (error) {
    logError(`Force-save failed (${reason}):`, error);
    return false;
  }
}

/**
 * Emergency save interface for beforeunload.
 * Stores state synchronously in localStorage as a backup.
 */
interface EmergencySave {
  version: typeof CAMPAIGN_STORAGE_VERSION;
  state: CampaignState;
  savedAt: number;
}

/**
 * Perform an emergency synchronous save to localStorage.
 * Called on browser close/navigation. IndexedDB is async and
 * may not complete in beforeunload, so we use localStorage.
 */
function emergencySave(state: CampaignState): void {
  try {
    const save: EmergencySave = {
      version: CAMPAIGN_STORAGE_VERSION,
      state,
      savedAt: Date.now(),
    };
    localStorage.setItem(EMERGENCY_SAVE_KEY, JSON.stringify(save));
    logDebug('Emergency save completed');
  } catch (error) {
    // localStorage might be full or disabled - nothing we can do
    logWarn('Emergency save failed:', error);
  }
}

/**
 * Check for and recover from an emergency save.
 * Should be called on startup before loading from IndexedDB.
 *
 * IMPORTANT: This does NOT clear the emergency save. The caller must
 * call clearEmergencySave() after successfully saving to IndexedDB.
 * This ensures we don't lose data if the IndexedDB save fails.
 *
 * @returns The recovered state if found and valid, null otherwise
 */
export function recoverEmergencySave(): CampaignState | null {
  try {
    const json = localStorage.getItem(EMERGENCY_SAVE_KEY);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(EMERGENCY_SAVE_KEY);
      return null;
    }

    const save = parsed as Record<string, unknown>;

    if (save.version !== CAMPAIGN_STORAGE_VERSION) {
      logWarn(`Emergency save version mismatch: ${save.version}`);
      localStorage.removeItem(EMERGENCY_SAVE_KEY);
      return null;
    }

    if (!save.state || typeof save.state !== 'object') {
      localStorage.removeItem(EMERGENCY_SAVE_KEY);
      return null;
    }

    // Validate required properties exist (catches old format saves)
    const state = save.state as Record<string, unknown>;
    if (
      !state.settings ||
      typeof state.settings !== 'object' ||
      !Array.isArray(state.ships) ||
      !Array.isArray(state.pilots)
    ) {
      logWarn('Emergency save has incompatible format, discarding');
      localStorage.removeItem(EMERGENCY_SAVE_KEY);
      return null;
    }

    // Don't clear here - caller must clear after successful IndexedDB save
    logDebug('Found emergency save to recover');

    return save.state as CampaignState;
  } catch (error) {
    logWarn('Failed to recover emergency save:', error);
    localStorage.removeItem(EMERGENCY_SAVE_KEY);
    return null;
  }
}

/**
 * Clear any existing emergency save.
 * Called after successfully loading from IndexedDB.
 */
export function clearEmergencySave(): void {
  localStorage.removeItem(EMERGENCY_SAVE_KEY);
}

/** State getter type for unload handler */
type StateGetter = () => CampaignState | null;

/** Track if unload handler is set up */
let unloadHandlerSetup = false;

/** Reference to current state getter */
let currentStateGetter: StateGetter | null = null;

/**
 * Set up browser event handlers for auto-save.
 *
 * @param getState - Function that returns the current campaign state
 */
export function setupAutoSaveHandlers(getState: StateGetter): void {
  currentStateGetter = getState;

  if (unloadHandlerSetup) return;
  unloadHandlerSetup = true;

  // Emergency save on page unload
  window.addEventListener('beforeunload', () => {
    const state = currentStateGetter?.();
    if (state) {
      emergencySave(state);
    }
  });

  // Auto-save when tab becomes hidden (user switching tabs/apps)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const state = currentStateGetter?.();
      if (state) {
        // Use async save - we have a bit more time than beforeunload
        autoSave(state, 'visibility-hidden').catch(() => {
          // Async save failed, try emergency sync save
          emergencySave(state);
        });
      }
    }
  });

  logDebug('Auto-save handlers initialized');
}

/**
 * Reset auto-save state (for testing or when campaign ends).
 */
export function resetAutoSaveState(): void {
  lastSavedJSON = null;
  pendingSave = null;
  currentStateGetter = null;
}
