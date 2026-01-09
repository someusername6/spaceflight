/**
 * Store Storage Panel - Clickable inventory display for the store screen.
 * Clicking items in storage selects them in the store (and vice versa).
 */

import type {
  CampaignState,
  StoredShip,
  StoredWeapon,
} from '../../../campaign/types';
import { MISSILES } from '../../../data/missiles';
import { PRIMARY_WEAPONS } from '../../../data/weapons';
import type { StoreCategory } from './render';

/** Storage item with category info for selection sync */
export interface StorageItem {
  category: StoreCategory;
  itemId: string;
  displayName: string;
  count: number;
}

/** Capitalize first letter of a string */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Render a generic storage item (clickable) */
function renderStorageItem(
  category: StoreCategory,
  itemId: string,
  displayName: string,
  count: number,
  isSelected: boolean,
): string {
  return `
    <div class="storage-item ${isSelected ? 'selected' : ''}"
         data-category="${category}" data-item="${itemId}">
      <span class="item-name">${displayName}</span>
      <span class="item-count">×${count}</span>
    </div>
  `;
}

/** Group stored ships by ship class and count */
function groupStoredShipsByClass(ships: StoredShip[]): Map<string, number> {
  const groups = new Map<string, number>();
  for (const ship of ships) {
    const existing = groups.get(ship.shipClass) ?? 0;
    groups.set(ship.shipClass, existing + 1);
  }
  return groups;
}

/** Group weapons by type and count */
function groupWeaponsByType(
  weapons: StoredWeapon[],
): Map<string, { category: 'primary' | 'secondary'; count: number }> {
  const groups = new Map<
    string,
    { category: 'primary' | 'secondary'; count: number }
  >();
  for (const weapon of weapons) {
    const existing = groups.get(weapon.weaponType);
    if (existing) {
      existing.count +=
        weapon.category === 'secondary' ? (weapon.count ?? 1) : 1;
    } else {
      groups.set(weapon.weaponType, {
        category: weapon.category,
        count: weapon.category === 'secondary' ? (weapon.count ?? 1) : 1,
      });
    }
  }
  return groups;
}

/** Render the storage panel for the store screen */
export function renderStoreStorage(
  state: CampaignState,
  selectedCategory: StoreCategory | null,
  selectedItem: string | null,
): string {
  const hasShips = state.storedShips.length > 0;
  const hasWeapons = state.storedWeapons.length > 0;
  const hasAmmo = state.storedAmmo.length > 0;
  const hasScrap = Object.values(state.storedScrap).some((c) => c > 0);

  const isEmpty = !hasShips && !hasWeapons && !hasAmmo && !hasScrap;

  if (isEmpty) {
    return `
      <div class="store-storage">
        <div class="storage-header">Storage</div>
        <div class="empty-state-panel storage-empty">No items in storage</div>
      </div>
    `;
  }

  // Check if current item matches selection
  const isSelected = (cat: StoreCategory, id: string): boolean =>
    selectedCategory === cat && selectedItem === id;

  // Render ships section (grouped by ship class)
  const shipGroups = groupStoredShipsByClass(state.storedShips);
  const shipsSection = hasShips
    ? `
      <div class="storage-section">
        <div class="storage-label">Stored Ships</div>
        ${Array.from(shipGroups.entries())
          .map(([shipClass, count]) =>
            renderStorageItem(
              'ships',
              shipClass,
              capitalize(shipClass),
              count,
              isSelected('ships', shipClass),
            ),
          )
          .join('')}
      </div>
    `
    : '';

  // Render weapons section (grouped by type)
  const weaponGroups = groupWeaponsByType(state.storedWeapons);
  const weaponsSection = hasWeapons
    ? `
      <div class="storage-section">
        <div class="storage-label">Weapons</div>
        ${Array.from(weaponGroups.entries())
          .map(([type, data]) => {
            const cat: StoreCategory =
              data.category === 'primary' ? 'primaries' : 'secondaries';
            const name =
              data.category === 'primary'
                ? (PRIMARY_WEAPONS[type]?.name ?? type)
                : (MISSILES[type]?.name ?? type);
            return renderStorageItem(
              cat,
              type,
              name,
              data.count,
              isSelected(cat, type),
            );
          })
          .join('')}
      </div>
    `
    : '';

  // Render ammo section
  const ammoSection = hasAmmo
    ? `
      <div class="storage-section">
        <div class="storage-label">Ammo</div>
        ${state.storedAmmo
          .map((ammo) => {
            const name =
              PRIMARY_WEAPONS[ammo.weaponType]?.name ?? ammo.weaponType;
            return renderStorageItem(
              'ammo',
              ammo.weaponType,
              name,
              ammo.count,
              isSelected('ammo', ammo.weaponType),
            );
          })
          .join('')}
      </div>
    `
    : '';

  // Render scrap section
  const scrapEntries = Object.entries(state.storedScrap).filter(
    ([, count]) => count > 0,
  );
  const scrapSection = hasScrap
    ? `
      <div class="storage-section">
        <div class="storage-label">Scrap</div>
        ${scrapEntries
          .map(([shipClass, count]) =>
            renderStorageItem(
              'scrap',
              shipClass,
              `${capitalize(shipClass)} Scrap`,
              count,
              isSelected('scrap', shipClass),
            ),
          )
          .join('')}
      </div>
    `
    : '';

  return `
    <div class="store-storage">
      <div class="storage-header">Storage</div>
      <div class="storage-content">
        ${shipsSection}
        ${weaponsSection}
        ${ammoSection}
        ${scrapSection}
      </div>
    </div>
  `;
}
