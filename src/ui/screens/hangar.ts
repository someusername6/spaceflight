/**
 * Hangar screen - ship management and loadout configuration.
 *
 * Two-column layout:
 * [Ships List] | [Ship Viewer + Details]
 */

import type { CampaignState, OwnedShip } from '../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../common/nav-bar';
import { renderShipCard } from '../ship/card';
import { destroyShipConnectors, initShipConnectors } from '../ship/connectors';
import { renderShipStatsRows } from '../ship/stats';
import { renderShipViewer } from '../ship/viewer';
import {
  closeWeaponPicker,
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  showWeaponPicker,
  showWeaponPopover,
} from './hangar-equip';

/** Hangar UI state */
export interface HangarUI {
  element: HTMLElement;
  state: CampaignState;
  selectedShipId: string | null;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate?: (newState: CampaignState) => void;
  onViewPilot?: (pilotId: string) => void;
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
  const statsRows = renderShipStatsRows(ship.shipClass, {
    classPrefix: 'detail',
  });

  if (!statsRows) return '<div class="ship-details">Unknown ship class</div>';

  return `
    <div class="ship-details">
      <div class="ship-details-header">
        <span class="panel-icon">▦</span> Ship Stats
      </div>
      <div class="ship-details-stats">
        ${statsRows}
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
  initialShipId?: string,
  onViewPilot?: (pilotId: string) => void,
): HangarUI {
  const ui: HangarUI = {
    element,
    state,
    selectedShipId: initialShipId ?? null,
    onNavigate,
  };

  if (onStateUpdate) ui.onStateUpdate = onStateUpdate;
  if (onViewPilot) ui.onViewPilot = onViewPilot;

  renderAndBindHangar(ui);
  return ui;
}

// Re-export NavDestination for external use
export type { NavDestination } from '../common/nav-bar';

/** Internal: render hangar and bind all events */
function renderAndBindHangar(ui: HangarUI): void {
  // Clean up existing connectors before re-render
  const existingViewer = ui.element.querySelector('.ship-viewer');
  if (existingViewer) {
    destroyShipConnectors(existingViewer);
  }

  ui.element.innerHTML = renderHangar(
    ui.state,
    ui.selectedShipId,
    ui.onNavigate,
  );

  // Initialize connector lines for ship viewer
  const viewer = ui.element.querySelector('.ship-viewer');
  if (viewer) {
    initShipConnectors(viewer);
  }

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

  // Bind view pilot button
  const viewPilotBtn = ui.element.querySelector('.btn-view-pilot');
  if (viewPilotBtn && ui.onViewPilot) {
    viewPilotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pilotId = (e.target as HTMLElement).dataset.pilot;
      if (pilotId) {
        ui.onViewPilot?.(pilotId);
      }
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
        closeWeaponPicker();
        renderAndBindHangar(ui);
      }
    });
  });

  // Bind hardpoint slot interactions
  bindHardpointEvents(ui);
}

/** Bind hardpoint slot hover, click, and leave events */
function bindHardpointEvents(ui: HangarUI): void {
  ui.element.querySelectorAll('.schematic-slot').forEach((slot) => {
    const el = slot as HTMLElement;
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    const isFilled = el.classList.contains('filled');

    if (!shipId || !slotType) return;

    const ship = ui.state.ships.find((s) => s.id === shipId);
    if (!ship) return;

    if (isFilled) {
      // Filled slot: unified popover (hover to preview, click to pin)
      const weapon =
        slotType === 'primary'
          ? ship.primaryWeapons[slotIndex]
          : ship.secondaryWeapons[slotIndex];
      if (!weapon) return;

      // Hover: show popover preview
      el.addEventListener('mouseenter', () => {
        showWeaponPopover(
          el,
          ui.state,
          shipId,
          slotType,
          slotIndex,
          weapon,
          (newState) => {
            ui.state = newState;
            if (ui.onStateUpdate) ui.onStateUpdate(newState);
          },
          () => renderAndBindHangar(ui),
        );
      });

      // Click: pin the popover
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      el.addEventListener('mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    } else {
      // Empty slot: click to show picker
      el.addEventListener('click', (e) => {
        e.stopPropagation();
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
      });
    }
  });
}

/** Update hangar UI with new state */
export function updateHangarUI(ui: HangarUI, state: CampaignState): void {
  ui.state = state;
  renderAndBindHangar(ui);
}
