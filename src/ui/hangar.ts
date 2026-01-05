/**
 * Hangar screen - displays player's squadron and allows loadout management.
 */

import { assignPilotToHull } from '../campaign/loadout';
import { calculateResupplyCost } from '../campaign/state';
import type { CampaignState, OwnedShip } from '../campaign/types';
import { SHIP_CLASSES } from '../data/ships';
import { renderInventory } from './hangar-inventory';
import {
  bindScrapConversionEvents,
  renderScrapConversion,
} from './hangar-scrap';
import { bindLoadoutEvents, renderLoadoutPanel } from './loadout';

/** Hangar UI state */
export interface HangarUI {
  element: HTMLElement;
  state: CampaignState;
  selectedShipId: string | null;
  onSelectContracts: () => void;
  onStore?: () => void;
  onResupply?: () => void;
  onStateUpdate?: (newState: CampaignState) => void;
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
function renderShipItem(ship: OwnedShip, isSelected: boolean): string {
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

  const selectedClass = isSelected ? 'selected' : '';

  return `
    <div class="ship-item ${selectedClass}" data-ship-id="${ship.id}">
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

/** Render deploy pilot section (when pilots and hulls available) */
function renderDeployPilot(state: CampaignState): string {
  if (state.pilots.length === 0 || state.storedHulls.length === 0) {
    return '';
  }

  // Create a grid of pilot × hull options
  const deployOptions: string[] = [];
  state.pilots.forEach((pilot, pilotIndex) => {
    state.storedHulls.forEach((hull, hullIndex) => {
      const stats = SHIP_CLASSES[hull.shipClass];
      const maxHull = stats?.hull ?? 100;
      const hullPercent = Math.round(
        ((maxHull - hull.hullDamage) / maxHull) * 100,
      );
      const damageNote = hull.hullDamage > 0 ? ` (${hullPercent}%)` : '';

      deployOptions.push(`
        <div class="deploy-row">
          <span class="deploy-info">${pilot.name} → ${hull.shipClass}${damageNote}</span>
          <button class="btn-small btn-deploy" data-pilot="${pilotIndex}" data-hull="${hullIndex}">
            Deploy
          </button>
        </div>
      `);
    });
  });

  return `
    <div class="screen-panel deploy-panel">
      <div class="screen-panel-header">Deploy New Wingman</div>
      <div class="deploy-note">Combine pilot + hull (ship starts with empty loadout)</div>
      ${deployOptions.join('')}
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
function renderHangar(
  state: CampaignState,
  selectedShipId: string | null,
): string {
  const playerShip = state.ships.find((s) => s.isPlayerShip);
  const wingmen = state.ships.filter((s) => !s.isPlayerShip);

  return `
    <div class="credits-display">${state.credits}</div>

    <h1>Hangar</h1>
    <h2>Your Squadron</h2>

    <div class="hangar-layout">
      <div class="hangar-main">
        <div class="screen-panel">
          <div class="screen-panel-header">
            <span>Ships (${state.ships.length}) - Click to edit loadout</span>
            <span>Sector ${state.currentSector}</span>
          </div>

          <div class="ship-list">
            ${playerShip ? renderShipItem(playerShip, playerShip.id === selectedShipId) : ''}
            ${wingmen.map((s) => renderShipItem(s, s.id === selectedShipId)).join('')}
          </div>
        </div>

        ${renderInventory(state)}
        ${renderDeployPilot(state)}
        ${renderScrapConversion(state)}

        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${renderResupplyButton(state)}
          <button class="btn" id="btn-store">
            Equipment Store
          </button>
          <button class="btn btn-primary" id="btn-contracts">
            Select Contract →
          </button>
        </div>
      </div>

      <div class="hangar-sidebar" id="loadout-panel-container">
        <!-- Loadout panel renders here when ship selected -->
      </div>
    </div>
  `;
}

/** Create hangar UI */
export function createHangarUI(
  element: HTMLElement,
  state: CampaignState,
  onSelectContracts: () => void,
  onStore?: () => void,
  onResupply?: () => void,
  onStateUpdate?: (newState: CampaignState) => void,
): HangarUI {
  const ui: HangarUI = {
    element,
    state,
    selectedShipId: null,
    onSelectContracts,
  };

  if (onStore) ui.onStore = onStore;
  if (onResupply) ui.onResupply = onResupply;
  if (onStateUpdate) ui.onStateUpdate = onStateUpdate;

  renderAndBindHangar(ui);
  return ui;
}

/** Internal: render hangar and bind all events */
function renderAndBindHangar(ui: HangarUI): void {
  ui.element.innerHTML = renderHangar(ui.state, ui.selectedShipId);

  // Bind contracts button
  const contractsBtn = ui.element.querySelector('#btn-contracts');
  if (contractsBtn) {
    contractsBtn.addEventListener('click', ui.onSelectContracts);
  }

  // Bind store button
  const storeBtn = ui.element.querySelector('#btn-store');
  if (storeBtn && ui.onStore) {
    storeBtn.addEventListener('click', ui.onStore);
  }

  // Bind resupply button
  const resupplyBtn = ui.element.querySelector('#btn-resupply');
  if (resupplyBtn && ui.onResupply) {
    resupplyBtn.addEventListener('click', ui.onResupply);
  }

  // Bind ship selection
  ui.element.querySelectorAll('.ship-item').forEach((item) => {
    item.addEventListener('click', () => {
      const shipId = (item as HTMLElement).dataset.shipId;
      if (shipId) {
        ui.selectedShipId = shipId === ui.selectedShipId ? null : shipId;
        renderAndBindHangar(ui);
      }
    });
  });

  // Bind deploy pilot buttons
  ui.element.querySelectorAll('.btn-deploy').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const pilotIndex = Number.parseInt(target.dataset.pilot ?? '0', 10);
      const hullIndex = Number.parseInt(target.dataset.hull ?? '0', 10);

      const newState = assignPilotToHull(ui.state, pilotIndex, hullIndex);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        renderAndBindHangar(ui);
      }
    });
  });

  // Bind scrap conversion buttons
  bindScrapConversionEvents(
    ui.element,
    ui.state,
    (newState) => {
      ui.state = newState;
      if (ui.onStateUpdate) ui.onStateUpdate(newState);
    },
    () => renderAndBindHangar(ui),
  );

  // Render loadout panel if ship selected
  const panelContainer = ui.element.querySelector('#loadout-panel-container');
  if (panelContainer && ui.selectedShipId) {
    const ship = ui.state.ships.find((s) => s.id === ui.selectedShipId);
    if (ship) {
      const handleStateUpdate = (newState: CampaignState) => {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        renderAndBindHangar(ui);
      };
      const handleClose = () => {
        ui.selectedShipId = null;
        renderAndBindHangar(ui);
      };

      panelContainer.innerHTML = renderLoadoutPanel(ship, ui.state);
      bindLoadoutEvents(
        panelContainer as HTMLElement,
        ui.state,
        handleStateUpdate,
        handleClose,
      );
    }
  }
}

/** Update hangar UI with new state */
export function updateHangarUI(ui: HangarUI, state: CampaignState): void {
  ui.state = state;
  renderAndBindHangar(ui);
}
