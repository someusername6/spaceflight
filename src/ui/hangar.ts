/**
 * Hangar screen - displays player's squadron and allows loadout management.
 *
 * Phase 4.1: Read-only display of ships.
 * Future: Drag-drop equipment, pilot assignment.
 */

import type { CampaignState, OwnedShip } from '../campaign/types';
import { SHIP_ARCHETYPES } from '../factories/ship-archetypes';

/** Hangar UI state */
export interface HangarUI {
  element: HTMLElement;
  onSelectContracts: () => void;
}

/** Get hull stats for a ship archetype */
function getMaxHull(archetype: string): number {
  const stats = SHIP_ARCHETYPES[archetype];
  return stats?.hull ?? 100;
}

/** Render a single ship item */
function renderShipItem(ship: OwnedShip): string {
  const maxHull = getMaxHull(ship.archetype);
  const currentHull = maxHull - ship.hullDamage;
  const hullPercent = Math.round((currentHull / maxHull) * 100);
  const isDamaged = ship.hullDamage > 0;

  const pilotName = ship.isPlayerShip
    ? 'You'
    : (ship.pilot?.name ?? 'No Pilot');

  const pilotSkill = ship.isPlayerShip
    ? ''
    : ship.pilot
      ? ` (${ship.pilot.skill})`
      : '';

  return `
    <div class="ship-item" data-ship-id="${ship.id}">
      <div class="ship-icon">${ship.archetype.substring(0, 3).toUpperCase()}</div>
      <div class="ship-info">
        <div class="ship-name">${pilotName}${pilotSkill}</div>
        <div class="ship-archetype">${ship.archetype}</div>
        <div class="ship-status ${isDamaged ? 'damaged' : 'ok'}">
          Hull: ${hullPercent}%
          ${isDamaged ? `(${ship.hullDamage} damage)` : ''}
        </div>
      </div>
    </div>
  `;
}

/** Render the hangar screen content */
function renderHangar(state: CampaignState): string {
  const playerShip = state.ships.find((s) => s.isPlayerShip);
  const wingmen = state.ships.filter((s) => !s.isPlayerShip);

  return `
    <div class="credits-display">${state.credits}</div>

    <h1>Hangar</h1>
    <h2>Your Squadron</h2>

    <div class="screen-panel">
      <div class="screen-panel-header">
        <span>Ships (${state.ships.length})</span>
        <span>Sector ${state.currentSector}</span>
      </div>

      <div class="ship-list">
        ${playerShip ? renderShipItem(playerShip) : ''}
        ${wingmen.map(renderShipItem).join('')}
      </div>
    </div>

    <div style="margin-top: 20px;">
      <button class="btn btn-primary" id="btn-contracts">
        Select Contract →
      </button>
    </div>
  `;
}

/** Create hangar UI */
export function createHangarUI(
  element: HTMLElement,
  state: CampaignState,
  onSelectContracts: () => void,
): HangarUI {
  element.innerHTML = renderHangar(state);

  // Bind button click
  const btn = element.querySelector('#btn-contracts');
  if (btn) {
    btn.addEventListener('click', onSelectContracts);
  }

  return {
    element,
    onSelectContracts,
  };
}

/** Update hangar UI with new state */
export function updateHangarUI(ui: HangarUI, state: CampaignState): void {
  ui.element.innerHTML = renderHangar(state);

  // Re-bind button click
  const btn = ui.element.querySelector('#btn-contracts');
  if (btn) {
    btn.addEventListener('click', ui.onSelectContracts);
  }
}
