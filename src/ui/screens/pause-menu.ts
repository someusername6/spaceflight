/**
 * Pause Menu Modal - In-game menu for saving, settings, and quitting.
 *
 * Can be opened from:
 * - Pre-mission screen (Squadron, Store, Contracts)
 * - During mission (pauses game)
 * - Post-mission (Results, Debrief)
 */

import {
  formatSaveDate,
  getAllSaveMetadata,
  type SaveMetadata,
  saveGame,
} from '../../campaign/save-system';
import type { CampaignState } from '../../campaign/types';
import { escapeHtml } from '../utils';

/** Pause menu result */
export interface PauseMenuResult {
  action: 'resume' | 'settings' | 'save' | 'quit';
  saveSlot?: number;
}

/** Current view in the pause menu */
type PauseView =
  | 'main'
  | 'save'
  | 'confirm-quit'
  | 'confirm-overwrite'
  | 'error';

/** Render save slot for saving */
function renderSaveSlotForSave(
  metadata: SaveMetadata | null,
  index: number,
): string {
  const slotNum = index + 1;

  if (!metadata) {
    return `
      <div class="pause-save-slot empty" data-slot="${slotNum}">
        <div class="pause-save-header">
          <span class="pause-slot-number">Slot ${slotNum}</span>
        </div>
        <div class="pause-save-empty">Empty Slot</div>
        <button class="btn btn-small btn-success btn-save-to-slot" data-slot="${slotNum}">
          Save Here
        </button>
      </div>
    `;
  }

  return `
    <div class="pause-save-slot occupied" data-slot="${slotNum}">
      <div class="pause-save-header">
        <span class="pause-slot-number">Slot ${slotNum}</span>
        <span class="pause-save-date">${formatSaveDate(metadata.timestamp)}</span>
      </div>
      <div class="pause-save-info">
        <span>Sector ${metadata.currentSector}</span>
        <span>${metadata.missionCount} missions</span>
        <span>${metadata.credits.toLocaleString()} credits</span>
      </div>
      <button class="btn btn-small btn-warning btn-save-to-slot" data-slot="${slotNum}">
        Overwrite
      </button>
    </div>
  `;
}

/** Render save view */
function renderSaveView(): string {
  const saves = getAllSaveMetadata();

  return `
    <div class="pause-save-view">
      <div class="pause-save-title">Save Game</div>
      <div class="pause-save-list">
        ${saves.map((save, i) => renderSaveSlotForSave(save, i)).join('')}
      </div>
      <button class="btn btn-large" id="btn-pause-back">Back</button>
    </div>
  `;
}

/** Render quit confirmation view */
function renderConfirmQuitView(): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title">Quit to Title?</div>
      <div class="pause-confirm-message">Unsaved progress will be lost.</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
        <button class="btn btn-large btn-danger" id="btn-confirm-quit">Quit</button>
      </div>
    </div>
  `;
}

/** Render overwrite confirmation view */
function renderConfirmOverwriteView(slot: number): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title">Overwrite Save?</div>
      <div class="pause-confirm-message">This will replace the save in Slot ${slot}.</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
        <button class="btn btn-large btn-warning" id="btn-confirm-overwrite" data-slot="${slot}">Overwrite</button>
      </div>
    </div>
  `;
}

