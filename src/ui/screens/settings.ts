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
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';

/** Settings screen callbacks */
export interface SettingsScreenCallbacks {
  onBack: () => void;
}

/** Settings UI state */
interface SettingsState {
  listeningAction: GameAction | null;
  showResetConfirm: boolean;
}

/** Render a single key binding row */
function renderBindingRow(
  action: GameAction,
  listeningAction: GameAction | null,
): string {
  const bindings = getKeyBindings();
  const currentKey = bindings[action];
  const displayName = ACTION_DISPLAY_NAMES[action];
  const keyLabel = getKeyDisplayName(currentKey);
  const isListening = listeningAction === action;
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
function renderCategory(
  name: string,
  actions: GameAction[],
  listeningAction: GameAction | null,
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

/** Render main settings view */
function renderMainView(listeningAction: GameAction | null): string {
  const categories = Object.entries(ACTION_CATEGORIES)
    .map(([name, actions]) => renderCategory(name, actions, listeningAction))
    .join('');

  return `
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
  `;
}

/** Active key listener cleanup (stored outside state for capture phase handling) */
let activeKeyListener: ((e: KeyboardEvent) => void) | null = null;

/** Settings screen component */
const SettingsScreenComponent: Screen<SettingsState, SettingsScreenCallbacks> =
  {
    render(state, _props) {
      let content: string;

      if (state.showResetConfirm) {
        content = renderResetConfirmView();
      } else {
        content = renderMainView(state.listeningAction);
      }

      return `
      <div class="settings-screen">
        <div class="settings-background" id="settings-battle-bg"></div>
        <div class="settings-content-wrapper">
          ${content}
        </div>
      </div>
    `;
    },

    bind(api: ScreenAPI<SettingsState>, props: SettingsScreenCallbacks) {
      const state = api.getState();

      // Back button
      api.on('#btn-settings-back', 'click', () => {
        cleanupKeyListener();
        props.onBack();
      });

      // Reset all button - show confirmation
      api.on('#btn-reset-all', 'click', () => {
        api.setState({ showResetConfirm: true });
      });

      // Reset confirmation - cancel
      api.on('#btn-reset-cancel', 'click', () => {
        api.setState({ showResetConfirm: false });
      });

      // Reset confirmation - confirm
      api.on('#btn-reset-confirm', 'click', () => {
        resetToDefaults();
        api.setState({ showResetConfirm: false });
      });

      // Key binding buttons - start listening
      api.on('.binding-key', 'click', (_e, el) => {
        const action = el.dataset.action;
        if (action && action in ACTION_DISPLAY_NAMES) {
          startListening(api, action as GameAction);
        }
      });

      // Reset individual key buttons
      api.on('.btn-reset-key', 'click', (_e, el) => {
        const action = el.dataset.action;
        if (action && action in DEFAULT_BINDINGS) {
          setKeyBinding(
            action as GameAction,
            DEFAULT_BINDINGS[action as GameAction],
          );
          saveKeyBindings();
          api.setState({}); // Re-render to show updated binding
        }
      });

      // If we're in listening mode, set up the capture-phase listener
      if (state.listeningAction) {
        setupKeyListener(api, state.listeningAction);
      }
    },
  };

/** Set up capture-phase key listener for rebinding */
function setupKeyListener(
  api: ScreenAPI<SettingsState>,
  action: GameAction,
): void {
  cleanupKeyListener();

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels rebinding
    if (e.code === 'Escape') {
      cleanupKeyListener();
      api.setState({ listeningAction: null });
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

    cleanupKeyListener();
    api.setState({ listeningAction: null });
  };

  activeKeyListener = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown, true);
}

/** Start listening for a key press to rebind an action */
function startListening(
  api: ScreenAPI<SettingsState>,
  action: GameAction,
): void {
  cleanupKeyListener();
  api.setState({ listeningAction: action });
}

/** Clean up the active key listener */
function cleanupKeyListener(): void {
  if (activeKeyListener) {
    document.removeEventListener('keydown', activeKeyListener, true);
    activeKeyListener = null;
  }
}

/** Screen handle for external control */
let screenHandle: ScreenHandle<SettingsState, SettingsScreenCallbacks> | null =
  null;

/** Render the settings screen */
export function renderSettingsScreen(element: HTMLElement): void {
  // For backwards compatibility, just set innerHTML with initial state
  const initialState: SettingsState = {
    listeningAction: null,
    showResetConfirm: false,
  };
  element.innerHTML = SettingsScreenComponent.render(initialState, {
    onBack: () => {},
  });
}

/** Bind settings screen event handlers */
export function bindSettingsScreen(
  element: HTMLElement,
  callbacks: SettingsScreenCallbacks,
): void {
  // Clean up previous handle if exists
  screenHandle?.destroy();
  cleanupKeyListener();

  const initialState: SettingsState = {
    listeningAction: null,
    showResetConfirm: false,
  };

  screenHandle = createScreen(
    SettingsScreenComponent,
    element,
    initialState,
    callbacks,
  );
}

/** Cleanup settings screen (cancel any listening and reset state) */
export function cleanupSettingsScreen(): void {
  cleanupKeyListener();
  screenHandle?.destroy();
  screenHandle = null;
}

/** Reset settings screen state (for returning to screen) */
export function resetSettingsScreen(): void {
  cleanupSettingsScreen();
}
