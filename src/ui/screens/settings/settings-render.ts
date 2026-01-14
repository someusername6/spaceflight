/**
 * Settings Screen Render Helpers - Pure render functions for settings UI.
 */

import type { GameAction } from '../../../input/key-bindings';
import { renderControlsTab } from './controls';
import { renderDataTab } from './data';
import { renderGameplayTab } from './gameplay';
import { renderGraphicsTab } from './graphics';

/** Settings tab types */
export type SettingsTab = 'graphics' | 'controls' | 'gameplay' | 'data';

/** Settings UI state */
export interface SettingsState {
  selectedTab: SettingsTab;
  listeningAction: GameAction | null;
  showResetConfirm: boolean;
  showFpsPopover: boolean;
  showAutoaimPopover: boolean;
  hasCampaign: boolean;
  /** True if active campaign is ironman (autoaim locked) */
  ironmanCampaign: boolean;
}

/** Render the reset confirmation view */
export function renderResetConfirmView(): string {
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
      <button class="btn ${selectedTab === 'gameplay' ? 'btn-primary' : ''}"
              data-tab="gameplay" role="tab" aria-selected="${selectedTab === 'gameplay'}">
        Gameplay
      </button>
      <button class="btn ${selectedTab === 'controls' ? 'btn-primary' : ''}"
              data-tab="controls" role="tab" aria-selected="${selectedTab === 'controls'}">
        Controls
      </button>
      <button class="btn ${selectedTab === 'graphics' ? 'btn-primary' : ''}"
              data-tab="graphics" role="tab" aria-selected="${selectedTab === 'graphics'}">
        Graphics
      </button>
      <button class="btn ${selectedTab === 'data' ? 'btn-primary' : ''}"
              data-tab="data" role="tab" aria-selected="${selectedTab === 'data'}">
        Data
      </button>
    </nav>
  `;
}

/** Render main settings view */
export function renderMainView(state: SettingsState): string {
  let tabContent: string;
  if (state.selectedTab === 'graphics') {
    tabContent = renderGraphicsTab(state.showFpsPopover);
  } else if (state.selectedTab === 'gameplay') {
    tabContent = renderGameplayTab(
      state.showAutoaimPopover,
      state.ironmanCampaign,
    );
  } else if (state.selectedTab === 'data') {
    tabContent = renderDataTab(state.hasCampaign);
  } else {
    tabContent = renderControlsTab(state.listeningAction);
  }

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
