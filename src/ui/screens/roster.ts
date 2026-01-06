/**
 * Roster screen - pilot management interface.
 *
 * Two-column layout:
 * [Pilots List] | [Pilot Viewer]
 */

import {
  assignPilotToHull,
  assignPilotToShip,
  unassignPilot,
} from '../../campaign/loadout';
import type { CampaignState, OwnedShip, Pilot } from '../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
  renderStatusDisplay,
} from '../common/nav-bar';
import { renderPilotViewer } from './pilot-viewer';

/** Roster UI state */
export interface RosterUI {
  element: HTMLElement;
  state: CampaignState;
  selectedPilotId: string | null;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate?: (newState: CampaignState) => void;
}

/** Render a pilot card in the pilots list */
function renderPilotCard(
  pilot: Pilot,
  isSelected: boolean,
  isCommander: boolean,
  isAssigned: boolean,
  assignedShip: OwnedShip | undefined,
): string {
  const selectedClass = isSelected ? 'selected' : '';
  const assignedClass = isAssigned ? 'assigned' : 'unassigned';
  const commanderClass = isCommander ? 'commander-pilot' : '';

  // Show skill for non-commanders
  const skillText = isCommander ? '' : ` • ${pilot.skill}`;

  // Show ship assignment
  const shipText = assignedShip ? assignedShip.shipClass : 'Available';

  return `
    <article
      class="roster-pilot-card ${selectedClass} ${assignedClass} ${commanderClass}"
      data-pilot-id="${pilot.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${pilot.name}${skillText}, ${isAssigned ? `assigned to ${shipText}` : 'available'}"
    >
      <div class="roster-pilot-info">
        <div class="roster-pilot-name">${pilot.name}${skillText}</div>
        <div class="roster-pilot-status">${isAssigned ? 'Assigned' : 'Available'}</div>
      </div>
      <div class="roster-pilot-ship" aria-hidden="true">${shipText}</div>
    </article>
  `;
}

/** Render the roster screen content */
function renderRoster(
  state: CampaignState,
  selectedPilotId: string | null,
  onNavigate: (destination: NavDestination) => void,
): string {
  const assignedPilotIds = new Map<string, OwnedShip>();
  for (const ship of state.ships) {
    if (ship.pilot) {
      assignedPilotIds.set(ship.pilot.id, ship);
    }
  }

  const selectedPilot = selectedPilotId
    ? state.pilots.find((p) => p.id === selectedPilotId)
    : null;

  const navBar = renderNavBar({
    activeTab: 'roster',
    credits: state.credits,
    sector: state.currentSector,
    onNavigate,
  });

  // Pilot cards
  const pilotCards = state.pilots
    .map((pilot) => {
      const isSelected = pilot.id === selectedPilotId;
      const isCommander = pilot.id === state.commanderId;
      const assignedShip = assignedPilotIds.get(pilot.id);
      const isAssigned = !!assignedShip;
      return renderPilotCard(
        pilot,
        isSelected,
        isCommander,
        isAssigned,
        assignedShip,
      );
    })
    .join('');

  // Right panel: pilot viewer or empty state
  const rightPanel = selectedPilot
    ? renderPilotViewer(selectedPilot, state)
    : `<div class="empty-state-panel" role="status">Select a pilot to view details</div>`;

  return `
    ${navBar}
    ${renderStatusDisplay(state.credits, state.currentSector)}
    <main class="roster-screen" aria-label="Roster - Pilot management">
      <div class="roster-layout">
        <!-- Left Column: Pilots List -->
        <aside class="roster-list" aria-label="Pilots list">
          <header class="panel-header">
            <span class="panel-icon" aria-hidden="true">★</span>
            <span class="panel-title">Pilots</span>
            <span class="panel-count" aria-label="${state.pilots.length} pilots">${state.pilots.length}</span>
          </header>
          <div class="roster-pilots" role="listbox" aria-label="Available pilots">
            ${pilotCards}
          </div>
        </aside>

        <!-- Right Column: Pilot Viewer -->
        <section class="roster-viewer" aria-label="Pilot details">
          ${rightPanel}
        </section>
      </div>
    </main>
  `;
}

/** Create roster UI */
export function createRosterUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onStateUpdate?: (newState: CampaignState) => void,
): RosterUI {
  const ui: RosterUI = {
    element,
    state,
    selectedPilotId: null,
    onNavigate,
  };

  if (onStateUpdate) ui.onStateUpdate = onStateUpdate;

  renderAndBindRoster(ui);
  return ui;
}

/** Internal: render roster and bind all events */
function renderAndBindRoster(ui: RosterUI): void {
  ui.element.innerHTML = renderRoster(
    ui.state,
    ui.selectedPilotId,
    ui.onNavigate,
  );

  // Bind navigation bar
  bindNavBar(ui.element, ui.onNavigate);

  // Bind close viewer button
  const closeBtn = ui.element.querySelector('#btn-close-pilot-viewer');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      ui.selectedPilotId = null;
      renderAndBindRoster(ui);
    });
  }

  // Bind pilot card selection
  ui.element.querySelectorAll('.roster-pilot-card').forEach((item) => {
    const el = item as HTMLElement;
    const pilotId = el.dataset.pilotId;

    el.addEventListener('click', () => {
      if (pilotId) {
        const isSelected = ui.selectedPilotId === pilotId;
        ui.selectedPilotId = isSelected ? null : pilotId;
        renderAndBindRoster(ui);
      }
    });
  });

  // Bind unassign pilot buttons
  ui.element.querySelectorAll('.btn-unassign-pilot').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const pilotId = target.dataset.pilot;
      if (!shipId) return;

      const newState = unassignPilot(ui.state, shipId);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Keep pilot selected
        if (pilotId) {
          ui.selectedPilotId = pilotId;
        }
        renderAndBindRoster(ui);
      }
    });
  });

  // Bind assign pilot to ship buttons
  ui.element.querySelectorAll('.btn-assign-pilot').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const pilotId = target.dataset.pilot;
      const shipId = target.dataset.ship;
      if (!pilotId || !shipId) return;

      const newState = assignPilotToShip(ui.state, pilotId, shipId);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Keep pilot selected to show assignment
        ui.selectedPilotId = pilotId;
        renderAndBindRoster(ui);
      }
    });
  });

  // Bind deploy with hull buttons
  ui.element.querySelectorAll('.hull-card-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const button = (e.target as HTMLElement).closest(
        '.hull-card-btn',
      ) as HTMLElement;
      if (!button) return;
      const pilotId = button.dataset.pilot;
      const hullIndex = Number.parseInt(button.dataset.hullIndex ?? '0', 10);
      if (!pilotId) return;

      const newState = assignPilotToHull(ui.state, pilotId, hullIndex);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Keep pilot selected
        ui.selectedPilotId = pilotId;
        renderAndBindRoster(ui);
      }
    });
  });
}

/** Update roster UI with new state */
export function updateRosterUI(ui: RosterUI, state: CampaignState): void {
  ui.state = state;
  renderAndBindRoster(ui);
}
