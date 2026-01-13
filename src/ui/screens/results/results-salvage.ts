/**
 * Salvage Section Rendering - Extracts salvage display from results screen.
 */

import type { SalvageResult } from '../../../campaign/salvage';
import {
  getAmmoDisplayName,
  getWeaponDisplayName,
} from '../../../data/weapons';

/** Render salvage section within rewards */
export function renderSalvageSection(salvage: SalvageResult | null): string {
  if (!salvage) {
    return `
      <div class="rewards-salvage">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">◈</span>
          <span class="rewards-section-title">SALVAGE</span>
        </div>
        <div class="salvage-empty">No salvage collected</div>
      </div>
    `;
  }

  const scrapEntries = Object.entries(salvage.scrap);
  const hasScrap = scrapEntries.length > 0;
  const hasWeapons = salvage.weapons.length > 0;
  const hasAmmo = salvage.ammo.length > 0;

  if (!hasScrap && !hasWeapons && !hasAmmo) {
    return `
      <div class="rewards-salvage">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">◈</span>
          <span class="rewards-section-title">SALVAGE</span>
        </div>
        <div class="salvage-empty">No salvage collected</div>
      </div>
    `;
  }

  // Render scrap
  const scrapHtml = hasScrap
    ? `
      <div class="salvage-category">
        <h3>Scrap</h3>
        ${scrapEntries
          .map(
            ([shipClass, count]) => `
          <div class="salvage-item">
            <span class="item-name">${shipClass.charAt(0).toUpperCase() + shipClass.slice(1)} Scrap</span>
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
        <h3>Weapons</h3>
        ${salvage.weapons
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
        <h3>Ammo</h3>
        ${salvage.ammo
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

  const totalValueStr = Math.floor(salvage.totalValue).toLocaleString();

  return `
    <div class="rewards-salvage">
      <div class="rewards-section-header">
        <span class="rewards-section-icon" aria-hidden="true">◈</span>
        <span class="rewards-section-title">SALVAGE</span>
        <span class="rewards-section-value">Est. Value: ~${totalValueStr} cr</span>
      </div>
      <div class="salvage-items">
        ${scrapHtml}
        ${weaponHtml}
        ${ammoHtml}
      </div>
    </div>
  `;
}