/** Render error view */
function renderErrorView(message: string): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title pause-error-title">Error</div>
      <div class="pause-confirm-message">${escapeHtml(message)}</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-error-ok">OK</button>
      </div>
    </div>
  `;
}

/** Render main menu view */
function renderMainView(canSave: boolean): string {
  return `
    <div class="pause-main-view">
      <div class="pause-title">Paused</div>
      <div class="pause-menu-buttons">
        <button class="btn btn-large btn-primary" id="btn-pause-resume">
          Resume
        </button>
        <button
          class="btn btn-large"
          id="btn-pause-save"
          ${canSave ? '' : 'disabled'}
          ${canSave ? '' : 'title="Cannot save during mission"'}
        >
          Save Game
        </button>
        <button class="btn btn-large" id="btn-pause-settings">
          Settings
        </button>
        <button class="btn btn-large btn-danger" id="btn-pause-quit">
          Quit to Title
        </button>
      </div>
    </div>
  `;
}

/** Render the pause menu modal */
function renderPauseModal(
  view: PauseView,
  canSave: boolean,
  overwriteSlot?: number,
  errorMessage?: string,
): string {
  let content: string;

  switch (view) {
    case 'main':
      content = renderMainView(canSave);
      break;
    case 'save':
      content = renderSaveView();
      break;
    case 'confirm-quit':
      content = renderConfirmQuitView();
      break;
    case 'confirm-overwrite':
      content = renderConfirmOverwriteView(overwriteSlot ?? 1);
      break;
    case 'error':
      content = renderErrorView(errorMessage ?? 'An error occurred.');
      break;
  }

  return `
    <div class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div class="pause-modal">
        ${content}
      </div>
    </div>
  `;
}

/**
 * Show the pause menu and wait for user action.
 * @param state - Current campaign state (for saving)
 * @param canSave - Whether saving is allowed (false during missions)
 * @returns Promise resolving to the user's action
 */
export function showPauseMenu(
  state: CampaignState,
  canSave: boolean,
): Promise<PauseMenuResult> {
  return new Promise((resolve) => {
    let currentView: PauseView = 'main';
    let pendingOverwriteSlot: number | null = null;
    let errorMessage: string | null = null;

    // Create container
    const container = document.createElement('div');
    container.innerHTML = renderPauseModal(currentView, canSave);
    document.body.appendChild(container);

    /** Update the UI */
    const update = () => {
      container.innerHTML = renderPauseModal(
        currentView,
        canSave,
        pendingOverwriteSlot ?? undefined,
        errorMessage ?? undefined,
      );
      bindEvents();
    };

    /** Cleanup and resolve */
    const cleanup = (result: PauseMenuResult) => {
      document.removeEventListener('keydown', handleKeydown);
      container.remove();
      resolve(result);
    };

    /** Handle keyboard */
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (currentView === 'save') {
          currentView = 'main';
          update();
        } else if (currentView === 'error') {
          // Escape from error returns to save view
          errorMessage = null;
          currentView = 'save';
          update();
        } else if (
          currentView === 'confirm-quit' ||
          currentView === 'confirm-overwrite'
        ) {
          currentView = currentView === 'confirm-quit' ? 'main' : 'save';
          pendingOverwriteSlot = null;
          update();
        } else {
          cleanup({ action: 'resume' });
        }
      }
    };

    /** Bind event handlers */
    const bindEvents = () => {
      // Resume button
      const resumeBtn = container.querySelector('#btn-pause-resume');
      resumeBtn?.addEventListener('click', () => {
        cleanup({ action: 'resume' });
      });

      // Save button
      const saveBtn = container.querySelector('#btn-pause-save');
      saveBtn?.addEventListener('click', () => {
        currentView = 'save';
        update();
      });

      // Settings button
      const settingsBtn = container.querySelector('#btn-pause-settings');
      settingsBtn?.addEventListener('click', () => {
        cleanup({ action: 'settings' });
      });

      // Quit button - show confirmation
      const quitBtn = container.querySelector('#btn-pause-quit');
      quitBtn?.addEventListener('click', () => {
        currentView = 'confirm-quit';
        update();
      });

      // Back button (from save view)
      const backBtn = container.querySelector('#btn-pause-back');
      backBtn?.addEventListener('click', () => {
        currentView = 'main';
        update();
      });

      // Save to slot buttons
      container.querySelectorAll('.btn-save-to-slot').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const slot = parseInt(
            (e.target as HTMLElement).dataset.slot ?? '0',
            10,
          );
          if (slot > 0) {
            const existing = getAllSaveMetadata()[slot - 1];
            if (existing) {
              // Show overwrite confirmation
              pendingOverwriteSlot = slot;
              currentView = 'confirm-overwrite';
              update();
            } else {
              // Empty slot, save directly
              if (saveGame(slot, state)) {
                cleanup({ action: 'save', saveSlot: slot });
              } else {
                // Show error on save failure
                errorMessage = `Failed to save game to Slot ${slot}. Storage may be full.`;
                currentView = 'error';
                update();
              }
            }
          }
        });
      });

      // Error OK button
      const errorOkBtn = container.querySelector('#btn-error-ok');
      errorOkBtn?.addEventListener('click', () => {
        errorMessage = null;
        currentView = 'save';
        update();
      });

      // Confirm cancel button
      const cancelBtn = container.querySelector('#btn-confirm-cancel');
      cancelBtn?.addEventListener('click', () => {
        if (currentView === 'confirm-quit') {
          currentView = 'main';
        } else {
          currentView = 'save';
        }
        pendingOverwriteSlot = null;
        update();
      });

      // Confirm quit button
      const confirmQuitBtn = container.querySelector('#btn-confirm-quit');
      confirmQuitBtn?.addEventListener('click', () => {
        cleanup({ action: 'quit' });
      });

      // Confirm overwrite button
      const confirmOverwriteBtn = container.querySelector(
        '#btn-confirm-overwrite',
      );
      confirmOverwriteBtn?.addEventListener('click', () => {
        if (pendingOverwriteSlot) {
          if (saveGame(pendingOverwriteSlot, state)) {
            cleanup({ action: 'save', saveSlot: pendingOverwriteSlot });
          } else {
            // Show error on save failure
            errorMessage = `Failed to save game to Slot ${pendingOverwriteSlot}. Storage may be full.`;
            pendingOverwriteSlot = null;
            currentView = 'error';
            update();
          }
        }
      });

      // Keyboard handler
      document.addEventListener('keydown', handleKeydown);
    };

    // Initial bind
    bindEvents();
  });
}
