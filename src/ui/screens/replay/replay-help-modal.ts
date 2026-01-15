/**
 * Replay Help Modal - Shows and allows rebinding of replay controls.
 *
 * Styled to match the settings controls tab but in a modal overlay.
 */

import { getKeyDisplayName } from '../../../input/key-bindings';
import {
  DEFAULT_REPLAY_BINDINGS,
  findReplayKeyConflict,
  getReplayBindings,
  REPLAY_ACTION_CATEGORIES,
  REPLAY_ACTION_DISPLAY_NAMES,
  type ReplayAction,
  resetReplayActionToDefault,
  resetReplayToDefaults,
  saveReplayBindings,
  setReplayBinding,
} from '../../../input/replay-bindings';

/** Modal state */
export interface ReplayHelpModalState {
  visible: boolean;
  listeningAction: ReplayAction | null;
}

/** Active key listener for rebinding */
let activeKeyListener: ((e: KeyboardEvent) => void) | null = null;

/** Escape key listener for closing modal */
let escapeKeyListener: ((e: KeyboardEvent) => void) | null = null;

/** Callbacks for state updates */
let stateUpdateCallback:
  | ((state: Partial<ReplayHelpModalState>) => void)
  | null = null;

/** Render a single binding row */
function renderBindingRow(
  action: ReplayAction,
  listeningAction: ReplayAction | null,
): string {
  const bindings = getReplayBindings();
  const currentKey = bindings[action];
  const displayName = REPLAY_ACTION_DISPLAY_NAMES[action];
  const keyLabel = getKeyDisplayName(currentKey);
  const isListening = listeningAction === action;
  const isDefault = currentKey === DEFAULT_REPLAY_BINDINGS[action];

  return `
    <div class="binding-row" data-action="${action}">
      <span class="binding-label">${displayName}</span>
      <div class="binding-controls">
        <button
          class="btn btn-small binding-key ${isListening ? 'listening' : ''}"
          data-rebind-action="${action}"
          aria-label="Rebind ${displayName}"
        >
          ${isListening ? 'Press a key...' : keyLabel}
        </button>
        ${
          !isDefault
            ? `<button class="btn btn-small btn-reset-key" data-reset-action="${action}" title="Reset to default">
                 <span class="reset-icon">&#8634;</span>
               </button>`
            : ''
        }
      </div>
    </div>
  `;
}

/** Render a category section */
function renderCategory(
  name: string,
  actions: readonly ReplayAction[],
  listeningAction: ReplayAction | null,
): string {
  return `
    <div class="settings-category">
      <h3 class="category-header">${name}</h3>
      <div class="category-bindings">
        ${actions.map((action) => renderBindingRow(action, listeningAction)).join('')}
      </div>
    </div>
  `;
}

/** Render the modal content */
export function renderReplayHelpModal(state: ReplayHelpModalState): string {
  if (!state.visible) return '';

  const categories = Object.entries(REPLAY_ACTION_CATEGORIES)
    .map(([name, actions]) =>
      renderCategory(name, actions, state.listeningAction),
    )
    .join('');

  return `
    <div class="modal-overlay replay-help-modal" id="replay-help-modal">
      <div class="modal-dialog replay-help-dialog">
        <div class="modal-header">
          <h2 class="modal-title">Replay Controls</h2>
        </div>
        <div class="replay-help-content">
          <div class="settings-tab-header">
            <button class="btn btn-small" id="btn-reset-replay-bindings">
              Reset All to Defaults
            </button>
          </div>
          <div class="bindings-list">
            ${categories}
          </div>
        </div>
        <div class="modal-footer">
          <div class="modal-buttons">
            <button class="btn btn-primary" id="btn-close-replay-help">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Set up key listener for rebinding */
function setupKeyListener(action: ReplayAction): void {
  cleanupKeyListener();

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels rebinding
    if (e.code === 'Escape') {
      cleanupKeyListener();
      stateUpdateCallback?.({ listeningAction: null });
      return;
    }

    // Check for conflicts and swap if needed
    const conflict = findReplayKeyConflict(e.code, action);
    if (conflict) {
      const currentKey = getReplayBindings()[action];
      setReplayBinding(conflict, currentKey);
    }

    // Set the new binding
    setReplayBinding(action, e.code);
    saveReplayBindings();

    cleanupKeyListener();
    stateUpdateCallback?.({ listeningAction: null });
  };

  activeKeyListener = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown, true);
}

/** Clean up key listener */
function cleanupKeyListener(): void {
  if (activeKeyListener) {
    document.removeEventListener('keydown', activeKeyListener, true);
    activeKeyListener = null;
  }
}

/** Bind modal event handlers */
export function bindReplayHelpModal(
  onClose: () => void,
  updateState: (state: Partial<ReplayHelpModalState>) => void,
): void {
  stateUpdateCallback = updateState;

  // Close button
  const closeBtn = document.getElementById('btn-close-replay-help');
  closeBtn?.addEventListener('click', () => {
    cleanupKeyListener();
    onClose();
  });

  // Reset all button
  const resetBtn = document.getElementById('btn-reset-replay-bindings');
  resetBtn?.addEventListener('click', () => {
    resetReplayToDefaults();
    updateState({ listeningAction: null });
  });

  // Click on overlay background to close
  const modal = document.getElementById('replay-help-modal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      cleanupKeyListener();
      onClose();
    }
  });

  // Rebind buttons
  const rebindButtons = document.querySelectorAll('[data-rebind-action]');
  rebindButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-rebind-action') as ReplayAction;
      updateState({ listeningAction: action });
      setupKeyListener(action);
    });
  });

  // Reset individual key buttons
  const resetKeyButtons = document.querySelectorAll('[data-reset-action]');
  resetKeyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-reset-action') as ReplayAction;
      resetReplayActionToDefault(action);
      updateState({ listeningAction: null });
    });
  });

  // Escape to close (when not rebinding)
  // Clean up previous escape listener if any
  cleanupEscapeListener();

  escapeKeyListener = (e: KeyboardEvent) => {
    if (e.code === 'Escape' && !activeKeyListener) {
      e.preventDefault();
      e.stopPropagation();
      cleanupKeyListener();
      cleanupEscapeListener();
      onClose();
    }
  };
  document.addEventListener('keydown', escapeKeyListener, true);
}

/** Clean up escape key listener */
function cleanupEscapeListener(): void {
  if (escapeKeyListener) {
    document.removeEventListener('keydown', escapeKeyListener, true);
    escapeKeyListener = null;
  }
}

/** Clean up modal resources */
export function cleanupReplayHelpModal(): void {
  cleanupKeyListener();
  cleanupEscapeListener();
  stateUpdateCallback = null;
}
