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
  ALL_SLOT_IDS,
  clearEmergencySave,
  getActiveSlotId,
  getAllSlotsMetadata,
  hasAnyCampaign,
  isStorageAvailable,
  recoverEmergencySave,
  type SlotId,
  saveCampaign,
  setActiveSlotId,
} from '../../campaign/storage';
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
  renderErrorView,
  renderLoadingView,
  renderMainView,
  type TitleState,
} from './title-render';

/** Title screen callbacks */
export interface TitleScreenProps {
  onNewGame: () => void;
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
    // Play button - shows slot selection modal
    api.on('#btn-play', 'click', () => {
      props.onNewGame();
    });

    api.on('#btn-settings', 'click', () => {
      props.onSettings();
    });

    api.on('#btn-replays', 'click', () => {
      props.onReplays();
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
        if (currentState.view === 'error') {
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
      // Find the best slot for recovery
      let recoverySlot: SlotId | null = getActiveSlotId();

      if (!recoverySlot) {
        // No active slot - find an empty slot to avoid overwriting data
        const allMetadata = await getAllSlotsMetadata();
        const emptySlot = ALL_SLOT_IDS.find(
          (id) => !allMetadata.find((m) => m.slotId === id && m.exists),
        );

        if (emptySlot) {
          recoverySlot = emptySlot;
        } else {
          // All slots full - use slot 1 as last resort
          logWarn(
            'Emergency recovery: no empty slots, using slot 1 (may overwrite)',
          );
          recoverySlot = 1;
        }
      }

      try {
        // Save the recovered state to IndexedDB
        await saveCampaign(emergencySave, recoverySlot);
        setActiveSlotId(recoverySlot);
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

    // Normal check for existing campaigns
    const exists = await hasAnyCampaign();
    if (exists) {
      // Get metadata from the first occupied slot
      const allMetadata = await getAllSlotsMetadata();
      const activeSlot = getActiveSlotId();

      // Prefer active slot, otherwise use first occupied slot
      let metadata = activeSlot
        ? allMetadata.find((m) => m.slotId === activeSlot && m.exists)
        : null;

      if (!metadata) {
        metadata = allMetadata.find((m) => m.exists);
      }

      if (metadata?.exists) {
        // Set active slot to the first occupied slot if not already set
        if (!activeSlot && metadata.slotId) {
          setActiveSlotId(metadata.slotId);
        }

        return {
          ...baseState,
          hasCampaign: true,
          campaignSector: metadata.sector ?? 1,
          campaignCredits: metadata.credits ?? 0,
        };
      }
    }
  } catch {
    // IndexedDB errors (including timeout) fall through to return baseState
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

  // Get initial state with campaign check
  const initialState = await createInitialState();

  screenHandle = createScreen(
    TitleScreenComponent,
    element,
    initialState,
    callbacks,
  );

  // Start battle simulation in background if not already running
  // (returning from settings keeps existing simulation, returning from gameplay creates new)
  if (!battleSimulation) {
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
