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
import type { ScreenAPI } from '../../framework/screen';
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
import type { SquadronProps, SquadronState } from './bind-events';

/** Clean up hardpoint resources (call on screen destroy) */
export function destroyHardpointListeners(): void {
  closePopovers();
}

/** Bind hardpoint slot interactions using ScreenAPI */
export function bindHardpointEvents(
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
): void {
  // Update popover layer with current campaign state
  updatePopoverCampaignState(props.campaignState);

  // Filled slots: hover to preview, click to pin, leave to hide
  api.onDirect('.schematic-slot.filled', 'mouseenter', (_e, el) => {
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    if (!shipId || !slotType) return;

    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!ship) return;

    const weapon =
      slotType === 'primary'
        ? getSlot(ship.primaryWeapons, slotIndex)
        : getSlot(ship.secondaryWeapons, slotIndex);
    if (!weapon) return;

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

  api.onDirect('.schematic-slot.filled', 'click', (e, el) => {
    e.stopPropagation();
    const shipId = el.dataset.ship;
    if (!shipId) return;
    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!ship) return;
    if (canEditShip(ship.pilot?.id ?? null)) {
      pinCurrentPopover();
    }
  });

  api.onDirect('.schematic-slot.filled', 'mouseleave', () => {
    hidePopoverIfNotPinned();
  });

  // Empty slots: hover to preview picker, click to pin, leave to hide
  api.onDirect('.schematic-slot:not(.filled)', 'mouseenter', (_e, el) => {
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    if (!shipId || !slotType) return;

    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!ship) return;
    if (!canEditShip(ship.pilot?.id ?? null)) return;

    const bankSize = getBankSize(
      props.campaignState,
      shipId,
      slotType,
      slotIndex,
    );
    showEmptySlotPicker(el, slotType, shipId, slotIndex, [bankSize], false);
  });

  api.onDirect('.schematic-slot:not(.filled)', 'click', (e, el) => {
    e.stopPropagation();
    const shipId = el.dataset.ship;
    if (!shipId) return;
    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!ship) return;
    if (canEditShip(ship.pilot?.id ?? null)) {
      pinCurrentPopover();
    }
  });

  api.onDirect('.schematic-slot:not(.filled)', 'mouseleave', () => {
    hidePopoverIfNotPinned();
  });
}
