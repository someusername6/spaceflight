/**
 * Title Screen - Main menu with new game, continue, and settings options.
 *
 * Displays:
 * - Game logo/title
 * - New Game button
 * - Continue button (shows save slots)
 * - Settings button
 */

import {
  deleteSave,
  formatSaveDate,
  getAllSaveMetadata,
  hasSaves,
  loadGame,
  type SaveMetadata,
} from '../../campaign/save-system';
import type { CampaignState } from '../../campaign/types';
import { escapeHtml } from '../utils';

/** Title screen callbacks */
export interface TitleScreenCallbacks {
  onNewGame: () => void;
  onContinue: (state: CampaignState, slot: number) => void;
  onSettings: () => void;
}

/** Current view state */
type TitleView = 'main' | 'saves' | 'confirm-delete' | 'error';

/** Title screen UI state */
interface TitleUIState {
  view: TitleView;
  deleteSlot: number | null;
  errorMessage: string | null;
}

let uiState: TitleUIState = {
  view: 'main',
  deleteSlot: null,
  errorMessage: null,
};

/** Cleanup function for keyboard handler */
let keyboardCleanup: (() => void) | null = null;

/** Render a save slot card */
function renderSaveSlot(metadata: SaveMetadata | null, index: number): string {
  const slotNum = index + 1;

  if (!metadata) {
    return `
      <div class="save-slot empty" data-slot="${slotNum}">
        <div class="save-slot-header">
          <span class="save-slot-number">Slot ${slotNum}</span>
        </div>
        <div class="save-slot-empty">Empty</div>
      </div>
    `;
  }

  return `
    <div class="save-slot occupied" data-slot="${slotNum}">
      <div class="save-slot-header">
        <span class="save-slot-number">Slot ${slotNum}</span>
        <span class="save-slot-date">${formatSaveDate(metadata.timestamp)}</span>
      </div>
      <div class="save-slot-info">
        <div class="save-slot-stat">
          <span class="save-stat-label">Sector</span>
          <span class="save-stat-value">${metadata.currentSector}</span>
        </div>
        <div class="save-slot-stat">
          <span class="save-stat-label">Missions</span>
          <span class="save-stat-value">${metadata.missionCount}</span>
        </div>
        <div class="save-slot-stat">
          <span class="save-stat-label">Credits</span>
          <span class="save-stat-value">${metadata.credits.toLocaleString()}</span>
        </div>
        <div class="save-slot-stat">
          <span class="save-stat-label">Ships</span>
          <span class="save-stat-value">${metadata.shipCount}</span>
        </div>
      </div>
      <div class="save-slot-actions">
        <button class="btn btn-small btn-load" data-slot="${slotNum}">Load</button>
        <button class="btn btn-small btn-danger btn-delete" data-slot="${slotNum}">Delete</button>
      </div>
    </div>
  `;
}

/** Render saves view (load game) */
function renderSavesView(): string {
  const saves = getAllSaveMetadata();

  return `
    <div class="title-saves-view">
      <div class="panel-header">
        <h2>Load Game</h2>
      </div>
      <div class="saves-list">
        ${saves.map((save, i) => renderSaveSlot(save, i)).join('')}
      </div>
      <div class="saves-footer">
        <button class="btn btn-large" id="btn-back-to-title">Back</button>
      </div>
    </div>
  `;
}

