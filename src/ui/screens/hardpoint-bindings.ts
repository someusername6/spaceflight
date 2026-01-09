/**
 * Hardpoint Bindings - Event handlers for weapon slot interactions.
 *
 * Note: Uses direct event listeners instead of delegation because
 * mouseenter/mouseleave don't bubble.
 */

import type { CampaignState } from '../../campaign/types';
import type { ScreenAPI } from '../framework/screen';
import {
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  setChangeWeaponHandler,
  showWeaponPicker,
  showWeaponPopover,
  showWeaponSwapPicker,
} from './hangar-equip';
import type { SquadronProps, SquadronState } from './squadron-bind-events';

/** Bind hardpoint slot interactions */
export function bindHardpointEvents(
  element: HTMLElement,
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
): void {
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
      el.addEventListener('mouseenter', () => {
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
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      el.addEventListener('mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    } else {
      // Empty slot: hover to preview, click to pin
      el.addEventListener('mouseenter', () => {
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
