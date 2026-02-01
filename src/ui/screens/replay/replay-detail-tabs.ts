/**
 * Replay Detail Tabs - Renders tab content for the replay detail panel.
 *
 * Three tabs:
 * - Deploy: Ships deployed at mission start
 * - Debrief: Combat statistics and weapon breakdowns
 * - Salvage: Items recovered after mission
 */

import {
  getAmmoDisplayName,
  getWeaponDisplayName,
} from '../../../data/weapons';
import type {
  AnyReplayData,
  ReplayPrimaryWeapon,
  ReplaySecondaryWeapon,
  ReplayShipLoadout,
} from '../../../replay/types';
import { escapeHtml } from '../../utils';
import { getShipSvgInline } from '../../utils/inline-svg';

// Debrief tab rendering extracted to separate module
export { renderDebriefTab } from './replay-debrief-render';

// ============================================================================
// Shared Utilities
// ============================================================================

/** Capitalize first letter */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Render bank size indicator */
function renderBankIndicator(size: number, cssClass: string): string {
  const symbol = cssClass === 'secondary' ? '◆' : '●';
  return `<span class="bank-indicator ${cssClass}">${symbol.repeat(size)}</span>`;
}

// ============================================================================
// Deploy Tab
// ============================================================================

/** Render primary weapons summary */
function renderPrimaryWeapons(weapons: ReplayPrimaryWeapon[]): string {
  if (weapons.length === 0) return '<span class="no-weapons">No primary</span>';
  return weapons
    .map((w) => {
      const indicator = renderBankIndicator(w.bankSize, 'primary');
      const name = capitalize(w.weaponId);
      if (w.ammo !== undefined && w.maxAmmo !== undefined) {
        return `${indicator} ${name} (${w.ammo}/${w.maxAmmo})`;
      }
      return `${indicator} ${name}`;
    })
    .join(', ');
}

/** Render secondary weapons summary */
function renderSecondaryWeapons(weapons: ReplaySecondaryWeapon[]): string {
  const armed = weapons.filter((w) => w.ammo > 0);
  if (armed.length === 0) return '<span class="no-weapons">No secondary</span>';
  return armed
    .map((w) => {
      const indicator = renderBankIndicator(w.bankSize, 'secondary');
      const name = capitalize(w.weaponId);
      return `${indicator} ${name} (${w.ammo}/${w.maxAmmo})`;
    })
    .join(', ');
}

/** Render a single ship card for the deploy tab */
function renderDeployShip(
  loadout: ReplayShipLoadout,
  pilotName: string,
  isPlayer: boolean,
): string {
  const svg = getShipSvgInline(loadout.shipClass);
  const badge = isPlayer ? '<span class="replay-loadout-badge">You</span>' : '';
  const primary = renderPrimaryWeapons(loadout.primaryWeapons);
  const secondary = renderSecondaryWeapons(loadout.secondaryWeapons);

  return `
    <div class="replay-loadout-ship">
      <div class="replay-loadout-icon">${svg}</div>
      <div class="replay-loadout-info">
        <div class="replay-loadout-header">
          <span class="replay-loadout-pilot">${escapeHtml(pilotName)}</span>
          ${badge}
        </div>
        <span class="replay-loadout-class">${capitalize(loadout.shipClass)}</span>
        <div class="replay-loadout-weapons">
          <div class="replay-loadout-primary">${primary}</div>
          <div class="replay-loadout-secondary">${secondary}</div>
        </div>
      </div>
    </div>
  `;
}

/** Render Deploy tab content */
export function renderDeployTab(replay: AnyReplayData): string {
  const ships: string[] = [];

  // Player ship (always first)
  ships.push(renderDeployShip(replay.playerLoadout, 'Commander', true));

  // Wingmen
  for (const wingman of replay.wingmen) {
    const pilotName = wingman.pilotName ?? 'Wingman';
    ships.push(renderDeployShip(wingman.loadout, pilotName, false));
  }

  return `
    <div class="replay-tab-content replay-deploy-tab">
      <div class="replay-loadout-list">
        ${ships.join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// Salvage Tab
// ============================================================================

/** Render Salvage tab content */
export function renderSalvageTab(replay: AnyReplayData): string {
  // Check for v1 replays without salvage data
  if (replay.salvageData === undefined) {
    return `
      <div class="replay-tab-content replay-salvage-tab">
        <div class="replay-tab-empty">
          <p>Salvage data not available</p>
          <p class="hint">This replay was recorded before salvage data was saved.</p>
        </div>
      </div>
    `;
  }

  // No salvage (defeat or no kills)
  if (replay.salvageData === null) {
    return `
      <div class="replay-tab-content replay-salvage-tab">
        <div class="replay-tab-empty">
          <p>No salvage collected</p>
          <p class="hint">Salvage is only collected on victory.</p>
        </div>
      </div>
    `;
  }

  const { scrap, weapons, ammo, totalValue } = replay.salvageData;
  const scrapEntries = Object.entries(scrap);
  const hasScrap = scrapEntries.length > 0;
  const hasWeapons = weapons.length > 0;
  const hasAmmo = ammo.length > 0;

  if (!hasScrap && !hasWeapons && !hasAmmo) {
    return `
      <div class="replay-tab-content replay-salvage-tab">
        <div class="replay-tab-empty">
          <p>No salvage collected</p>
        </div>
      </div>
    `;
  }

  // Render scrap
  const scrapHtml = hasScrap
    ? `
      <div class="salvage-category">
        <h4>Scrap</h4>
        ${scrapEntries
          .map(
            ([shipClass, count]) => `
          <div class="salvage-item">
            <span class="item-name">${capitalize(shipClass)} Scrap</span>
            <span class="item-count">×${count}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    `
    : '';

  // Render weapons
  const weaponHtml = hasWeapons
    ? `
      <div class="salvage-category">
        <h4>Weapons</h4>
        ${weapons
          .map(
            (w) => `
          <div class="salvage-item">
            <span class="item-name">${getWeaponDisplayName(w.weaponType)}</span>
            <span class="item-category">${w.category}</span>
            ${w.count > 1 ? `<span class="item-count">×${w.count}</span>` : ''}
          </div>
        `,
          )
          .join('')}
      </div>
    `
    : '';

  // Render ammo
  const ammoHtml = hasAmmo
    ? `
      <div class="salvage-category">
        <h4>Ammo</h4>
        ${ammo
          .map(
            (a) => `
          <div class="salvage-item">
            <span class="item-name">${getAmmoDisplayName(a.weaponType)}</span>
            <span class="item-count">×${a.count}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    `
    : '';

  const totalValueStr = Math.floor(totalValue).toLocaleString();

  return `
    <div class="replay-tab-content replay-salvage-tab">
      <div class="replay-salvage-header">
        <span class="total-value">Est. Value: ~${totalValueStr} cr</span>
      </div>
      <div class="salvage-items">
        ${scrapHtml}
        ${weaponHtml}
        ${ammoHtml}
      </div>
    </div>
  `;
}