/** Render delete confirmation view */
function renderConfirmDeleteView(slot: number): string {
  return `
    <div class="title-confirm-view">
      <div class="title-confirm-content">
        <div class="title-confirm-title">Delete Save?</div>
        <div class="title-confirm-message">
          This will permanently delete the save in Slot ${slot}.
        </div>
        <div class="title-confirm-buttons">
          <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
          <button class="btn btn-large btn-danger" id="btn-confirm-delete" data-slot="${slot}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

/** Render error view */
function renderErrorView(message: string): string {
  return `
    <div class="title-confirm-view">
      <div class="title-confirm-content">
        <div class="title-confirm-title title-error-title">Error</div>
        <div class="title-confirm-message">${escapeHtml(message)}</div>
        <div class="title-confirm-buttons">
          <button class="btn btn-large" id="btn-error-ok">OK</button>
        </div>
      </div>
    </div>
  `;
}

/** Render main menu view */
function renderMainView(): string {
  const canContinue = hasSaves();

  return `
    <div class="title-main-view">
      <div class="title-logo">
        <h1 class="title-name">Spaceflight</h1>
        <div class="title-subtitle">Squadron Commander</div>
      </div>
      <div class="title-menu">
        <button class="btn btn-title btn-primary" id="btn-new-game">
          New Game
        </button>
        <button
          class="btn btn-title"
          id="btn-continue"
          ${canContinue ? '' : 'disabled'}
        >
          Continue
        </button>
        <button class="btn btn-title" id="btn-settings">
          Settings
        </button>
      </div>
      <div class="title-footer">
        <span class="title-version">v0.1.0</span>
      </div>
    </div>
  `;
}

/** Render the title screen */
export function renderTitleScreen(element: HTMLElement): void {
  let content: string;

  switch (uiState.view) {
    case 'main':
      content = renderMainView();
      break;
    case 'saves':
      content = renderSavesView();
      break;
    case 'confirm-delete':
      content = renderConfirmDeleteView(uiState.deleteSlot ?? 1);
      break;
    case 'error':
      content = renderErrorView(uiState.errorMessage ?? 'An error occurred.');
      break;
  }

  element.innerHTML = `
    <div class="title-screen">
      ${content}
    </div>
  `;
}

/** Bind title screen event handlers */
export function bindTitleScreen(
  element: HTMLElement,
  callbacks: TitleScreenCallbacks,
): void {
  const update = () => {
    renderTitleScreen(element);
    bindTitleScreen(element, callbacks);
  };

  // Setup keyboard handler (only once)
  if (!keyboardCleanup) {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (uiState.view === 'saves') {
          uiState.view = 'main';
          update();
        } else if (uiState.view === 'confirm-delete') {
          uiState.view = 'saves';
          uiState.deleteSlot = null;
          update();
        } else if (uiState.view === 'error') {
          uiState.errorMessage = null;
          uiState.view = 'saves';
          update();
        }
        // 'main' view: Escape does nothing (nowhere to go back)
      }
    };

    document.addEventListener('keydown', handleKeydown);
    keyboardCleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }

  // Main menu buttons
  const newGameBtn = element.querySelector('#btn-new-game');
  newGameBtn?.addEventListener('click', () => {
    callbacks.onNewGame();
  });

  const continueBtn = element.querySelector('#btn-continue');
  continueBtn?.addEventListener('click', () => {
    uiState.view = 'saves';
    update();
  });

  const settingsBtn = element.querySelector('#btn-settings');
  settingsBtn?.addEventListener('click', () => {
    callbacks.onSettings();
  });

  // Save view buttons
  const backBtn = element.querySelector('#btn-back-to-title');
  backBtn?.addEventListener('click', () => {
    uiState.view = 'main';
    update();
  });

  // Load buttons
  element.querySelectorAll('.btn-load').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slot = parseInt((e.target as HTMLElement).dataset.slot ?? '0', 10);
      if (slot > 0) {
        const state = loadGame(slot);
        if (state) {
          uiState.view = 'main';
          callbacks.onContinue(state, slot);
        } else {
          // Show error if load failed
          uiState.errorMessage = `Failed to load save from Slot ${slot}. The save data may be corrupted.`;
          uiState.view = 'error';
          update();
        }
      }
    });
  });

  // Error OK button
  const errorOkBtn = element.querySelector('#btn-error-ok');
  errorOkBtn?.addEventListener('click', () => {
    uiState.errorMessage = null;
    uiState.view = 'saves';
    update();
  });

  // Delete buttons - show confirmation
  element.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slot = parseInt((e.target as HTMLElement).dataset.slot ?? '0', 10);
      if (slot > 0) {
        uiState.deleteSlot = slot;
        uiState.view = 'confirm-delete';
        update();
      }
    });
  });

  // Confirm cancel button
  const cancelBtn = element.querySelector('#btn-confirm-cancel');
  cancelBtn?.addEventListener('click', () => {
    uiState.view = 'saves';
    uiState.deleteSlot = null;
    update();
  });

  // Confirm delete button
  const confirmDeleteBtn = element.querySelector('#btn-confirm-delete');
  confirmDeleteBtn?.addEventListener('click', () => {
    if (uiState.deleteSlot) {
      deleteSave(uiState.deleteSlot);
      uiState.deleteSlot = null;
      uiState.view = 'saves';
      update();
    }
  });
}

/** Reset title screen state (e.g., when returning from game) */
export function resetTitleScreen(): void {
  uiState = {
    view: 'main',
    deleteSlot: null,
    errorMessage: null,
  };
}

/** Cleanup title screen (remove keyboard handler) */
export function cleanupTitleScreen(): void {
  if (keyboardCleanup) {
    keyboardCleanup();
    keyboardCleanup = null;
  }
}
