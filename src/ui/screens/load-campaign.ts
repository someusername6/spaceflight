/**
 * Load Campaign Screen - Save slot selection for campaign management.
 *
 * Displays:
 * - 3 save slots with campaign metadata
 * - Empty slots show "New Campaign" option
 * - Occupied slots show campaign info and load/delete options
 * - Battle simulation background (transferred from title screen)
 */

import {
  type CampaignMetadata,
  deleteCampaign,
  getAllSlotsMetadata,
  loadCampaign,
  type SlotId,
  setActiveSlotId,
} from '../../campaign/storage';
import type { CampaignState } from '../../campaign/types';
import { logError } from '../../core/logger';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import {
  renderConfirmDeleteView,
  renderErrorView,
  renderLoadingView,
  renderSlotsView,
} from './load-campaign-render';

/** Load campaign screen state */
export interface LoadCampaignState {
  view: 'slots' | 'loading' | 'confirm-delete' | 'error';
  slots: CampaignMetadata[];
  selectedSlot: SlotId | null;
  errorMessage: string | null;
}

/** Load campaign screen result */
export type LoadCampaignResult =
  | { action: 'load'; state: CampaignState; slotId: SlotId }
  | { action: 'create'; slotId: SlotId }
  | { action: 'cancel' };

/** Callbacks for load campaign screen */
export interface LoadCampaignCallbacks {
  onBack: () => void;
  onLoad: (state: CampaignState, slotId: SlotId) => void;
  onCreate: (slotId: SlotId) => void;
}

/** Load campaign screen component */
const LoadCampaignScreenComponent: Screen<
  LoadCampaignState,
  LoadCampaignCallbacks
> = {
  render(state) {
    let content: string;

    switch (state.view) {
      case 'slots':
        content = renderSlotsView(state.slots);
        break;
      case 'loading':
        content = renderLoadingView();
        break;
      case 'confirm-delete':
        content = renderConfirmDeleteView(state.selectedSlot ?? 1);
        break;
      case 'error':
        content = renderErrorView(state.errorMessage ?? 'An error occurred.');
        break;
    }

    return `
      <div class="load-campaign-screen">
        <div class="load-campaign-background" id="load-campaign-battle-bg"></div>
        <div class="load-campaign-wrapper">
          ${content}
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<LoadCampaignState>, props: LoadCampaignCallbacks) {
    // Empty slot click → create new campaign
    api.on('[data-action="create"]', 'click', (_, element) => {
      const slotId = parseInt(element.dataset.slot ?? '1', 10) as SlotId;
      props.onCreate(slotId);
    });

    // Load button click
    api.on('[data-action="load"]', 'click', async (_, element) => {
      const slotId = parseInt(element.dataset.slot ?? '1', 10) as SlotId;
      api.setState({ view: 'loading' });

      try {
        const state = await loadCampaign(slotId);
        if (state) {
          setActiveSlotId(slotId);
          props.onLoad(state, slotId);
        } else {
          api.setState({
            view: 'error',
            errorMessage:
              'Failed to load campaign. The save data may be corrupted.',
          });
        }
      } catch (error) {
        logError('Failed to load campaign:', error);
        api.setState({
          view: 'error',
          errorMessage: `Failed to load campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });

    // Delete button click → show confirmation
    api.on('[data-action="delete"]', 'click', (_, element) => {
      const slotId = parseInt(element.dataset.slot ?? '1', 10) as SlotId;
      api.setState({ view: 'confirm-delete', selectedSlot: slotId });
    });

    // Cancel delete
    api.on('#btn-cancel-delete', 'click', () => {
      api.setState({ view: 'slots', selectedSlot: null });
    });

    // Confirm delete
    api.on('#btn-confirm-delete', 'click', async () => {
      const state = api.getState();
      const slotId = state.selectedSlot;
      if (!slotId) return;

      api.setState({ view: 'loading' });

      try {
        await deleteCampaign(slotId);
        // Refresh slots
        const slots = await getAllSlotsMetadata();
        api.setState({ view: 'slots', slots, selectedSlot: null });
      } catch (error) {
        logError('Failed to delete campaign:', error);
        api.setState({
          view: 'error',
          errorMessage: `Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });

    // Back button
    api.on('#btn-back', 'click', () => {
      props.onBack();
    });

    // Error OK button
    api.on('#btn-error-ok', 'click', async () => {
      // Refresh slots and return to slots view
      try {
        const slots = await getAllSlotsMetadata();
        api.setState({ view: 'slots', slots, errorMessage: null });
      } catch {
        api.setState({ view: 'slots', errorMessage: null });
      }
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;
      const state = api.getState();

      if (key === 'Escape') {
        e.preventDefault();
        if (state.view === 'confirm-delete') {
          api.setState({ view: 'slots', selectedSlot: null });
        } else if (state.view === 'error') {
          api.setState({ view: 'slots', errorMessage: null });
        } else if (state.view === 'slots') {
          props.onBack();
        }
      }
    });

    // Re-attach battle simulation canvas after re-render (if present)
    reattachBattleCanvas();
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<
  LoadCampaignState,
  LoadCampaignCallbacks
> | null = null;

/** Store canvas reference for re-attachment across re-renders */
let battleCanvas: HTMLCanvasElement | null = null;

/** Store the canvas when it's first attached */
export function storeBattleCanvas(canvas: HTMLCanvasElement): void {
  battleCanvas = canvas;
}

/** Re-attach battle canvas after re-render */
function reattachBattleCanvas(): void {
  if (battleCanvas) {
    const bgContainer = document.getElementById('load-campaign-battle-bg');
    const loadCampaignScreen = document.querySelector('.load-campaign-screen');
    if (bgContainer) {
      // Re-attach canvas if needed
      if (battleCanvas.parentElement !== bgContainer) {
        bgContainer.appendChild(battleCanvas);
      }
      // Restore the with-battle-bg class (lost during re-render)
      loadCampaignScreen?.classList.add('with-battle-bg');
    }
  }
}

/** Render the load campaign screen */
export function renderLoadCampaignScreen(element: HTMLElement): void {
  const initialState: LoadCampaignState = {
    view: 'slots',
    slots: [
      { exists: false, slotId: 1 },
      { exists: false, slotId: 2 },
      { exists: false, slotId: 3 },
    ],
    selectedSlot: null,
    errorMessage: null,
  };
  // Provide dummy callbacks for initial render (real ones set in bind)
  element.innerHTML = LoadCampaignScreenComponent.render(initialState, {
    onBack: () => {},
    onLoad: () => {},
    onCreate: () => {},
  });
}

/** Bind load campaign screen event handlers */
export async function bindLoadCampaignScreen(
  element: HTMLElement,
  callbacks: LoadCampaignCallbacks,
): Promise<void> {
  // Clean up previous handle if exists
  screenHandle?.destroy();

  // Load slot metadata
  let slots: CampaignMetadata[];
  try {
    slots = await getAllSlotsMetadata();
  } catch {
    slots = [
      { exists: false, slotId: 1 },
      { exists: false, slotId: 2 },
      { exists: false, slotId: 3 },
    ];
  }

  const initialState: LoadCampaignState = {
    view: 'slots',
    slots,
    selectedSlot: null,
    errorMessage: null,
  };

  screenHandle = createScreen(
    LoadCampaignScreenComponent,
    element,
    initialState,
    callbacks,
  );
}

/** Cleanup load campaign screen */
export function cleanupLoadCampaignScreen(): void {
  screenHandle?.destroy();
  screenHandle = null;
  // Clear stored canvas reference (canvas ownership returns to title screen)
  battleCanvas = null;
}
