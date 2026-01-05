/**
 * Hangar inventory rendering - displays stored items.
 */

import type {
  CampaignState,
  Pilot,
  StoredHull,
  StoredWeapon,
} from '../campaign/types';
import { SHIP_CLASSES } from '../data/ships';

/** Render a stored hull item */
function renderStoredHull(hull: StoredHull): string {
  const stats = SHIP_CLASSES[hull.shipClass];
  const maxHull = stats?.hull ?? 100;
  const currentHull = maxHull - hull.hullDamage;
  const hullPercent = Math.round((currentHull / maxHull) * 100);

  return `
    <div class="inventory-item hull-item">
      <span class="item-name">${hull.shipClass}</span>
      <span class="item-status">Hull: ${hullPercent}%</span>
    </div>
  `;
}

/** Render a stored weapon item */
function renderStoredWeapon(weapon: StoredWeapon): string {
  const countStr = weapon.category === 'secondary' ? ` (×${weapon.count})` : '';
  return `
    <div class="inventory-item weapon-item">
      <span class="item-name">${weapon.weaponType}${countStr}</span>
      <span class="item-category">${weapon.category}</span>
    </div>
  `;
}

/** Render a stored ammo item */
function renderStoredAmmo(ammo: { weaponType: string; count: number }): string {
  return `
    <div class="inventory-item ammo-item">
      <span class="item-name">${ammo.weaponType}</span>
      <span class="item-count">×${ammo.count}</span>
    </div>
  `;
}

/** Render an unassigned pilot item */
function renderUnassignedPilot(pilot: Pilot): string {
  return `
    <div class="inventory-item pilot-item">
      <span class="item-name">${pilot.name}</span>
      <span class="item-status">${pilot.skill}</span>
    </div>
  `;
}

/** Render inventory section */
export function renderInventory(state: CampaignState): string {
  const hasHulls = state.storedHulls.length > 0;
  const hasWeapons = state.storedWeapons.length > 0;
  const hasAmmo = state.storedAmmo.length > 0;
  const hasPilots = state.pilots.length > 0;

  if (!hasHulls && !hasWeapons && !hasAmmo && !hasPilots) {
    return `
      <div class="screen-panel inventory-panel">
        <div class="screen-panel-header">Storage</div>
        <div class="inventory-empty">No items in storage</div>
      </div>
    `;
  }

  return `
    <div class="screen-panel inventory-panel">
      <div class="screen-panel-header">Storage</div>
      ${
        hasPilots
          ? `
        <div class="inventory-section">
          <div class="inventory-label">Unassigned Pilots (${state.pilots.length})</div>
          ${state.pilots.map(renderUnassignedPilot).join('')}
        </div>
      `
          : ''
      }
      ${
        hasHulls
          ? `
        <div class="inventory-section">
          <div class="inventory-label">Ship Hulls (${state.storedHulls.length})</div>
          ${state.storedHulls.map(renderStoredHull).join('')}
        </div>
      `
          : ''
      }
      ${
        hasWeapons
          ? `
        <div class="inventory-section">
          <div class="inventory-label">Weapons (${state.storedWeapons.length})</div>
          ${state.storedWeapons.map(renderStoredWeapon).join('')}
        </div>
      `
          : ''
      }
      ${
        hasAmmo
          ? `
        <div class="inventory-section">
          <div class="inventory-label">Ammo</div>
          ${state.storedAmmo.map(renderStoredAmmo).join('')}
        </div>
      `
          : ''
      }
    </div>
  `;
}
