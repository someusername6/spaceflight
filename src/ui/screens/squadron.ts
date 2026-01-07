/**
 * Squadron screen - unified pilot and ship management interface.
 *
 * Three-column layout:
 * [Unified List] | [Tabbed Viewer] | [Ship Stats]
 *
 * Unified list shows:
 * - DEPLOYED: Pilot-ship pairs (with weapon status)
 * - AVAILABLE: Unassigned pilots
 * - RECRUITS: Hireable pilots
 *
 * Tabbed viewer for deployed pairs:
 * - [LOADOUT] tab: Ship hardpoint editor
 * - [PILOT] tab: Pilot career stats
 */

import type { CampaignState, OwnedShip } from '../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../common/nav-bar';
import { destroyShipConnectors, initShipConnectors } from '../ship/connectors';
import { renderShipStatsRows } from '../ship/stats';
import { renderShipViewer } from '../ship/viewer';
import { renderPilotViewer } from './pilot-viewer';
import { renderRecruitViewer } from './recruit-viewer';
import { closeShipPicker } from './ship-picker';
import {
  bindChangeShipButton,
  bindGoToStore,
  bindHardpointEvents,
  bindHireRecruit,
  bindListSelection,
  bindPilotAssignment,
  bindUnassignPilot,
} from './squadron-bindings';
import { type ListSelection, renderSquadronList } from './squadron-list';
import {
  bindViewerTabs,
  renderViewerWithTabs,
  type ViewerTab,
} from './squadron-viewer';

/** Squadron UI state */
export interface SquadronUI {
  element: HTMLElement;
  state: CampaignState;
  selection: ListSelection;
  activeTab: ViewerTab;
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

/** Render ship viewer with action buttons */
function renderShipViewerWithActions(
  ship: OwnedShip,
  state: CampaignState,
): string {
  let viewerHtml = renderShipViewer(ship, state);

  // Build header right content with buttons
  const headerButtons = ship.pilot
    ? `<div class="schematic-header-right">
        <button class="btn btn-small btn-change-ship" data-pilot="${ship.pilot.id}" data-ship="${ship.id}">Change Ship</button>
       </div>`
    : '';

  viewerHtml = viewerHtml.replace(
    '<div class="schematic-header-right"></div>',
    headerButtons,
  );

  return viewerHtml;
}

/** Render the squadron screen content */
function renderSquadron(ui: SquadronUI): string {
  const { state, selection, activeTab, onNavigate } = ui;

  // Sort ships with commander first
  const sortedShips = sortShipsCommanderFirst(state.ships, state.commanderId);

  // Find selected items
  const selectedShip =
    selection.type === 'deployed' || selection.type === 'ship'
      ? state.ships.find((s) => s.id === selection.id)
      : null;

  const selectedPilot =
    selection.type === 'available'
      ? state.pilots.find((p) => p.id === selection.id)
      : null;

  const selectedRecruit =
    selection.type === 'recruit'
      ? state.availableRecruits.find((r) => r.id === selection.id)
      : null;

  const navBar = renderNavBar({
    activeTab: 'squadron',
    credits: state.credits,
    sector: state.currentSector,
    onNavigate,
  });

  // Build unified list
  const listHtml = renderSquadronList(
    sortedShips,
    state.pilots,
    state.availableRecruits,
    state.commanderId,
    state.credits,
    selection,
  );

  // Build center panel based on selection
  let centerPanel: string;
  if (selection.type === 'deployed' && selectedShip) {
    // Deployed pilot-ship pair: show tabbed viewer
    centerPanel = renderViewerWithTabs(
      selectedShip,
      state,
      activeTab,
      renderShipViewerWithActions,
      renderPilotViewer,
    );
  } else if (selection.type === 'available' && selectedPilot) {
    // Available pilot: show pilot viewer (with assignment options)
    centerPanel = `
      <section class="squadron-viewer" aria-label="Pilot details">
        ${renderPilotViewer(selectedPilot, state)}
      </section>
    `;
  } else if (selection.type === 'recruit' && selectedRecruit) {
    // Recruit: show recruit viewer (with hire option)
    centerPanel = `
      <section class="squadron-viewer" aria-label="Recruit details">
        ${renderRecruitViewer(selectedRecruit, state)}
      </section>
    `;
  } else {
    // No selection
    centerPanel = `
      <div class="empty-state-panel" role="status" aria-label="No selection">
        Select a pilot or ship to view details
      </div>
    `;
  }

  // Right column: Ship details when viewing deployed or available pilot's ship
  const showDetails = selection.type === 'deployed' && selectedShip;
  const rightColumn = showDetails
    ? `<aside class="squadron-details" aria-label="Ship statistics">${renderShipDetails(selectedShip)}</aside>`
    : `<div class="squadron-details-placeholder" aria-hidden="true"></div>`;

  return `
    <div class="campaign-page">
      ${navBar}
      <main class="squadron-screen" aria-label="Squadron - Pilot and ship management">
        <div class="squadron-layout">
          <!-- Left Column: Unified List -->
          ${listHtml}

          <!-- Center Column: Viewer -->
          ${centerPanel}

          <!-- Right Column: Ship Details -->
          ${rightColumn}
        </div>
      </main>
    </div>
  `;
}

/** Create squadron UI */
export function createSquadronUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onStateUpdate?: (newState: CampaignState) => void,
  initialSelection?: ListSelection,
): SquadronUI {
  const ui: SquadronUI = {
    element,
    state,
    selection: initialSelection ?? { type: 'none', id: null },
    activeTab: 'loadout',
    onNavigate,
  };

  if (onStateUpdate) ui.onStateUpdate = onStateUpdate;

  renderAndBindSquadron(ui);
  return ui;
}

// Re-export NavDestination for external use
export type { NavDestination } from '../common/nav-bar';
export type { ListSelection } from './squadron-list';

/** Internal: render squadron and bind all events */
function renderAndBindSquadron(ui: SquadronUI): void {
  // Close any open pickers before re-render
  closeShipPicker();

  // Clean up existing connectors before re-render
  const existingViewer = ui.element.querySelector('.ship-viewer');
  if (existingViewer) {
    destroyShipConnectors(existingViewer);
  }

  ui.element.innerHTML = renderSquadron(ui);

  // Initialize connector lines for ship viewer
  const viewer = ui.element.querySelector('.ship-viewer');
  if (viewer) {
    initShipConnectors(viewer);
  }

  // Bind navigation bar
  bindNavBar(ui.element, ui.onNavigate);

  // Bind viewer tabs
  bindViewerTabs(ui.element, (tab) => {
    ui.activeTab = tab;
    renderAndBindSquadron(ui);
  });

  // Create rerender callback for binding functions
  const rerender = () => renderAndBindSquadron(ui);

  // Bind list selection
  bindListSelection(ui, rerender);

  // Bind change ship button
  bindChangeShipButton(ui, rerender);

  // Bind hardpoint events (for loadout editing)
  bindHardpointEvents(ui, rerender);

  // Bind pilot assignment buttons
  bindPilotAssignment(ui, rerender);

  // Bind recruit hire button
  bindHireRecruit(ui, rerender);

  // Bind go to store button
  bindGoToStore(ui);

  // Bind unassign pilot button
  bindUnassignPilot(ui, rerender);
}

/** Update squadron UI with new state */
export function updateSquadronUI(ui: SquadronUI, state: CampaignState): void {
  ui.state = state;
  renderAndBindSquadron(ui);
}
