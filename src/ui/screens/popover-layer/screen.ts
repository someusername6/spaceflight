/**
 * Popover Layer Screen
 *
 * A Screen-based replacement for the global popover system.
 * Manages all weapon popovers using the standard Screen framework.
 */

import type { CampaignState } from '../../../campaign/types';
import type { Screen, ScreenAPI } from '../../framework/screen';
import {
  bindAmmoHandlers,
  bindChangeWeaponHandler,
  bindMissileEquipHandler,
  bindPickerItemHandler,
  bindQuantityControls,
  bindUnequipHandler,
  closeAll,
} from './bind-handlers';
import { renderPopoverContent } from './render-helpers';
import type {
  PopoverInstance,
  PopoverLayerProps,
  PopoverLayerState,
} from './types';

// Re-export the public API
export { createPopoverLayerAPI, type PopoverLayerAPI } from './api';

/** Close delay in ms (matches old system) */
const CLOSE_DELAY = 50;

/** Initial state */
export function createInitialState(): PopoverLayerState {
  return {
    main: null,
    submenu: null,
    campaignState: null,
    closeTimeoutId: null,
    isMouseOverPopover: false,
  };
}

/** Render a single popover instance */
function renderPopover(
  instance: PopoverInstance,
  campaignState: CampaignState,
  isSubmenu: boolean,
): string {
  const content = renderPopoverContent(instance.content, campaignState);
  const pinnedClass = instance.visibility === 'pinned' ? ' pinned' : '';
  const submenuClass = isSubmenu ? ' weapon-swap-picker' : '';

  // Determine type class based on content type or slotType for swap/empty
  const isSecondary =
    instance.content.type === 'secondary' ||
    (instance.content.type === 'swap' &&
      instance.content.slotType === 'secondary') ||
    (instance.content.type === 'empty' &&
      instance.content.slotType === 'secondary');
  const typeClass = isSecondary
    ? ' weapon-popover-secondary'
    : ' weapon-popover-primary';

  return `
    <div
      class="weapon-popover${typeClass}${pinnedClass}${submenuClass}"
      data-popover-id="${instance.id}"
      style="position: fixed; left: ${instance.position.left}px; top: ${instance.position.top}px; z-index: ${isSubmenu ? 1001 : 1000};"
    >
      <div class="popover-content${instance.content.type === 'empty' || instance.content.type === 'swap' ? ' picker-content' : ''}">
        ${content}
      </div>
    </div>
  `;
}

/** The popover layer screen definition */
export const PopoverLayerScreen: Screen<PopoverLayerState, PopoverLayerProps> =
  {
    render(state, _props) {
      if (!state.main && !state.submenu) {
        return '';
      }

      let html = '';
      if (state.main && state.campaignState) {
        html += renderPopover(state.main, state.campaignState, false);
      }
      if (state.submenu && state.campaignState) {
        html += renderPopover(state.submenu, state.campaignState, true);
      }
      return html;
    },

    bind(api, props) {
      const state = api.getState();
      if (!state.main) return;

      // Mouse tracking for hover/pinned behavior
      // NOTE: mouseenter/mouseleave don't bubble, so we can't use api.on() delegation
      bindMouseTracking(api);

      // Click to pin
      bindClickToPin(api);

      // Add outside click listener when popover is pinned
      if (state.main?.visibility === 'pinned') {
        addOutsideClickListener(api);
      }

      // Bind all action handlers
      bindAmmoHandlers(api, props);
      bindChangeWeaponHandler(api);
      bindUnequipHandler(api, props);
      bindPickerItemHandler(api, props);
      bindQuantityControls(api);
      bindMissileEquipHandler(api, props);
    },
  };

// ============================================================================
// Mouse and click handlers (kept in screen.ts for direct state access)
// ============================================================================

function bindMouseTracking(api: ScreenAPI<PopoverLayerState>): void {
  // Use onDirect for non-bubbling events (mouseenter/mouseleave)
  // This ensures proper cleanup through the Screen framework
  api.onDirect('.weapon-popover', 'mouseenter', () => {
    api.updateState({ isMouseOverPopover: true });
    cancelCloseTimeout(api);
  });

  api.onDirect('.weapon-popover', 'mouseleave', () => {
    api.updateState({ isMouseOverPopover: false });
    const currentState = api.getState();
    if (currentState.main?.visibility !== 'pinned') {
      scheduleClose(api);
    }
  });
}

function bindClickToPin(api: ScreenAPI<PopoverLayerState>): void {
  api.on('.weapon-popover', 'click', (e) => {
    // Skip if clicking buttons that handle their own actions
    const target = e.target as HTMLElement;
    if (
      target.closest('.btn-change-weapon') ||
      target.closest('.manager-btn') ||
      target.closest('.btn-unequip') ||
      target.closest('.picker-equip-btn') ||
      target.closest('.picker-qty-btn') ||
      target.closest('.picker-item')
    ) {
      return;
    }

    const currentState = api.getState();
    if (currentState.main && currentState.main.visibility !== 'pinned') {
      api.setState({
        main: { ...currentState.main, visibility: 'pinned' },
      });
    }
  });
}

// ============================================================================
// Helper functions for state management
// ============================================================================

function cancelCloseTimeout(api: ScreenAPI<PopoverLayerState>): void {
  const state = api.getState();
  if (state.closeTimeoutId) {
    clearTimeout(state.closeTimeoutId);
    api.updateState({ closeTimeoutId: null });
  }
}

function scheduleClose(api: ScreenAPI<PopoverLayerState>): void {
  cancelCloseTimeout(api);
  const timeoutId = setTimeout(() => {
    const currentState = api.getState();
    if (
      currentState.main?.visibility !== 'pinned' &&
      !currentState.isMouseOverPopover
    ) {
      closeAll(api);
    }
  }, CLOSE_DELAY);
  api.updateState({ closeTimeoutId: timeoutId });
}

function addOutsideClickListener(api: ScreenAPI<PopoverLayerState>): void {
  // 3-way click handling (matches original swap.ts behavior):
  // 1. Inside submenu: do nothing
  // 2. Inside main popover (not submenu): close only submenu
  // 3. Outside both: close everything
  api.onGlobal('click', (e) => {
    const target = e.target as HTMLElement;
    const state = api.getState();

    // Case 1: Click inside submenu - do nothing
    const clickedInSubmenu = target.closest('.weapon-swap-picker');
    if (clickedInSubmenu) {
      return;
    }

    // Case 2: Click inside main popover or on a slot - close only submenu
    const clickedInMainPopover = target.closest('.weapon-popover');
    const clickedInSlot = target.closest('[data-slot-type]');
    if (clickedInMainPopover || clickedInSlot) {
      const clickedChangeButton = target.closest('.btn-change-weapon');
      if (state.submenu && !clickedChangeButton) {
        api.setState({ submenu: null });
      }
      return;
    }

    // Case 3: Click outside both - close everything
    closeAll(api);
  });
}
