/**
 * Settings Screen - Graphics and Controls configuration with tabbed interface.
 */

import {
  ACTION_DISPLAY_NAMES,
  DEFAULT_BINDINGS,
  findKeyConflict,
  type GameAction,
  getKeyBindings,
  resetToDefaults,
  saveKeyBindings,
  setKeyBinding,
} from '../../input/key-bindings';
import {
  type FrameRateCap,
  setFrameRateCap,
} from '../../settings/game-settings';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import { renderControlsTab } from './settings-controls';
import {
  cleanupPopoverListener,
  positionFpsPopover,
  renderGraphicsTab,
  setupPopoverListener,
} from './settings-graphics';

/** Settings screen callbacks */
export interface SettingsScreenCallbacks {
  onBack: () => void;
}

/** Settings tab types */
type SettingsTab = 'graphics' | 'controls';

/** Settings UI state */
interface SettingsState {
  selectedTab: SettingsTab;
  listeningAction: GameAction | null;
  showResetConfirm: boolean;
  showFpsPopover: boolean;
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

/** Render the tab bar */
function renderTabBar(selectedTab: SettingsTab): string {
  return `
    <nav class="settings-tabs" role="tablist" aria-label="Settings categories">
      <button class="btn ${selectedTab === 'graphics' ? 'btn-primary' : ''}"
              data-tab="graphics" role="tab" aria-selected="${selectedTab === 'graphics'}">
        Graphics
      </button>
      <button class="btn ${selectedTab === 'controls' ? 'btn-primary' : ''}"
              data-tab="controls" role="tab" aria-selected="${selectedTab === 'controls'}">
        Controls
      </button>
    </nav>
  `;
}

/** Render main settings view */
function renderMainView(state: SettingsState): string {
  const tabContent =
    state.selectedTab === 'graphics'
      ? renderGraphicsTab(state.showFpsPopover)
      : renderControlsTab(state.listeningAction);

  return `
    <div class="settings-container">
      <header class="panel-header">
        <h2>Settings</h2>
      </header>

      ${renderTabBar(state.selectedTab)}

      <div class="settings-content">
        ${tabContent}
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
        content = renderMainView(state);
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

      // Tab switching
      api.on('.settings-tabs .btn', 'click', (_e, el) => {
        const tab = el.dataset.tab as SettingsTab;
        if (tab && tab !== state.selectedTab) {
          cleanupKeyListener();
          api.setState({ selectedTab: tab, listeningAction: null });
        }
      });

      // Back button
      api.on('#btn-settings-back', 'click', () => {
        cleanupKeyListener();
        props.onBack();
      });

      // Frame rate cap popover trigger (graphics tab)
      api.on('#fps-cap-trigger', 'click', (e) => {
        e.stopPropagation();
        cleanupPopoverListener();
        api.setState({ showFpsPopover: !state.showFpsPopover });
      });

      // Frame rate cap popover item selection
      api.on('.settings-picker-item', 'click', (e, el) => {
        e.stopPropagation();
        const fps = el.dataset.fps;
        if (fps !== undefined) {
          const value = Number.parseInt(fps, 10) as FrameRateCap;
          setFrameRateCap(value);
          cleanupPopoverListener();
          api.setState({ showFpsPopover: false });
        }
      });

      // Close popover on outside click and position it
      if (state.showFpsPopover) {
        setupPopoverListener(() => api.setState({ showFpsPopover: false }));
        positionFpsPopover();
      }

      // Reset all button - show confirmation (controls tab)
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

      // Key binding buttons - start listening (controls tab)
      api.on('.binding-key', 'click', (_e, el) => {
        const action = el.dataset.action;
        if (action && action in ACTION_DISPLAY_NAMES) {
          startListening(api, action as GameAction);
        }
      });

      // Reset individual key buttons (controls tab)
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

      // Re-attach battle simulation canvas after re-render (if present)
      reattachBattleCanvas();
    },
  };

/** Store canvas reference for re-attachment across re-renders */
let battleCanvas: HTMLCanvasElement | null = null;

/** Store the canvas when it's first attached */
export function storeBattleCanvas(canvas: HTMLCanvasElement): void {
  battleCanvas = canvas;
}

/** Re-attach battle canvas after re-render */
function reattachBattleCanvas(): void {
  if (battleCanvas) {
    const bgContainer = document.getElementById('settings-battle-bg');
    const settingsScreen = document.querySelector('.settings-screen');
    if (bgContainer) {
      // Re-attach canvas if needed
      if (battleCanvas.parentElement !== bgContainer) {
        bgContainer.appendChild(battleCanvas);
      }
      // Restore the with-battle-bg class (lost during re-render)
      settingsScreen?.classList.add('with-battle-bg');
    }
  }
}

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
    selectedTab: 'graphics',
    listeningAction: null,
    showResetConfirm: false,
    showFpsPopover: false,
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
    selectedTab: 'graphics',
    listeningAction: null,
    showResetConfirm: false,
    showFpsPopover: false,
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
  cleanupPopoverListener();
  screenHandle?.destroy();
  screenHandle = null;
}

/** Reset settings screen state (for returning to screen) */
export function resetSettingsScreen(): void {
  cleanupSettingsScreen();
}
