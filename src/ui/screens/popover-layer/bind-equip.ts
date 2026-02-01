/**
 * Popover Equip Handler Bindings
 *
 * Event handlers for weapon equipping, unequipping, and swapping.
 */

import { triggerAutoUnready } from '../../../campaign/handlers/lobby-actions';
import {
  equipPrimary,
  equipSecondary,
  unequipPrimary,
  unequipSecondary,
} from '../../../campaign/loadout';
import { getSlot } from '../../../campaign/slot-array';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../../campaign/types';
import {
  requestEquipAction,
  requestUnequipAction,
  shouldUseActionRequest,
} from '../../../multiplayer/action-client';
import { canEditShip } from '../../../multiplayer/context-permissions';
import { addEquipmentSystemMessage } from '../../../multiplayer/system-messages';
import type { ScreenAPI } from '../../framework/screen';
import { getBankSize } from '../popover/equip';
import { closeAll } from './bind-ammo';
import { calculateSubmenuPosition } from './positioning';
import { renderPopoverContent } from './render-helpers';
import type {
  PopoverContent,
  PopoverLayerProps,
  PopoverLayerState,
} from './types';

/** Generate unique ID for popover instance */
let submenuIdCounter = 0;
function generateSubmenuId(): string {
  return `submenu-${++submenuIdCounter}`;
}

/** Find storage index for a weapon type */
function findStorageIndex(
  state: CampaignState,
  weaponType: string,
  category: 'primary' | 'secondary',
): number {
  return state.storedWeapons.findIndex(
    (w) => w.weaponType === weaponType && w.category === category,
  );
}

/** Bind change weapon button handler */
export function bindChangeWeaponHandler(
  api: ScreenAPI<PopoverLayerState>,
): void {
  api.on('.btn-change-weapon', 'click', (e, el) => {
    e.stopPropagation();
    const currentState = api.getState();
    if (!currentState.main || !currentState.campaignState) return;

    const content = currentState.main.content;
    if (content.type !== 'primary' && content.type !== 'secondary') return;

    const shipId = el.dataset.ship;
    const slotType = el.dataset.type as 'primary' | 'secondary' | undefined;
    const slotIndexStr = el.dataset.index;
    if (!shipId || !slotType || !slotIndexStr) return;
    if (!canEditShip(shipId)) return;
    const slotIndex = Number.parseInt(slotIndexStr, 10);
    const weaponType =
      content.type === 'primary'
        ? (content.weapon as EquippedPrimary).weaponType
        : (content.weapon as EquippedSecondary).weaponType;

    const btnRect = el.getBoundingClientRect();
    const submenuContent: PopoverContent = {
      type: 'swap',
      slotType,
      shipId,
      slotIndex,
      currentWeaponType: weaponType,
    };

    // Measure submenu size
    const isSecondarySubmenu = slotType === 'secondary';
    const submenuTypeClass = isSecondarySubmenu
      ? 'weapon-popover-secondary'
      : 'weapon-popover-primary';
    const tempDiv = document.createElement('div');
    tempDiv.className = `weapon-popover ${submenuTypeClass} weapon-swap-picker`;
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.position = 'fixed';
    tempDiv.innerHTML = `<div class="popover-content picker-content">${renderPopoverContent(submenuContent, currentState.campaignState)}</div>`;
    document.body.appendChild(tempDiv);
    const submenuRect = tempDiv.getBoundingClientRect();
    document.body.removeChild(tempDiv);

    const position = calculateSubmenuPosition(
      btnRect,
      { width: submenuRect.width, height: submenuRect.height },
      window.innerWidth,
      window.innerHeight,
    );

    const mainUpdate =
      currentState.main.visibility !== 'pinned'
        ? { ...currentState.main, visibility: 'pinned' as const }
        : currentState.main;

    api.setState({
      main: mainUpdate,
      submenu: {
        id: generateSubmenuId(),
        content: submenuContent,
        position,
        visibility: 'pinned',
        triggerRect: btnRect,
      },
    });
  });
}

/** Bind unequip button handler */
export function bindUnequipHandler(
  api: ScreenAPI<PopoverLayerState>,
  props: PopoverLayerProps,
): void {
  api.on('.btn-unequip', 'click', (e, el) => {
    e.stopPropagation();
    const shipId = el.dataset.ship;
    const slotType = el.dataset.type as 'primary' | 'secondary' | undefined;
    const slotIndexStr = el.dataset.index;
    if (!shipId || !slotType || !slotIndexStr) return;

    const campState = props.getCampaignState();
    if (!canEditShip(shipId)) return;
    const slotIndex = Number.parseInt(slotIndexStr, 10);

    // Get weapon name before unequipping for system message
    const ship = campState.ships.find((s) => s.id === shipId);
    const slot = ship
      ? slotType === 'primary'
        ? getSlot(ship.primaryWeapons, slotIndex)
        : getSlot(ship.secondaryWeapons, slotIndex)
      : null;
    const weaponName = slot?.weaponType ?? 'weapon';

    const newState =
      slotType === 'primary'
        ? unequipPrimary(campState, shipId, slotIndex)
        : unequipSecondary(campState, shipId, slotIndex);

    props.onStateChange(newState);
    triggerAutoUnready();
    addEquipmentSystemMessage('unequipped', weaponName);
    if (shouldUseActionRequest()) {
      void requestUnequipAction(campState, shipId, slotIndex, slotType);
    }
    closeAll(api);
  });
}

