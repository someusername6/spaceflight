/**
 * Hardpoint Bindings - Event handlers for weapon slot interactions.
 *
 * Note: Uses direct event listeners instead of delegation because
 * mouseenter/mouseleave don't bubble. Listeners are tracked and cleaned
 * up on each bind call to prevent stale closures.
 */

import { getSlot } from '../../../campaign/slot-array';
import type {
  EquippedPrimary,
  EquippedSecondary,
} from '../../../campaign/types';
import { canEditShip } from '../../../multiplayer/context-permissions';
import { getBankSize } from '../popover/equip';
import {
  closePopovers,
  hidePopoverIfNotPinned,
  pinCurrentPopover,
  showEmptySlotPicker,
  showPrimaryWeaponPopover,
  showSecondaryWeaponPopover,
  updatePopoverCampaignState,
} from '../popover-layer';
import type { SquadronProps } from './bind-events';

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
  closePopovers();
}

/** Bind hardpoint slot interactions */
export function bindHardpointEvents(
  element: HTMLElement,
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

  // Update popover layer with current campaign state
  updatePopoverCampaignState(props.campaignState);

  element.querySelectorAll<HTMLElement>('.schematic-slot').forEach((el) => {
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    const isFilled = el.classList.contains('filled');

    if (!shipId || !slotType) return;

    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!ship) return;

    // Check if player can edit this ship's loadout
    const canEdit = canEditShip(ship.pilot?.id ?? null);

    if (isFilled) {
      // Filled slot: unified popover (hover to preview, click to pin)
      const weapon =
        slotType === 'primary'
          ? getSlot(ship.primaryWeapons, slotIndex)
          : getSlot(ship.secondaryWeapons, slotIndex);
      if (!weapon) return;

      // Hover: show popover preview
      addListener(el, 'mouseenter', () => {
        if (slotType === 'primary') {
          showPrimaryWeaponPopover(
            el,
            weapon as EquippedPrimary,
            shipId,
            slotIndex,
            false,
          );
        } else {
          showSecondaryWeaponPopover(
            el,
            weapon as EquippedSecondary,
            shipId,
            slotIndex,
            false,
          );
        }
      });

      // Click: pin the popover (only if can edit)
      addListener(el, 'click', (e) => {
        e.stopPropagation();
        if (canEdit) {
          pinCurrentPopover();
        }
      });

      // Leave: hide only if not pinned
      addListener(el, 'mouseleave', () => {
        hidePopoverIfNotPinned();
      });
    } else {
      // Empty slot: only show picker if can edit
      if (!canEdit) return;

      // Empty slot: hover to preview, click to pin
      addListener(el, 'mouseenter', () => {
        // Get bank size for this specific slot from ship archetype
        const bankSize = getBankSize(
          props.campaignState,
          shipId,
          slotType,
          slotIndex,
        );
        showEmptySlotPicker(el, slotType, shipId, slotIndex, [bankSize], false);
      });

      // Click: pin the picker
      addListener(el, 'click', (e) => {
        e.stopPropagation();
        pinCurrentPopover();
      });

      // Leave: hide only if not pinned
      addListener(el, 'mouseleave', () => {
        hidePopoverIfNotPinned();
      });
    }
  });
}
