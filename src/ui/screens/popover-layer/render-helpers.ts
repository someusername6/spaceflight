/**
 * Popover Render Helpers
 *
 * Unified rendering interface for all popover content types.
 * Re-exports pure render functions and adds helpers for the Screen framework.
 */

import { getMaxMissileCapacity } from '../../../campaign/store/store-ammo';
import type { CampaignState } from '../../../campaign/types';
import { MISSILES } from '../../../data/missiles';
import { PRIMARY_WEAPONS } from '../../../data/weapons';
import { renderMissileIcon, renderWeaponIcon } from '../../utils/weapon-icon';
import {
  type GroupedWeapon,
  getBankSize,
  getGroupedWeapons,
  renderPrimaryPickerContent,
  renderSecondaryPickerContent,
} from '../popover/equip';
import {
  renderPrimaryPopover,
  renderSecondaryPopover,
} from '../popover/render';
import type { PopoverContent } from './types';

// Re-export for external use
export {
  type GroupedWeapon,
  getBankSize,
  getGroupedWeapons,
  renderPrimaryPickerContent,
  renderSecondaryPickerContent,
};
export { renderPrimaryPopover, renderSecondaryPopover };

/** Get stored weapon count by type */
export function getStoredWeaponCount(
  state: CampaignState,
  weaponType: string,
  category: 'primary' | 'secondary',
): number {
  let count = 0;
  for (const w of state.storedWeapons) {
    if (w.category === category && w.weaponType === weaponType) {
      count += w.count;
    }
  }
  return count;
}

/** Filter weapons to exclude currently equipped */
export function getAvailableForSwap(
  state: CampaignState,
  slotType: 'primary' | 'secondary',
  currentWeaponType: string,
  equippedCount: number,
): Array<{ weaponType: string; totalCount: number }> {
  const groups = new Map<string, number>();

  for (const w of state.storedWeapons) {
    if (w.category !== slotType) continue;

    const existing = groups.get(w.weaponType) ?? 0;
    groups.set(w.weaponType, existing + w.count);
  }

  // Reduce count by equipped amount for current weapon
  const currentCount = groups.get(currentWeaponType) ?? 0;
  const remaining = currentCount - equippedCount;
  if (remaining <= 0) {
    groups.delete(currentWeaponType);
  } else {
    groups.set(currentWeaponType, remaining);
  }

  return Array.from(groups.entries()).map(([weaponType, totalCount]) => ({
    weaponType,
    totalCount,
  }));
}

/** Render swap picker for primary weapons */
export function renderSwapPrimaryContent(
  weapons: Array<{ weaponType: string; totalCount: number }>,
): string {
  if (weapons.length === 0) {
    return '<div class="picker-empty">No other weapons available</div>';
  }

  return weapons
    .map((w) => {
      const displayName = PRIMARY_WEAPONS[w.weaponType]?.name ?? w.weaponType;
      return `
        <button class="picker-item" data-weapon-type="${w.weaponType}">
          ${renderWeaponIcon(w.weaponType, { size: 'sm', className: 'picker-icon' })}
          <span class="picker-name">${displayName}</span>
          <span class="picker-stock">×${w.totalCount}</span>
        </button>
      `;
    })
    .join('');
}

/** Render swap picker for secondary weapons */
export function renderSwapSecondaryContent(
  weapons: Array<{ weaponType: string; totalCount: number }>,
  bankSize: number,
  getMaxMissileCapacity: (type: string, size: number) => number,
): string {
  if (weapons.length === 0) {
    return '<div class="picker-empty">No other missiles available</div>';
  }

  return weapons
    .map((w) => {
      const displayName = MISSILES[w.weaponType]?.name ?? w.weaponType;
      const maxCapacity = getMaxMissileCapacity(w.weaponType, bankSize);
      const maxLoadable = Math.min(w.totalCount, maxCapacity);
      return `
        <div class="picker-missile-row" data-weapon-type="${w.weaponType}">
          <div class="picker-missile-info">
            ${renderMissileIcon(w.weaponType, { size: 'sm', className: 'picker-icon' })}
            <span class="picker-name">${displayName}</span>
            <span class="picker-storage">×${w.totalCount}</span>
          </div>
          <div class="picker-quantity">
            <button class="picker-qty-btn" data-action="dec">−</button>
            <span class="picker-qty-value" data-max="${maxLoadable}">${maxLoadable}</span>
            <button class="picker-qty-btn" data-action="inc">+</button>
            <button class="picker-equip-btn">Equip</button>
          </div>
        </div>
      `;
    })
    .join('');
}

/** Render the full popover HTML based on content type */
export function renderPopoverContent(
  content: PopoverContent,
  state: CampaignState,
): string {
  switch (content.type) {
    case 'primary': {
      return renderPrimaryPopover(
        content.weapon,
        content.shipId,
        content.slotIndex,
        state,
      );
    }
    case 'secondary': {
      return renderSecondaryPopover(
        content.weapon,
        content.shipId,
        content.slotIndex,
        state,
      );
    }
    case 'empty': {
      const grouped = getGroupedWeapons(state, content.slotType);
      const bankSize = getBankSize(
        state,
        content.shipId,
        content.slotType,
        content.slotIndex,
      );
      return content.slotType === 'primary'
        ? renderPrimaryPickerContent(grouped)
        : renderSecondaryPickerContent(grouped, bankSize);
    }
    case 'swap': {
      const bankSize = getBankSize(
        state,
        content.shipId,
        content.slotType,
        content.slotIndex,
      );
      // Get equipped count for current weapon
      const equippedCount = content.slotType === 'primary' ? bankSize : 1;
      const available = getAvailableForSwap(
        state,
        content.slotType,
        content.currentWeaponType,
        equippedCount,
      );
      return content.slotType === 'primary'
        ? renderSwapPrimaryContent(available)
        : renderSwapSecondaryContent(
            available,
            bankSize,
            getMaxMissileCapacity,
          );
    }
  }
}
