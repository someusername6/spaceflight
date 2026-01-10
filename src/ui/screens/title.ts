/**
 * Title Screen - Main menu with new game, continue, and settings options.
 *
 * Displays:
 * - Animated battle simulation in background
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
import { TITLE_SCREEN_BATTLE } from '../../simulation/battle-configs';
import {
  type BattleSimulation,
  createBattleSimulation,
  disposeBattleSimulation,
  startBattleSimulation,
} from '../../simulation/battle-simulation';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import { escapeHtml } from '../utils';

/** Title screen callbacks */
export interface TitleScreenProps {
  onNewGame: () => void;
  onContinue: (state: CampaignState, slot: number) => void;
  onSettings: () => void;
}

/** Current view state */
type TitleView = 'main' | 'saves' | 'confirm-delete' | 'error';

/** Title screen UI state */
interface TitleState {
  view: TitleView;
  deleteSlot: number | null;
  errorMessage: string | null;
}

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
            ${canContinue ? '' : 'disabled'}
          >
            Continue
          </button>
          <button class="btn btn-title" id="btn-settings">
            Settings
          </button>
        </div>
      </div>
      <div class="title-footer">
        <span class="title-version">v${__APP_VERSION__}</span>
      </div>
    </div>
  `;
}

/** Title screen component */
const TitleScreenComponent: Screen<TitleState, TitleScreenProps> = {
  render(state, _props) {
    let content: string;

    switch (state.view) {
      case 'main':
        content = renderMainView();
        break;
      case 'saves':
        content = renderSavesView();
        break;
      case 'confirm-delete':
        content = renderConfirmDeleteView(state.deleteSlot ?? 1);
        break;
      case 'error':
        content = renderErrorView(state.errorMessage ?? 'An error occurred.');
        break;
    }

    return `
      <div class="title-screen">
        <div class="title-background" id="title-battle-bg"></div>
        <div class="title-content">
          ${content}
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<TitleState>, props: TitleScreenProps) {
    // Main menu buttons
    api.on('#btn-new-game', 'click', () => {
      props.onNewGame();
    });

    api.on('#btn-continue', 'click', () => {
      api.setState({ view: 'saves' });
    });

    api.on('#btn-settings', 'click', () => {
      props.onSettings();
    });

    // Save view buttons
    api.on('#btn-back-to-title', 'click', () => {
      api.setState({ view: 'main' });
    });

    // Load buttons
    api.on('.btn-load', 'click', (_e, el) => {
      const slot = parseInt(el.dataset.slot ?? '0', 10);
      if (slot > 0) {
        const loadedState = loadGame(slot);
        if (loadedState) {
          api.setState({ view: 'main' });
          props.onContinue(loadedState, slot);
        } else {
          api.setState({
            errorMessage: `Failed to load save from Slot ${slot}. The save data may be corrupted.`,
            view: 'error',
          });
        }
      }
    });

    // Error OK button
    api.on('#btn-error-ok', 'click', () => {
      api.setState({ errorMessage: null, view: 'saves' });
    });

    // Delete buttons - show confirmation
    api.on('.btn-delete', 'click', (_e, el) => {
      const slot = parseInt(el.dataset.slot ?? '0', 10);
      if (slot > 0) {
        api.setState({ deleteSlot: slot, view: 'confirm-delete' });
      }
    });

    // Confirm cancel button
    api.on('#btn-confirm-cancel', 'click', () => {
      api.setState({ view: 'saves', deleteSlot: null });
    });

    // Confirm delete button
    api.on('#btn-confirm-delete', 'click', () => {
      const currentState = api.getState();
      if (currentState.deleteSlot) {
        deleteSave(currentState.deleteSlot);
        api.setState({ deleteSlot: null, view: 'saves' });
      }
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        const currentState = api.getState();
        if (currentState.view === 'saves') {
          api.setState({ view: 'main' });
        } else if (currentState.view === 'confirm-delete') {
          api.setState({ view: 'saves', deleteSlot: null });
        } else if (currentState.view === 'error') {
          api.setState({ errorMessage: null, view: 'saves' });
        }
      }
    });

    // Re-attach battle simulation canvas after re-render
    if (battleSimulation) {
      const bgContainer = document.getElementById('title-battle-bg');
      if (bgContainer) {
        const canvas = battleSimulation.renderer.webglRenderer.domElement;
        if (canvas.parentElement !== bgContainer) {
          bgContainer.appendChild(canvas);
        }
      }
    }
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<TitleState, TitleScreenProps> | null = null;

/** Battle simulation for title background */
let battleSimulation: BattleSimulation | null = null;

/** Render and bind the title screen */
export function renderTitleScreen(element: HTMLElement): void {
  // This is called for initial render - actual binding happens in bindTitleScreen
  // For backwards compatibility, we just set innerHTML here
  const initialState: TitleState = {
    view: 'main',
    deleteSlot: null,
    errorMessage: null,
  };
  element.innerHTML = TitleScreenComponent.render(initialState, {
    onNewGame: () => {},
    onContinue: () => {},
    onSettings: () => {},
  });
}

/** Bind title screen event handlers */
export function bindTitleScreen(
  element: HTMLElement,
  callbacks: TitleScreenProps,
): void {
  // Clean up previous handle if exists
  screenHandle?.destroy();

  // Clean up previous simulation if exists
  if (battleSimulation) {
    disposeBattleSimulation(battleSimulation);
    battleSimulation = null;
  }

  const initialState: TitleState = {
    view: 'main',
    deleteSlot: null,
    errorMessage: null,
  };

  screenHandle = createScreen(
    TitleScreenComponent,
    element,
    initialState,
    callbacks,
  );

  // Start battle simulation in background (deferred to next frame for layout)
  requestAnimationFrame(() => {
    const bgContainer = document.getElementById('title-battle-bg');
    if (bgContainer && bgContainer.clientWidth > 0) {
      battleSimulation = createBattleSimulation(
        bgContainer,
        TITLE_SCREEN_BATTLE,
      );
      startBattleSimulation(battleSimulation);
    }
  });
}

/** Reset title screen state (e.g., when returning from game) */
export function resetTitleScreen(): void {
  screenHandle?.replaceState({
    view: 'main',
    deleteSlot: null,
    errorMessage: null,
  });
}

/** Cleanup title screen (remove keyboard handler and simulation) */
export function cleanupTitleScreen(): void {
  screenHandle?.destroy();
  screenHandle = null;

  // Dispose battle simulation
  if (battleSimulation) {
    disposeBattleSimulation(battleSimulation);
    battleSimulation = null;
  }
}

/** Get the battle simulation canvas element (for transferring to other screens) */
export function getBattleSimulationCanvas(): HTMLCanvasElement | null {
  if (!battleSimulation) return null;
  return battleSimulation.renderer.webglRenderer.domElement;
}

/** Check if battle simulation is currently active */
export function hasBattleSimulation(): boolean {
  return battleSimulation !== null;
}
