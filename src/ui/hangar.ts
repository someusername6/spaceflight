/**
 * Hangar screen - displays player's squadron and allows loadout management.
 *
 * Phase 4.1: Read-only display of ships.
 * Future: Drag-drop equipment, pilot assignment.
 */

import { calculateResupplyCost } from '../campaign/state';
import type { CampaignState, OwnedShip } from '../campaign/types';
import { SHIP_CLASSES } from '../data/ships';

/** Hangar UI state */
export interface HangarUI {
  element: HTMLElement;
  onSelectContracts: () => void;
  onResupply?: () => void;
}

/** Get hull stats for a ship class */
function getMaxHull(shipClass: string): number {
  const stats = SHIP_CLASSES[shipClass];
  return stats?.hull ?? 100;
}

/** Calculate total resupply cost for all ships */
function getTotalResupplyCost(state: CampaignState): number {
  let total = 0;
  for (const ship of state.ships) {
    total += calculateResupplyCost(ship);
  }
  return total;
}

/** Render a single ship item */
function renderShipItem(ship: OwnedShip): string {
  const maxHull = getMaxHull(ship.shipClass);
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
      <div class="ship-icon">${ship.shipClass.substring(0, 3).toUpperCase()}</div>
      <div class="ship-info">
        <div class="ship-name">${pilotName}${pilotSkill}</div>
        <div class="ship-class">${ship.shipClass}</div>
        <div class="ship-status ${isDamaged ? 'damaged' : 'ok'}">
          Hull: ${hullPercent}%
          ${isDamaged ? `(${ship.hullDamage} damage)` : ''}
        </div>
      </div>
    </div>
  `;
}

/** Render the resupply button */
function renderResupplyButton(state: CampaignState): string {
  const cost = getTotalResupplyCost(state);
  const canAfford = state.credits >= cost && cost > 0;
  const disabled = !canAfford ? 'disabled' : '';

  if (cost === 0) {
    return `
      <button class="btn" disabled style="opacity: 0.5;">
        Fully Supplied
      </button>
    `;
  }

  return `
    <button class="btn ${canAfford ? '' : 'btn-disabled'}" id="btn-resupply" ${disabled}>
      Resupply (${cost} cr)
    </button>
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

    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
      ${renderResupplyButton(state)}
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
  onResupply?: () => void,
): HangarUI {
  element.innerHTML = renderHangar(state);

  // Bind button clicks
  const contractsBtn = element.querySelector('#btn-contracts');
  if (contractsBtn) {
    contractsBtn.addEventListener('click', onSelectContracts);
  }

  const resupplyBtn = element.querySelector('#btn-resupply');
  if (resupplyBtn && onResupply) {
    resupplyBtn.addEventListener('click', onResupply);
  }

  const ui: HangarUI = {
    element,
    onSelectContracts,
  };
  if (onResupply) {
    ui.onResupply = onResupply;
  }
  return ui;
}

/** Update hangar UI with new state */
export function updateHangarUI(ui: HangarUI, state: CampaignState): void {
  ui.element.innerHTML = renderHangar(state);

  // Re-bind button clicks
  const contractsBtn = ui.element.querySelector('#btn-contracts');
  if (contractsBtn) {
    contractsBtn.addEventListener('click', ui.onSelectContracts);
  }

  const resupplyBtn = ui.element.querySelector('#btn-resupply');
  if (resupplyBtn && ui.onResupply) {
    resupplyBtn.addEventListener('click', ui.onResupply);
  }
}
