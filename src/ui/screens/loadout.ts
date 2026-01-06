/**
 * Loadout UI - ship detail view with weapon management.
 *
 * Renders the loadout panel for a selected ship, showing equipped weapons,
 * storage options, and hull swap functionality.
 */

import { getMaxAmmoCapacity } from '../../campaign/store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  StoredHull,
  StoredWeapon,
} from '../../campaign/types';
import { weaponUsesAmmo } from '../../data/prices';
import { SHIP_CLASSES } from '../../data/ships';

// Re-export event binding from separate module
export { bindLoadoutEvents, type StateUpdater } from './loadout-events';

/** Render ammo info and controls for a primary weapon */
function renderAmmoControls(
  w: EquippedPrimary,
  i: number,
  shipId: string,
  hasStoredAmmo: boolean,
): string {
  if (!weaponUsesAmmo(w.weaponType)) {
    return '<span class="ammo-info">∞</span>';
  }

  const current = w.currentAmmo ?? 0;
  const max = getMaxAmmoCapacity(w.weaponType, w.bankSize);
  const canLoad = hasStoredAmmo && current < max;
  const canUnload = current > 0;

  return `
    <span class="ammo-info">${current}/${max}</span>
    <button class="btn-tiny btn-load-all" data-ship="${shipId}" data-index="${i}" ${canLoad ? '' : 'disabled'} title="Fill">▲</button>
    <button class="btn-tiny btn-load" data-ship="${shipId}" data-index="${i}" ${canLoad ? '' : 'disabled'}>+</button>
    <button class="btn-tiny btn-unload" data-ship="${shipId}" data-index="${i}" ${canUnload ? '' : 'disabled'}>−</button>
    <button class="btn-tiny btn-unload-all" data-ship="${shipId}" data-index="${i}" ${canUnload ? '' : 'disabled'} title="Empty">▼</button>
  `;
}

/** Render missile controls for a secondary weapon */
function renderMissileControls(
  w: EquippedSecondary,
  i: number,
  shipId: string,
  hasStoredMissiles: boolean,
): string {
  const canLoad = hasStoredMissiles && w.count < w.maxCount;
  const canUnload = w.count > 0;

  return `
    <span class="ammo-info">${w.count}/${w.maxCount}</span>
    <button class="btn-tiny btn-load-missile-all" data-ship="${shipId}" data-index="${i}" ${canLoad ? '' : 'disabled'} title="Fill">▲</button>
    <button class="btn-tiny btn-load-missile" data-ship="${shipId}" data-index="${i}" ${canLoad ? '' : 'disabled'}>+</button>
    <button class="btn-tiny btn-unload-missile" data-ship="${shipId}" data-index="${i}" ${canUnload ? '' : 'disabled'}>−</button>
    <button class="btn-tiny btn-unload-missile-all" data-ship="${shipId}" data-index="${i}" ${canUnload ? '' : 'disabled'} title="Empty">▼</button>
  `;
}

/** Render weapon list for a ship */
function renderShipWeapons(ship: OwnedShip, state: CampaignState): string {
  const primaryList = ship.primaryWeapons
    .map((w, i) => {
      const hasStoredAmmo = state.storedAmmo.some(
        (a) => a.weaponType === w.weaponType && a.count > 0,
      );
      return `
      <div class="weapon-row">
        <span class="weapon-name">${w.weaponType} (×${w.bankSize})</span>
        ${renderAmmoControls(w, i, ship.id, hasStoredAmmo)}
        <button class="btn-small btn-unequip" data-ship="${ship.id}" data-type="primary" data-index="${i}">
          Unequip
        </button>
      </div>
    `;
    })
    .join('');

  const secondaryList = ship.secondaryWeapons
    .map((w, i) => {
      const hasStoredMissiles = state.storedWeapons.some(
        (s) =>
          s.category === 'secondary' &&
          s.weaponType === w.weaponType &&
          s.count > 0,
      );
      return `
      <div class="weapon-row">
        <span class="weapon-name">${w.weaponType} (×${w.bankSize})</span>
        ${renderMissileControls(w, i, ship.id, hasStoredMissiles)}
        <button class="btn-small btn-unequip" data-ship="${ship.id}" data-type="secondary" data-index="${i}">
          Unequip
        </button>
      </div>
    `;
    })
    .join('');

  return `
    <div class="ship-weapons">
      <div class="weapon-section">
        <div class="weapon-label">Primary (${ship.primaryWeapons.length})</div>
        ${primaryList || '<div class="weapon-empty">None equipped</div>'}
      </div>
      <div class="weapon-section">
        <div class="weapon-label">Secondary (${ship.secondaryWeapons.length})</div>
        ${secondaryList || '<div class="weapon-empty">None equipped</div>'}
      </div>
    </div>
  `;
}

/** Render stored ammo reserves */
function renderStoredAmmo(state: CampaignState): string {
  if (state.storedAmmo.length === 0) {
    return '';
  }

  const ammoList = state.storedAmmo
    .map(
      (a) => `<div class="storage-row">${a.weaponType} ammo: ${a.count}</div>`,
    )
    .join('');

  return `
    <div class="storage-ammo">
      <div class="storage-label">Stored Ammo</div>
      ${ammoList}
    </div>
  `;
}

/** Render stored missile reserves */
function renderStoredMissiles(state: CampaignState): string {
  const missiles = state.storedWeapons.filter(
    (w) => w.category === 'secondary',
  );
  if (missiles.length === 0) {
    return '';
  }

  const missileList = missiles
    .map((m) => `<div class="storage-row">${m.weaponType}: ${m.count}</div>`)
    .join('');

  return `
    <div class="storage-missiles">
      <div class="storage-label">Stored Missiles</div>
      ${missileList}
    </div>
  `;
}