/** Bind picker item click handler (primary weapons) */
export function bindPickerItemHandler(
  api: ScreenAPI<PopoverLayerState>,
  props: PopoverLayerProps,
): void {
  api.on('.picker-item', 'click', (e, el) => {
    e.stopPropagation();
    const weaponType = el.dataset.weaponType;
    if (!weaponType) return;
    const currentState = api.getState();

    const isSubmenu = el.closest('.weapon-swap-picker') !== null;
    const content = isSubmenu
      ? currentState.submenu?.content
      : currentState.main?.content;

    if (!content) return;
    const campState = props.getCampaignState();
    if (!canEditShip(content.shipId)) return;
    let newState: CampaignState | null = null;

    if (content.type === 'swap' && content.slotType === 'primary') {
      const tempState = unequipPrimary(
        campState,
        content.shipId,
        content.slotIndex,
      );
      const storageIndex = findStorageIndex(tempState, weaponType, 'primary');
      if (storageIndex >= 0) {
        const bankSize = getBankSize(
          campState,
          content.shipId,
          'primary',
          content.slotIndex,
        );
        newState = equipPrimary(
          tempState,
          content.shipId,
          storageIndex,
          content.slotIndex,
          bankSize,
        );
      }
    } else if (content.type === 'empty' && content.slotType === 'primary') {
      const storageIndex = findStorageIndex(campState, weaponType, 'primary');
      if (storageIndex >= 0) {
        const bankSize = getBankSize(
          campState,
          content.shipId,
          'primary',
          content.slotIndex,
        );
        newState = equipPrimary(
          campState,
          content.shipId,
          storageIndex,
          content.slotIndex,
          bankSize,
        );
      }
    }

    if (newState) {
      props.onStateChange(newState);
      triggerAutoUnready();
      addEquipmentSystemMessage('equipped', weaponType);
      if (content.type === 'empty' && shouldUseActionRequest()) {
        const si = findStorageIndex(campState, weaponType, 'primary');
        const bs = getBankSize(
          campState,
          content.shipId,
          'primary',
          content.slotIndex,
        );
        void requestEquipAction(
          campState,
          content.shipId,
          content.slotIndex,
          si,
          bs,
          'primary',
        );
      }
      closeAll(api);
    }
  });
}

/** Bind missile quantity controls */
export function bindQuantityControls(api: ScreenAPI<PopoverLayerState>): void {
  api.on('.picker-qty-btn', 'click', (e, el) => {
    e.stopPropagation();
    const action = el.dataset.action;
    const row = el.closest('.picker-missile-row');
    const valueEl = row?.querySelector('.picker-qty-value') as HTMLElement;
    if (!valueEl) return;

    const max = Number.parseInt(valueEl.dataset.max ?? '1', 10);
    let current = Number.parseInt(valueEl.textContent ?? '1', 10);

    if (action === 'inc' && current < max) current++;
    if (action === 'dec' && current > 1) current--;

    valueEl.textContent = String(current);
  });
}

/** Bind missile equip button handler */
export function bindMissileEquipHandler(
  api: ScreenAPI<PopoverLayerState>,
  props: PopoverLayerProps,
): void {
  api.on('.picker-equip-btn', 'click', (e, el) => {
    e.stopPropagation();
    const row = el.closest('.picker-missile-row') as HTMLElement;
    if (!row) return;

    const weaponType = row.dataset.weaponType;
    if (!weaponType) return;
    const valueEl = row.querySelector('.picker-qty-value');
    const count = Number.parseInt(valueEl?.textContent ?? '1', 10);

    const currentState = api.getState();
    const isSubmenu = el.closest('.weapon-swap-picker') !== null;
    const content = isSubmenu
      ? currentState.submenu?.content
      : currentState.main?.content;

    if (!content) return;
    const campState = props.getCampaignState();
    if (!canEditShip(content.shipId)) return;
    let newState: CampaignState | null = null;

    if (content.type === 'swap' && content.slotType === 'secondary') {
      const tempState = unequipSecondary(
        campState,
        content.shipId,
        content.slotIndex,
      );
      const storageIndex = findStorageIndex(tempState, weaponType, 'secondary');
      if (storageIndex >= 0) {
        const bankSize = getBankSize(
          campState,
          content.shipId,
          'secondary',
          content.slotIndex,
        );
        newState = equipSecondary(
          tempState,
          content.shipId,
          storageIndex,
          content.slotIndex,
          bankSize,
          count,
        );
      }
    } else if (content.type === 'empty' && content.slotType === 'secondary') {
      const storageIndex = findStorageIndex(campState, weaponType, 'secondary');
      if (storageIndex >= 0) {
        const bankSize = getBankSize(
          campState,
          content.shipId,
          'secondary',
          content.slotIndex,
        );
        newState = equipSecondary(
          campState,
          content.shipId,
          storageIndex,
          content.slotIndex,
          bankSize,
          count,
        );
      }
    }

    if (newState) {
      props.onStateChange(newState);
      triggerAutoUnready();
      addEquipmentSystemMessage('equipped', weaponType);
      if (content.type === 'empty' && shouldUseActionRequest()) {
        const si = findStorageIndex(campState, weaponType, 'secondary');
        const bs = getBankSize(
          campState,
          content.shipId,
          'secondary',
          content.slotIndex,
        );
        void requestEquipAction(
          campState,
          content.shipId,
          content.slotIndex,
          si,
          bs,
          'secondary',
        );
      }
      closeAll(api);
    }
  });
}
