/**
 * Settings Screen - Key binding configuration.
 *
 * Displays:
 * - Categorized list of key bindings
 * - Click-to-rebind interface
 * - Reset to defaults option
 */

import {
  ACTION_CATEGORIES,
  ACTION_DISPLAY_NAMES,
  DEFAULT_BINDINGS,
  findKeyConflict,
  type GameAction,
  getKeyBindings,
  getKeyDisplayName,
  resetToDefaults,
  saveKeyBindings,
  setKeyBinding,
} from '../../input/key-bindings';

/** Settings screen callbacks */
export interface SettingsScreenCallbacks {
  onBack: () => void;
}

/** Settings UI state */
interface SettingsUIState {
  listeningAction: GameAction | null;
  listeningCleanup: (() => void) | null;
  showResetConfirm: boolean;
}

const uiState: SettingsUIState = {
  listeningAction: null,
  listeningCleanup: null,
  showResetConfirm: false,
};

/** Render a single key binding row */
function renderBindingRow(action: GameAction): string {
  const bindings = getKeyBindings();
  const currentKey = bindings[action];
  const displayName = ACTION_DISPLAY_NAMES[action];
  const keyLabel = getKeyDisplayName(currentKey);
  const isListening = uiState.listeningAction === action;
  const isDefault = currentKey === DEFAULT_BINDINGS[action];

  return `
    <div class="binding-row" data-action="${action}">
      <span class="binding-label">${displayName}</span>
      <div class="binding-controls">
        <button
          class="btn btn-small binding-key ${isListening ? 'listening' : ''}"
          data-action="${action}"
          aria-label="Rebind ${displayName}"
        >
          ${isListening ? 'Press a key...' : keyLabel}
        </button>
        ${
          !isDefault
            ? `<button class="btn btn-small btn-reset-key" data-action="${action}" title="Reset to default">
                 <span class="reset-icon">&#8634;</span>
               </button>`
            : ''
        }
      </div>
    </div>
  `;
}

/** Render a category section */
function renderCategory(name: string, actions: GameAction[]): string {
  return `
    <div class="settings-category">
      <h3 class="category-header">${name}</h3>
      <div class="category-bindings">
        ${actions.map((action) => renderBindingRow(action)).join('')}
      </div>
    </div>
  `;
}

/** Render the reset confirmation view */
function renderResetConfirmView(): string {
  return `
    <div class="settings-confirm-view">
      <div class="settings-confirm-content">
        <div class="settings-confirm-title">Reset All Bindings?</div>
        <div class="settings-confirm-message">
          This will restore all key bindings to their default values.
        </div>
        <div class="settings-confirm-buttons">
          <button class="btn btn-large" id="btn-reset-cancel">Cancel</button>
          <button class="btn btn-large btn-warning" id="btn-reset-confirm">Reset All</button>
        </div>
      </div>
    </div>
  `;
}

/** Render the settings screen */
export function renderSettingsScreen(element: HTMLElement): void {
  // Show confirmation view if active
  if (uiState.showResetConfirm) {
    element.innerHTML = `
      <div class="settings-screen">
        ${renderResetConfirmView()}
      </div>
    `;
    return;
  }

  const categories = Object.entries(ACTION_CATEGORIES)
    .map(([name, actions]) => renderCategory(name, actions))
    .join('');

  element.innerHTML = `
    <div class="settings-screen">
      <div class="settings-container">
        <header class="panel-header">
          <h2>Settings</h2>
        </header>

        <div class="settings-content">
          <div class="settings-section">
            <div class="section-header">
              <h3>Key Bindings</h3>
              <button class="btn btn-small" id="btn-reset-all">
                Reset All to Defaults
              </button>
            </div>
            <div class="bindings-list">
              ${categories}
            </div>
          </div>
        </div>

        <footer class="settings-footer">
          <button class="btn btn-large" id="btn-settings-back">
            Back
          </button>
        </footer>
      </div>
    </div>
  `;
}

/** Start listening for a key press to rebind an action */
function startListening(
  action: GameAction,
  element: HTMLElement,
  callbacks: SettingsScreenCallbacks,
): void {
  // Cancel any existing listener
  cancelListening();

  uiState.listeningAction = action;

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels rebinding
    if (e.code === 'Escape') {
      cancelListening();
      renderSettingsScreen(element);
      bindSettingsScreen(element, callbacks);
      return;
    }

    // Check for conflicts
    const conflict = findKeyConflict(e.code, action);
    if (conflict) {
      // Swap the keys
      const currentKey = getKeyBindings()[action];
      setKeyBinding(conflict, currentKey);
    }

    // Set the new binding
    setKeyBinding(action, e.code);
    saveKeyBindings();

    cancelListening();
    renderSettingsScreen(element);
    bindSettingsScreen(element, callbacks);
  };

  uiState.listeningCleanup = () => {
    document.removeEventListener('keydown', handleKeyDown, true);
  };

  document.addEventListener('keydown', handleKeyDown, true);

  // Update UI to show listening state
  renderSettingsScreen(element);
  bindSettingsScreen(element, callbacks);
}

/** Cancel key listening */
function cancelListening(): void {
  if (uiState.listeningCleanup) {
    uiState.listeningCleanup();
    uiState.listeningCleanup = null;
  }
  uiState.listeningAction = null;
}

/** Bind settings screen event handlers */
export function bindSettingsScreen(
  element: HTMLElement,
  callbacks: SettingsScreenCallbacks,
): void {
  const update = () => {
    renderSettingsScreen(element);
    bindSettingsScreen(element, callbacks);
  };

  // Back button
  const backBtn = element.querySelector('#btn-settings-back');
  backBtn?.addEventListener('click', () => {
    cancelListening();
    callbacks.onBack();
  });

  // Reset all button - show confirmation
  const resetAllBtn = element.querySelector('#btn-reset-all');
  resetAllBtn?.addEventListener('click', () => {
    uiState.showResetConfirm = true;
    update();
  });

  // Reset confirmation - cancel
  const resetCancelBtn = element.querySelector('#btn-reset-cancel');
  resetCancelBtn?.addEventListener('click', () => {
    uiState.showResetConfirm = false;
    update();
  });

  // Reset confirmation - confirm
  const resetConfirmBtn = element.querySelector('#btn-reset-confirm');
  resetConfirmBtn?.addEventListener('click', () => {
    resetToDefaults();
    uiState.showResetConfirm = false;
    update();
  });

  // Key binding buttons
  element.querySelectorAll('.binding-key').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = (e.currentTarget as HTMLElement).dataset.action;
      if (action && action in ACTION_DISPLAY_NAMES) {
        startListening(action as GameAction, element, callbacks);
      }
    });
  });

  // Reset individual key buttons
  element.querySelectorAll('.btn-reset-key').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = (e.currentTarget as HTMLElement).dataset.action;
      if (action && action in DEFAULT_BINDINGS) {
        setKeyBinding(
          action as GameAction,
          DEFAULT_BINDINGS[action as GameAction],
        );
        saveKeyBindings();
        update();
      }
    });
  });
}

/** Cleanup settings screen (cancel any listening and reset state) */
export function cleanupSettingsScreen(): void {
  cancelListening();
  uiState.showResetConfirm = false;
}

/** Reset settings screen state (for returning to screen) */
export function resetSettingsScreen(): void {
  cleanupSettingsScreen();
}
