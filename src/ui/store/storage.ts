/**
 * Store Storage Panel - Clickable inventory display for the store screen.
 * Clicking items in storage selects them in the store (and vice versa).
 */

import type {
  CampaignState,
  StoredHull,
  StoredWeapon,
} from '../../campaign/types';
import { PRIMARY_WEAPONS } from '../../data/weapons';
import type { StoreCategory } from './render';

/** Storage item with category info for selection sync */
export interface StorageItem {
  category: StoreCategory;
  itemId: string;
  displayName: string;
  count: number;
}

/** Render a stored hull item (clickable) */
function renderStoredHullItem(hull: StoredHull, isSelected: boolean): string {
  return `
    <div class="storage-item ${isSelected ? 'selected' : ''}"
         data-category="hulls" data-item="${hull.shipClass}">
      <span class="item-name">${hull.shipClass}</span>
    </div>
  `;
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

/** Render a weapon group item (clickable) */
function renderWeaponGroupItem(
  weaponType: string,
  data: { category: 'primary' | 'secondary'; count: number },
  isSelected: boolean,
): string {
  const storeCategory: StoreCategory =
    data.category === 'primary' ? 'primaries' : 'secondaries';
  return `
    <div class="storage-item ${isSelected ? 'selected' : ''}"
         data-category="${storeCategory}" data-item="${weaponType}">
      <span class="item-name">${weaponType}</span>
      <span class="item-count">×${data.count}</span>
    </div>
  `;
}

/** Render a stored ammo item (clickable) */
function renderStoredAmmoItem(
  ammo: { weaponType: string; count: number },
  isSelected: boolean,
): string {
  const weaponName = PRIMARY_WEAPONS[ammo.weaponType]?.name ?? ammo.weaponType;
  return `
    <div class="storage-item ${isSelected ? 'selected' : ''}"
         data-category="ammo" data-item="${ammo.weaponType}">
      <span class="item-name">${weaponName}</span>
      <span class="item-count">×${ammo.count}</span>
    </div>
  `;
}

/** Render a scrap item (clickable) */
function renderScrapItem(
  shipClass: string,
  count: number,
  isSelected: boolean,
): string {
  const displayName = shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
  return `
    <div class="storage-item ${isSelected ? 'selected' : ''}"
         data-category="scrap" data-item="${shipClass}">
      <span class="item-name">${displayName} Scrap</span>
      <span class="item-count">×${count}</span>
    </div>
  `;
}

/** Render the storage panel for the store screen */
export function renderStoreStorage(
  state: CampaignState,
  selectedCategory: StoreCategory | null,
  selectedItem: string | null,
): string {
  const hasHulls = state.storedHulls.length > 0;
  const hasWeapons = state.storedWeapons.length > 0;
  const hasAmmo = state.storedAmmo.length > 0;
  const hasScrap = Object.values(state.storedScrap).some((c) => c > 0);

  const isEmpty = !hasHulls && !hasWeapons && !hasAmmo && !hasScrap;

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

  // Render hulls section
  const hullsSection = hasHulls
    ? `
      <div class="storage-section">
        <div class="storage-label">Ship Hulls</div>
        ${state.storedHulls
          .map((hull) =>
            renderStoredHullItem(hull, isSelected('hulls', hull.shipClass)),
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
            return renderWeaponGroupItem(type, data, isSelected(cat, type));
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
          .map((ammo) =>
            renderStoredAmmoItem(ammo, isSelected('ammo', ammo.weaponType)),
          )
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
            renderScrapItem(shipClass, count, isSelected('scrap', shipClass)),
          )
          .join('')}
      </div>
    `
    : '';

  return `
    <div class="store-storage">
      <div class="storage-header">Storage</div>
      <div class="storage-content">
        ${hullsSection}
        ${weaponsSection}
        ${ammoSection}
        ${scrapSection}
      </div>
    </div>
  `;
}
