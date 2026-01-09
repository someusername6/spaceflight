/**
 * Hardpoint Bindings - Event handlers for weapon slot interactions.
 */

import {
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  setChangeWeaponHandler,
  showWeaponPicker,
  showWeaponPopover,
  showWeaponSwapPicker,
} from './hangar-equip';
import type { SquadronUIState } from './squadron-bindings';

/** Bind hardpoint slot interactions */
export function bindHardpointEvents(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  // Set up the change weapon handler for popovers
  setChangeWeaponHandler(showWeaponSwapPicker);

  ui.element.querySelectorAll('.schematic-slot').forEach((slot) => {
    const el = slot as HTMLElement;
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    const isFilled = el.classList.contains('filled');

    if (!shipId || !slotType) return;

    const ship = ui.state.ships.find((s) => s.id === shipId);
    if (!ship) return;

    if (isFilled) {
      // Filled slot: unified popover (hover to preview, click to pin)
      const weapon =
        slotType === 'primary'
          ? ship.primaryWeapons[slotIndex]
          : ship.secondaryWeapons[slotIndex];
      if (!weapon) return;

      // Hover: show popover preview
      el.addEventListener('mouseenter', () => {
        showWeaponPopover(
          el,
          ui.state,
          shipId,
          slotType,
          slotIndex,
          weapon,
          (newState) => {
            ui.state = newState;
            if (ui.onStateUpdate) ui.onStateUpdate(newState);
          },
          rerender,
        );
      });

      // Click: pin the popover
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      el.addEventListener('mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    } else {
      // Empty slot: hover to preview, click to pin (same as filled slots)
      el.addEventListener('mouseenter', () => {
        showWeaponPicker(
          el,
          ui.state,
          shipId,
          slotType,
          slotIndex,
          (newState) => {
            ui.state = newState;
            if (ui.onStateUpdate) ui.onStateUpdate(newState);
          },
          rerender,
        );
      });

      // Click: pin the picker
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      el.addEventListener('mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    }
  });
}
