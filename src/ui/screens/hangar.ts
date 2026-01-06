/**
 * Hangar screen - ship management and loadout configuration.
 *
 * Two-column layout:
 * [Ships List] | [Ship Viewer + Details]
 */

import type { CampaignState, OwnedShip } from '../../campaign/types';
import { SHIP_CLASSES } from '../../data/ships';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../common/nav-bar';
import {
  bindTooltip,
  hideTooltip,
  missileTooltipContent,
  weaponTooltipContent,
} from '../common/tooltip';
import { renderShipCard } from '../ship/card';
import { renderShipViewer } from '../ship/viewer';
import {
  closeWeaponPicker,
  handleUnequip,
  showWeaponPicker,
} from './hangar-equip';

/** Hangar UI state */
export interface HangarUI {
  element: HTMLElement;
  state: CampaignState;
  selectedShipId: string | null;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate?: (newState: CampaignState) => void;
}

/** Sort ships with commander's ship first */
function sortShipsCommanderFirst(
  ships: OwnedShip[],
  commanderId: string,
): OwnedShip[] {
  return [...ships].sort((a, b) => {
    const aIsCommander = a.pilot?.id === commanderId;
    const bIsCommander = b.pilot?.id === commanderId;
    if (aIsCommander && !bIsCommander) return -1;
    if (!aIsCommander && bIsCommander) return 1;
    return 0;
  });
}

/** Render ship details panel */
function renderShipDetails(ship: OwnedShip): string {
  const stats = SHIP_CLASSES[ship.shipClass.toLowerCase()];
  if (!stats) return '<div class="ship-details">Unknown ship class</div>';

  const maxHull = stats.hull;
  const currentHull = maxHull - ship.hullDamage;
  const hullPercent = Math.round((currentHull / maxHull) * 100);

  const primaryBankStr = stats.primaryBanks.join(', ');
  const secondaryBankStr = stats.secondaryBanks.join(', ');

  return `
    <div class="ship-details">
      <div class="ship-details-header">
        <span class="panel-icon">▦</span> Ship Stats
      </div>
      <div class="ship-details-stats">
        <div class="detail-row">
          <span class="detail-label">Hull</span>
          <span class="detail-value ${hullPercent < 100 ? 'damaged' : ''}">${currentHull}/${maxHull}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Shields</span>
          <span class="detail-value">${stats.shields} (+${stats.shieldRegen}/s)</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Speed</span>
          <span class="detail-value">${stats.maxSpeed} m/s</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Turn Rate</span>
          <span class="detail-value">${stats.turnRate}°/s</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Acceleration</span>
          <span class="detail-value">${stats.acceleration} m/s²</span>
        </div>
        <div class="detail-divider"></div>
        <div class="detail-row">
          <span class="detail-label">Primary Banks</span>
          <span class="detail-value">${stats.primaryBanks.length} (${primaryBankStr})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Secondary Banks</span>
          <span class="detail-value">${stats.secondaryBanks.length} (${secondaryBankStr})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Heat Capacity</span>
          <span class="detail-value">${stats.maxHeat}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cooling Rate</span>
          <span class="detail-value">${stats.coolingRate}/s</span>
        </div>
      </div>
    </div>
  `;
}

/** Render ship viewer with close button integrated in header */
function renderShipViewerWithClose(
  ship: Parameters<typeof renderShipViewer>[0],
  state: Parameters<typeof renderShipViewer>[1],
): string {
  const viewerHtml = renderShipViewer(ship, state);
  return viewerHtml.replace(
    '<div class="schematic-header-right"></div>',
    '<div class="schematic-header-right"><button class="btn-close-viewer" id="btn-close-viewer">✕</button></div>',
  );
}

