/**
 * Title Screen - Main menu with new game, continue, and settings options.
 *
 * Displays:
 * - Animated battle simulation in background
 * - Game logo/title
 * - New Game button
 * - Continue button (loads active campaign directly)
 * - Settings button
 */

import {
  clearEmergencySave,
  deleteCampaign,
  getCampaignMetadata,
  hasCampaign,
  isStorageAvailable,
  loadCampaign,
  recoverEmergencySave,
  saveCampaign,
} from '../../campaign/storage';
import type { CampaignState } from '../../campaign/types';
import { logWarn } from '../../core/logger';
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
import {
  renderConfirmOverwriteView,
  renderErrorView,
  renderLoadingView,
  renderMainView,
  type TitleState,
} from './title-render';

/** Title screen callbacks */
export interface TitleScreenProps {
  onNewGame: () => void;
  onContinue: (state: CampaignState) => void;
  onSettings: () => void;
  onReplays: () => void;
}

/** Title screen component */
const TitleScreenComponent: Screen<TitleState, TitleScreenProps> = {
  render(state, _props) {
    let content: string;

    switch (state.view) {
      case 'main':
        content = renderMainView(state);
        break;
      case 'loading':
        content = renderLoadingView();
        break;
      case 'confirm-overwrite':
        content = renderConfirmOverwriteView(state);
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
    api.on('#btn-new-game', 'click', async () => {
      const state = api.getState();
      if (state.hasCampaign) {
        // Show confirmation before overwriting
        api.setState({ view: 'confirm-overwrite' });
      } else {
        // No existing campaign, start directly
        props.onNewGame();
      }
    });

    api.on('#btn-continue', 'click', async () => {
      api.setState({ view: 'loading' });

      try {
        const campaignState = await loadCampaign();
        if (campaignState) {
          api.setState({ view: 'main' });
          props.onContinue(campaignState);
        } else {
          api.setState({
            errorMessage:
              'Failed to load campaign. The save data may be corrupted.',
            view: 'error',
          });
        }
      } catch (error) {
        api.setState({
          errorMessage: `Failed to load campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
          view: 'error',
        });
      }
    });

    api.on('#btn-settings', 'click', () => {
      props.onSettings();
    });

    api.on('#btn-replays', 'click', () => {
      props.onReplays();
    });

    // Confirm overwrite buttons
    api.on('#btn-confirm-cancel', 'click', () => {
      api.setState({ view: 'main' });
    });

    api.on('#btn-confirm-new', 'click', async () => {
      // Delete existing campaign and start new
      await deleteCampaign();
      api.setState({ hasCampaign: false, view: 'main' });
      props.onNewGame();
    });

    // Error OK button
    api.on('#btn-error-ok', 'click', () => {
      api.setState({ errorMessage: null, view: 'main' });
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        const currentState = api.getState();
        if (currentState.view === 'confirm-overwrite') {
          api.setState({ view: 'main' });
        } else if (currentState.view === 'error') {
          api.setState({ errorMessage: null, view: 'main' });
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

/** Create initial state by checking for existing campaign */
async function createInitialState(): Promise<TitleState> {
  const baseState: TitleState = {
    view: 'main',
    hasCampaign: false,
    campaignSector: 1,
    campaignCredits: 0,
    errorMessage: null,
  };

  if (!isStorageAvailable()) {
    return baseState;
  }

  try {
    // Check for emergency save from browser crash
    const emergencySave = recoverEmergencySave();
    if (emergencySave) {
      try {
        // Save the recovered state to IndexedDB
        await saveCampaign(emergencySave);
        // Only clear emergency save after successful IndexedDB save
        clearEmergencySave();
      } catch (error) {
        // IndexedDB save failed - emergency save remains in localStorage
        // for next recovery attempt. Log but continue with the recovered state.
        logWarn('Failed to save recovered campaign to IndexedDB:', error);
      }

      return {
        ...baseState,
        hasCampaign: true,
        campaignSector: emergencySave.currentSector,
        campaignCredits: emergencySave.credits,
      };
    }

    // Normal check for existing campaign
    const exists = await hasCampaign();
    if (exists) {
      const metadata = await getCampaignMetadata();
      if (metadata.exists) {
        return {
          ...baseState,
          hasCampaign: true,
          campaignSector: metadata.sector ?? 1,
          campaignCredits: metadata.credits ?? 0,
        };
      }
    }
  } catch {
    // Ignore errors, just show no campaign
  }

  return baseState;
}

/** Render and bind the title screen */
export function renderTitleScreen(element: HTMLElement): void {
  // This is called for initial render - actual binding happens in bindTitleScreen
  // For backwards compatibility, we just set innerHTML here
  const initialState: TitleState = {
    view: 'main',
    hasCampaign: false,
    campaignSector: 1,
    campaignCredits: 0,
    errorMessage: null,
  };
  element.innerHTML = TitleScreenComponent.render(initialState, {
    onNewGame: () => {},
    onContinue: () => {},
    onSettings: () => {},
    onReplays: () => {},
  });
}

/** Bind title screen event handlers */
export async function bindTitleScreen(
  element: HTMLElement,
  callbacks: TitleScreenProps,
): Promise<void> {
  // Clean up previous handle if exists
  screenHandle?.destroy();

  // Clean up previous simulation if exists
  if (battleSimulation) {
    disposeBattleSimulation(battleSimulation);
    battleSimulation = null;
  }

  // Get initial state with campaign check
  const initialState = await createInitialState();

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
export async function resetTitleScreen(): Promise<void> {
  const state = await createInitialState();
  screenHandle?.replaceState(state);
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
