/**
 * Settings Screen - Graphics and Controls configuration with tabbed interface.
 */

import {
  downloadCampaign,
  getActiveSlotId,
  getSlotMetadata,
  openCampaignFile,
} from '../../../campaign/storage';
import type { CampaignState } from '../../../campaign/types';
import {
  ACTION_DISPLAY_NAMES,
  DEFAULT_BINDINGS,
  type GameAction,
  resetToDefaults,
  saveKeyBindings,
  setKeyBinding,
} from '../../../input/key-bindings';
import {
  type FrameRateCap,
  type PlayerAutoaim,
  setFrameRateCap,
  setPlayerAutoaim,
} from '../../../settings/game-settings';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import { showError, showSuccess } from '../alert-modal';
import { positionAutoaimPopover } from './gameplay';
import { positionFpsPopover } from './graphics';
import {
  cleanupKeyListener,
  cleanupSettingsEscapeHandler,
  setupKeyListener,
  setupSettingsEscapeHandler,
  startListening,
} from './key-listener';
import {
  renderMainView,
  renderResetConfirmView,
  type SettingsState,
  type SettingsTab,
} from './settings-render';

/** Settings screen callbacks */
export interface SettingsScreenCallbacks {
  onBack: () => void;
  /** Called when a campaign is imported, with the new state */
  onCampaignImported?: (state: CampaignState) => void;
  /** Called when autoaim is changed (for syncing to campaign state) */
  onAutoaimChanged?: (degrees: PlayerAutoaim) => void;
}

/** Register an outside-click handler that closes a popover when clicking outside */
function registerOutsideClickHandler(
  api: ScreenAPI<SettingsState>,
  popoverId: string,
  triggerId: string,
  stateKey: 'showFpsPopover' | 'showAutoaimPopover',
): void {
  api.onGlobal('click', (e) => {
    const popover = document.getElementById(popoverId);
    const trigger = document.getElementById(triggerId);
    if (
      popover &&
      trigger &&
      !popover.contains(e.target as Node) &&
      !trigger.contains(e.target as Node)
    ) {
      api.setState({ [stateKey]: false });
    }
  });
}

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
        cleanupSettingsEscapeHandler();
        props.onBack();
      });

      // Frame rate cap popover trigger (graphics tab)
      api.on('#fps-cap-trigger', 'click', (e) => {
        e.stopPropagation();
        api.setState({ showFpsPopover: !state.showFpsPopover });
      });

      // Frame rate cap popover item selection
      api.on('.settings-picker-item', 'click', (e, el) => {
        e.stopPropagation();
        const fps = el.dataset.fps;
        const autoaim = el.dataset.autoaim;
        if (fps !== undefined) {
          const value = Number.parseInt(fps, 10) as FrameRateCap;
          setFrameRateCap(value);
          api.setState({ showFpsPopover: false });
        } else if (autoaim !== undefined && !state.ironmanCampaign) {
          // Only allow autoaim changes for non-ironman campaigns
          // (UI should be locked, but this is belt-and-suspenders protection)
          const value = Number.parseFloat(autoaim) as PlayerAutoaim;
          setPlayerAutoaim(value);
          props.onAutoaimChanged?.(value);
          api.setState({ showAutoaimPopover: false });
        }
      });

      // Close FPS popover on outside click and position it
      if (state.showFpsPopover) {
        registerOutsideClickHandler(
          api,
          'fps-popover',
          'fps-cap-trigger',
          'showFpsPopover',
        );
        positionFpsPopover();
      }

      // Autoaim popover trigger (gameplay tab)
      api.on('#autoaim-trigger', 'click', (e) => {
        e.stopPropagation();
        api.setState({ showAutoaimPopover: !state.showAutoaimPopover });
      });

      // Close autoaim popover on outside click and position it
      if (state.showAutoaimPopover) {
        registerOutsideClickHandler(
          api,
          'autoaim-popover',
          'autoaim-trigger',
          'showAutoaimPopover',
        );
        positionAutoaimPopover();
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

      // Export campaign button (data tab)
      api.on('#btn-export-campaign', 'click', async () => {
        const result = await downloadCampaign();
        if (result.cancelled) {
          // User cancelled save dialog, do nothing
          return;
        }
        if (result.success) {
          await showSuccess('Campaign exported successfully');
        } else {
          await showError(result.error ?? 'Failed to export campaign');
        }
      });

      // Import campaign button (data tab)
      api.on('#btn-import-campaign', 'click', async () => {
        const result = await openCampaignFile();
        if (result === null) {
          // User cancelled, do nothing
          return;
        }
        if (result.success && result.state) {
          // Update state and notify caller
          api.setState({ hasCampaign: true });
          props.onCampaignImported?.(result.state);
          await showSuccess('Campaign imported successfully');
        } else {
          await showError(result.error ?? 'Failed to import campaign');
        }
      });

      // If we're in listening mode, set up the capture-phase listener
      if (state.listeningAction) {
        setupKeyListener(api, state.listeningAction);
      }

      // ESC closes settings - handled via capture phase listener
      setupSettingsEscapeHandler(state.listeningAction, props.onBack);

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

/** Screen handle for external control */
let screenHandle: ScreenHandle<SettingsState, SettingsScreenCallbacks> | null =
  null;

/** Render the settings screen */
export function renderSettingsScreen(element: HTMLElement): void {
  // For backwards compatibility, just set innerHTML with initial state
  const initialState: SettingsState = {
    selectedTab: 'gameplay',
    listeningAction: null,
    showResetConfirm: false,
    showFpsPopover: false,
    showAutoaimPopover: false,
    hasCampaign: false,
    ironmanCampaign: false,
  };
  element.innerHTML = SettingsScreenComponent.render(initialState, {
    onBack: () => {},
  });
}

/** Bind settings screen event handlers */
export async function bindSettingsScreen(
  element: HTMLElement,
  callbacks: SettingsScreenCallbacks,
): Promise<void> {
  // Clean up previous handle if exists
  screenHandle?.destroy();
  cleanupKeyListener();

  // Check if there's an active campaign and if it's ironman
  // Must use getActiveSlotId() to get the CURRENTLY LOADED campaign,
  // not just any existing campaign (which getCampaignMetadata would return)
  let campaignExists = false;
  let isIronman = false;
  try {
    const activeSlotId = getActiveSlotId();
    if (activeSlotId) {
      const metadata = await getSlotMetadata(activeSlotId);
      campaignExists = metadata.exists;
      isIronman = metadata.ironmanMode ?? false;
    }
  } catch {
    // Ignore errors, assume no campaign
  }

  const initialState: SettingsState = {
    selectedTab: 'gameplay',
    listeningAction: null,
    showResetConfirm: false,
    showFpsPopover: false,
    showAutoaimPopover: false,
    hasCampaign: campaignExists,
    ironmanCampaign: isIronman,
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
  cleanupSettingsEscapeHandler();
  screenHandle?.destroy();
  screenHandle = null;
  // Clear stored canvas reference (canvas ownership returns to title screen)
  battleCanvas = null;
}

/** Reset settings screen state (for returning to screen) */
export function resetSettingsScreen(): void {
  cleanupSettingsScreen();
}
