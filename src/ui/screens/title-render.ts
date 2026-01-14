/**
 * Title Screen Render Functions
 *
 * View rendering for the title screen.
 */

import { isStorageAvailable as isReplayStorageAvailable } from '../../replay/storage';
import { escapeHtml } from '../utils';

/** Current view state */
export type TitleView = 'main' | 'loading' | 'confirm-overwrite' | 'error';

/** Title screen UI state */
export interface TitleState {
  view: TitleView;
  hasCampaign: boolean;
  campaignSector: number;
  campaignCredits: number;
  errorMessage: string | null;
}

/** Render main menu view */
export function renderMainView(state: TitleState): string {
  const hasReplayStorage = isReplayStorageAvailable();

  return `
    <div class="title-main-view">
      <div class="title-left-column">
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
            ${state.hasCampaign ? '' : 'disabled'}
          >
            Continue${state.hasCampaign ? ` (Sector ${state.campaignSector})` : ''}
          </button>
          <button class="btn btn-title" id="btn-settings">
            Settings
          </button>
          <button
            class="btn btn-title"
            id="btn-replays"
            ${hasReplayStorage ? '' : 'disabled'}
          >
            Replays
          </button>
        </div>
      </div>
      <div class="title-footer">
        <span class="title-version">v${__APP_VERSION__}</span>
      </div>
    </div>
  `;
}

/** Render loading view */
export function renderLoadingView(): string {
  return `
    <div class="title-confirm-view">
      <div class="title-confirm-content">
        <div class="title-confirm-title">Loading...</div>
        <div class="title-confirm-message">Loading campaign data...</div>
      </div>
    </div>
  `;
}

/** Render new game confirmation view */
export function renderConfirmOverwriteView(state: TitleState): string {
  return `
    <div class="title-confirm-view">
      <div class="title-confirm-content">
        <div class="title-confirm-title">Start New Campaign?</div>
        <div class="title-confirm-message">
          You have an existing campaign in Sector ${state.campaignSector} with ${state.campaignCredits.toLocaleString()} credits.
          <br><br>
          Starting a new campaign will <strong>permanently delete</strong> your current progress.
        </div>
        <div class="title-confirm-buttons">
          <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
          <button class="btn btn-large btn-danger" id="btn-confirm-new">Start New Campaign</button>
        </div>
      </div>
    </div>
  `;
}

/** Render error view */
export function renderErrorView(message: string): string {
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
