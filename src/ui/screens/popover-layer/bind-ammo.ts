/**
 * Popover Ammo Handler Bindings
 *
 * Event handlers for ammo/missile load and unload operations.
 */

import { unequipSecondary } from '../../../campaign/loadout';
import { getSlot } from '../../../campaign/slot-array';
import {
  getMaxAmmoCapacity,
  loadAmmoToWeapon,
  unloadAmmoFromWeapon,
} from '../../../campaign/store/store-ammo';
import {
  loadMissilesToWeapon,
  unloadMissilesFromWeapon,
} from '../../../campaign/store/store-missiles';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../../campaign/types';
import { canEditShip } from '../../../multiplayer/context-permissions';
import type { ScreenAPI } from '../../framework/screen';
import type { PopoverLayerProps, PopoverLayerState } from './types';

/** Close all popovers */
export function closeAll(api: ScreenAPI<PopoverLayerState>): void {
  const state = api.getState();
  if (state.closeTimeoutId) {
    clearTimeout(state.closeTimeoutId);
  }
  api.setState({
    main: null,
    submenu: null,
    closeTimeoutId: null,
    isMouseOverPopover: false,
  });
}

/** Bind ammo load/unload handlers */
export function bindAmmoHandlers(
  api: ScreenAPI<PopoverLayerState>,
  props: PopoverLayerProps,
): void {
  api.on('.manager-btn', 'click', (e, el) => {
    e.stopPropagation();
    const action = el.dataset.action;
    const currentState = api.getState();

    if (!currentState.main || !currentState.campaignState) return;
    const content = currentState.main.content;
    if (content.type !== 'primary' && content.type !== 'secondary') return;

    const campState = props.getCampaignState();
    if (!canEditShip(content.shipId)) return;
    let newState: CampaignState | null = null;

    if (content.type === 'primary') {
      const weapon = content.weapon;
      const maxCap = getMaxAmmoCapacity(weapon.weaponType, weapon.bankSize);

      switch (action) {
        case 'load':
          newState = loadAmmoToWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            10,
          );
          break;
        case 'unload':
          newState = unloadAmmoFromWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            10,
          );
          break;
        case 'load-all':
          newState = loadAmmoToWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            maxCap,
          );
          break;
        case 'unload-all':
          newState = unloadAmmoFromWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            maxCap,
          );
          break;
      }
    } else {
      const weapon = content.weapon;
      switch (action) {
        case 'load':
          newState = loadMissilesToWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            1,
          );
          break;
        case 'unload':
          newState = unloadMissilesFromWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            1,
          );
          break;
        case 'load-all':
          newState = loadMissilesToWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            weapon.maxCount,
          );
          break;
        case 'unload-all':
          newState = unloadMissilesFromWeapon(
            campState,
            content.shipId,
            content.slotIndex,
            weapon.maxCount,
          );
          break;
      }
    }

    if (newState) {
      props.onStateChange(newState);
      refreshAfterAmmoChange(api, props, content, newState, currentState);
    }
  });
}

/** Refresh popover after ammo change */
function refreshAfterAmmoChange(
  api: ScreenAPI<PopoverLayerState>,
  props: PopoverLayerProps,
  content: {
    type: 'primary' | 'secondary';
    shipId: string;
    slotIndex: number;
    weapon: EquippedPrimary | EquippedSecondary;
  },
  newState: CampaignState,
  currentState: PopoverLayerState,
): void {
  const ship = newState.ships.find((s) => s.id === content.shipId);
  if (!ship || !currentState.main) return;

  if (content.type === 'primary') {
    const freshWeapon = getSlot(ship.primaryWeapons, content.slotIndex);
    if (freshWeapon) {
      api.setState({
        campaignState: newState,
        main: {
          ...currentState.main,
          visibility: 'pinned',
          content: {
            type: 'primary' as const,
            weapon: freshWeapon,
            shipId: content.shipId,
            slotIndex: content.slotIndex,
          },
        },
      });
    }
  } else {
    const freshWeapon = getSlot(ship.secondaryWeapons, content.slotIndex);
    if (freshWeapon && freshWeapon.count > 0) {
      api.setState({
        campaignState: newState,
        main: {
          ...currentState.main,
          visibility: 'pinned',
          content: {
            type: 'secondary' as const,
            weapon: freshWeapon,
            shipId: content.shipId,
            slotIndex: content.slotIndex,
          },
        },
      });
    } else {
      // Missile count is 0 - unequip the missile
      const finalState = unequipSecondary(
        newState,
        content.shipId,
        content.slotIndex,
      );
      props.onStateChange(finalState);
      api.setState({ main: null, submenu: null, campaignState: finalState });
    }
  }
}
