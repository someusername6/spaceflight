/**
 * Hardpoint Bindings - Event handlers for weapon slot interactions.
 *
 * Note: Uses direct event listeners instead of delegation because
 * mouseenter/mouseleave don't bubble. Listeners are tracked and cleaned
 * up on each bind call to prevent stale closures.
 */

import type { CampaignState } from '../../../campaign/types';
import type { ScreenAPI } from '../../framework/screen';
import {
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  setChangeWeaponHandler,
  showWeaponPicker,
  showWeaponPopover,
  showWeaponSwapPicker,
} from '../popover/equip';
import type { SquadronProps, SquadronState } from './bind-events';

/** Tracked listener for cleanup */
interface TrackedListener {
  el: HTMLElement;
  event: string;
  handler: EventListener;
}

/** Cleanup function for previous listeners */
let hardpointCleanup: (() => void) | null = null;

/** Clean up hardpoint listeners (call on screen destroy) */
export function destroyHardpointListeners(): void {
  hardpointCleanup?.();
  hardpointCleanup = null;
}

/** Bind hardpoint slot interactions */
export function bindHardpointEvents(
  element: HTMLElement,
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
): void {
  // Clean up previous listeners to prevent stale closures
  hardpointCleanup?.();

  const listeners: TrackedListener[] = [];
  const addListener = (
    el: HTMLElement,
    event: string,
    handler: EventListener,
  ) => {
    el.addEventListener(event, handler);
    listeners.push({ el, event, handler });
  };

  // Store cleanup function for next call
  hardpointCleanup = () => {
    for (const { el, event, handler } of listeners) {
      el.removeEventListener(event, handler);
    }
    listeners.length = 0;
  };

  // Set up the change weapon handler for popovers
  setChangeWeaponHandler(showWeaponSwapPicker);

  // Helper to update campaign state
  const onStateChange = (newState: CampaignState) => {
    if (props.onStateUpdate) {
      props.onStateUpdate(newState);
    }
  };

  // Helper to trigger re-render
  const rerender = () => api.setState({});

  element.querySelectorAll('.schematic-slot').forEach((slot) => {
    const el = slot as HTMLElement;
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    const isFilled = el.classList.contains('filled');

    if (!shipId || !slotType) return;

    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!ship) return;

    if (isFilled) {
      // Filled slot: unified popover (hover to preview, click to pin)
      const weapon =
        slotType === 'primary'
          ? ship.primaryWeapons[slotIndex]
          : ship.secondaryWeapons[slotIndex];
      if (!weapon) return;

      // Hover: show popover preview
      addListener(el, 'mouseenter', () => {
        showWeaponPopover(
          el,
          props.campaignState,
          shipId,
          slotType,
          slotIndex,
          weapon,
          onStateChange,
          rerender,
        );
      });

      // Click: pin the popover
      addListener(el, 'click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      addListener(el, 'mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    } else {
      // Empty slot: hover to preview, click to pin
      addListener(el, 'mouseenter', () => {
        showWeaponPicker(
          el,
          props.campaignState,
          shipId,
          slotType,
          slotIndex,
          onStateChange,
          rerender,
        );
      });

      // Click: pin the picker
      addListener(el, 'click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      addListener(el, 'mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    }
  });
}