/** Render the hangar screen content */
function renderHangar(
  state: CampaignState,
  selectedShipId: string | null,
  onNavigate: (destination: NavDestination) => void,
): string {
  // Sort ships with commander first
  const sortedShips = sortShipsCommanderFirst(state.ships, state.commanderId);

  const selectedShip = selectedShipId
    ? state.ships.find((s) => s.id === selectedShipId)
    : null;

  const navBar = renderNavBar({
    activeTab: 'hangar',
    credits: state.credits,
    sector: state.currentSector,
    onNavigate,
  });

  // Center panel: ship viewer or empty state
  const centerPanel = selectedShip
    ? `
      <section class="hangar-viewer" aria-label="Ship loadout viewer">
        ${renderShipViewerWithClose(selectedShip, state)}
      </section>
    `
    : `
      <div class="empty-state-panel" role="status" aria-label="No ship selected">
        Select a ship to view loadout
      </div>
    `;

  // Right column: Ship details when ship selected
  const rightColumn = selectedShip
    ? `<aside class="hangar-details" aria-label="Ship statistics">${renderShipDetails(selectedShip)}</aside>`
    : `<div class="hangar-details-placeholder" aria-hidden="true"></div>`;

  return `
    <div class="campaign-page">
      ${navBar}
      <main class="hangar-screen" aria-label="Hangar - Ship management">
      <div class="hangar-layout">
        <!-- Left Column: Ships List -->
        <aside class="hangar-ships" aria-label="Flight ships">
          <header class="panel-header">
            <span class="panel-icon" aria-hidden="true">◈</span>
            <span class="panel-title">Flight</span>
            <span class="panel-count" aria-label="${state.ships.length} ships">${state.ships.length}</span>
          </header>
          <div class="ship-list" role="list" aria-label="Available ships">
            ${sortedShips.map((s) => renderShipCard(s, s.id === selectedShipId, state.commanderId)).join('')}
          </div>
        </aside>

        <!-- Center Column: Ship Viewer or Placeholder -->
        ${centerPanel}

        <!-- Right Column: Ship Details -->
        ${rightColumn}
      </div>
    </main>
    </div>
  `;
}

/** Create hangar UI */
export function createHangarUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onStateUpdate?: (newState: CampaignState) => void,
): HangarUI {
  const ui: HangarUI = {
    element,
    state,
    selectedShipId: null,
    onNavigate,
  };

  if (onStateUpdate) ui.onStateUpdate = onStateUpdate;

  renderAndBindHangar(ui);
  return ui;
}

// Re-export NavDestination for external use
export type { NavDestination } from '../common/nav-bar';

/** Internal: render hangar and bind all events */
function renderAndBindHangar(ui: HangarUI): void {
  ui.element.innerHTML = renderHangar(
    ui.state,
    ui.selectedShipId,
    ui.onNavigate,
  );

  // Bind navigation bar
  bindNavBar(ui.element, ui.onNavigate);

  // Bind close viewer button
  const closeBtn = ui.element.querySelector('#btn-close-viewer');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      ui.selectedShipId = null;
      renderAndBindHangar(ui);
    });
  }

  // Bind ship selection
  ui.element.querySelectorAll('.ship-card').forEach((item) => {
    const el = item as HTMLElement;
    const shipId = el.dataset.shipId;

    el.addEventListener('click', () => {
      if (shipId) {
        const isSelected = ui.selectedShipId === shipId;
        ui.selectedShipId = isSelected ? null : shipId;
        hideTooltip();
        renderAndBindHangar(ui);
      }
    });
  });

  // Bind hardpoint slot interactions
  bindHardpointEvents(ui);
}

/** Bind hardpoint slot click and tooltip events */
function bindHardpointEvents(ui: HangarUI): void {
  ui.element.querySelectorAll('.schematic-slot').forEach((slot) => {
    const el = slot as HTMLElement;
    const weaponType = el.dataset.weapon;
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);

    // Tooltip for equipped weapons
    if (weaponType) {
      const contentFn =
        slotType === 'primary'
          ? () => weaponTooltipContent(weaponType)
          : () => missileTooltipContent(weaponType);
      bindTooltip(el, contentFn);
    }

    // Click to unequip (filled) or show equip picker (empty)
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!shipId || !slotType) return;

      const isFilled = el.classList.contains('filled');

      if (isFilled) {
        // Unequip weapon immediately
        hideTooltip(); // Hide before re-render (mouseleave won't fire)
        handleUnequip(ui.state, shipId, slotType, slotIndex, (newState) => {
          ui.state = newState;
          if (ui.onStateUpdate) ui.onStateUpdate(newState);
          closeWeaponPicker();
          renderAndBindHangar(ui);
        });
      } else {
        // Show weapon picker for this slot
        showWeaponPicker(
          el,
          ui.state,
          shipId,
          slotType,
          slotIndex,
          (newState) => {
            ui.state = newState;
            if (ui.onStateUpdate) ui.onStateUpdate(newState);
          },
          () => renderAndBindHangar(ui),
        );
      }
    });
  });
}

/** Update hangar UI with new state */
export function updateHangarUI(ui: HangarUI, state: CampaignState): void {
  ui.state = state;
  renderAndBindHangar(ui);
}