/** Render storage weapons that can be equipped */
function renderEquipOptions(ship: OwnedShip, storage: StoredWeapon[]): string {
  const shipStats = SHIP_CLASSES[ship.shipClass];
  if (!shipStats) return '';

  // Get available bank sizes for this ship class
  const primaryBanks = shipStats.primaryBanks;
  const secondaryBanks = shipStats.secondaryBanks;

  // Filter storage by category
  const primaryWeapons = storage
    .map((w, i) => ({ ...w, storageIndex: i }))
    .filter((w) => w.category === 'primary');
  const secondaryWeapons = storage
    .map((w, i) => ({ ...w, storageIndex: i }))
    .filter((w) => w.category === 'secondary');

  // Current slot usage
  const usedPrimarySlots = ship.primaryWeapons.length;
  const usedSecondarySlots = ship.secondaryWeapons.length;
  const canAddPrimary = usedPrimarySlots < primaryBanks.length;
  const canAddSecondary = usedSecondarySlots < secondaryBanks.length;

  // Next available bank size
  const nextPrimaryBank = primaryBanks[usedPrimarySlots] ?? 1;
  const nextSecondaryBank = secondaryBanks[usedSecondarySlots] ?? 1;

  const primaryOptions = canAddPrimary
    ? primaryWeapons
        .map(
          (w) => `
        <div class="equip-row">
          <span class="weapon-name">${w.weaponType}</span>
          <button class="btn-small btn-equip" data-ship="${ship.id}" data-type="primary" data-storage="${w.storageIndex}" data-bank="${nextPrimaryBank}">
            Equip (×${nextPrimaryBank})
          </button>
        </div>
      `,
        )
        .join('')
    : '<div class="weapon-empty">All primary slots filled</div>';

  const secondaryOptions = canAddSecondary
    ? secondaryWeapons
        .map(
          (w) => `
        <div class="equip-row">
          <span class="weapon-name">${w.weaponType} [${w.count}]</span>
          <button class="btn-small btn-equip" data-ship="${ship.id}" data-type="secondary" data-storage="${w.storageIndex}" data-bank="${nextSecondaryBank}">
            Equip (×${nextSecondaryBank})
          </button>
        </div>
      `,
        )
        .join('')
    : '<div class="weapon-empty">All secondary slots filled</div>';

  if (primaryWeapons.length === 0 && secondaryWeapons.length === 0) {
    return '<div class="weapon-empty">No weapons in storage</div>';
  }

  return `
    <div class="equip-options">
      ${primaryWeapons.length > 0 ? `<div class="equip-section"><div class="weapon-label">Equip Primary</div>${primaryOptions}</div>` : ''}
      ${secondaryWeapons.length > 0 ? `<div class="equip-section"><div class="weapon-label">Equip Secondary</div>${secondaryOptions}</div>` : ''}
    </div>
  `;
}

/** Render hull swap options for any ship */
function renderHullSwapOptions(
  ship: OwnedShip,
  storedHulls: StoredHull[],
): string {
  // Ships require a pilot to swap hulls
  if (!ship.pilot) {
    return '';
  }

  if (storedHulls.length === 0) {
    return '';
  }

  const hullOptions = storedHulls
    .map((hull, index) => {
      const stats = SHIP_CLASSES[hull.shipClass];
      const maxHull = stats?.hull ?? 100;
      const currentHull = maxHull - hull.hullDamage;
      const hullPercent = Math.round((currentHull / maxHull) * 100);
      const damageNote = hull.hullDamage > 0 ? ` (${hullPercent}% hull)` : '';

      return `
        <div class="hull-swap-row">
          <span class="hull-name">${hull.shipClass}${damageNote}</span>
          <button class="btn-small btn-swap-hull" data-ship="${ship.id}" data-hull-index="${index}">
            Swap
          </button>
        </div>
      `;
    })
    .join('');

  return `
    <div class="hull-swap-section">
      <div class="storage-header">Swap to Different Hull</div>
      <div class="hull-swap-note">Current ship and weapons go to storage</div>
      ${hullOptions}
    </div>
  `;
}

/** Render unassign pilot option for ships with pilots */
function renderUnassignPilot(ship: OwnedShip): string {
  // Only show for ships with pilots
  if (!ship.pilot) {
    return '';
  }

  return `
    <div class="unassign-section">
      <button class="btn-small btn-danger btn-unassign" data-ship="${ship.id}">
        Unassign ${ship.pilot.name}
      </button>
      <div class="unassign-note">Returns pilot to pool, ship to storage</div>
    </div>
  `;
}

/** Render the full loadout panel for a selected ship */
export function renderLoadoutPanel(
  ship: OwnedShip,
  state: CampaignState,
): string {
  const stats = SHIP_CLASSES[ship.shipClass];
  const pilotName = ship.pilot?.name ?? 'No Pilot';

  return `
    <div class="loadout-panel">
      <div class="loadout-header">
        <span class="loadout-title">${pilotName}'s ${ship.shipClass}</span>
        <button class="btn-small btn-close" id="btn-close-loadout">✕</button>
      </div>
      <div class="loadout-stats">
        Hull: ${stats?.hull ?? '?'} | Shields: ${stats?.shields ?? '?'}
      </div>
      ${renderShipWeapons(ship, state)}
      <div class="loadout-divider"></div>
      <div class="storage-section">
        <div class="storage-header">Available in Storage</div>
        ${renderEquipOptions(ship, state.storedWeapons)}
        ${renderStoredAmmo(state)}
        ${renderStoredMissiles(state)}
      </div>
      ${renderHullSwapOptions(ship, state.storedHulls)}
      ${renderUnassignPilot(ship)}
    </div>
  `;
}
