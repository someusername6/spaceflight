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
import { hirePilot } from '../../campaign/recruits';
import type { CampaignState, OwnedShip, Pilot } from '../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../common/nav-bar';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';
import { renderPilotViewer } from './pilot-viewer';
import { renderRecruitCard, renderRecruitViewer } from './recruit-viewer';

/** Roster UI state */
export interface RosterUI {
  element: HTMLElement;
  state: CampaignState;
  selectedPilotId: string | null;
  selectedRecruitId: string | null;
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

  // Show ship assignment with icon
  const shipDisplay = assignedShip
    ? `<img src="${getShipIconPath(assignedShip.shipClass)}" alt="${assignedShip.shipClass}" class="roster-ship-icon" onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'" />`
    : '<span class="roster-available">Available</span>';

  return `
    <article
      class="roster-pilot-card ${selectedClass} ${assignedClass} ${commanderClass}"
      data-pilot-id="${pilot.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${pilot.name}, ${isAssigned ? `assigned to ${assignedShip?.shipClass}` : 'available'}"
    >
      <div class="roster-pilot-info">
        <div class="roster-pilot-name">${pilot.name}</div>
        <div class="roster-pilot-status">${isAssigned ? 'Assigned' : 'Available'}</div>
      </div>
      <div class="roster-pilot-ship" aria-hidden="true">${shipDisplay}</div>
    </article>
  `;
}

/** Render the roster screen content */
function renderRoster(
  state: CampaignState,
  selectedPilotId: string | null,
  selectedRecruitId: string | null,
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

  const selectedRecruit = selectedRecruitId
    ? state.availableRecruits.find((r) => r.id === selectedRecruitId)
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

  // Recruit cards
  const recruitCards = state.availableRecruits
    .map((recruit) => {
      const isSelected = recruit.id === selectedRecruitId;
      const canAfford = state.credits >= recruit.price;
      return renderRecruitCard(recruit, isSelected, canAfford);
    })
    .join('');

  // Right panel: pilot viewer, recruit viewer, or empty state
  let rightPanel: string;
  if (selectedPilot) {
    rightPanel = renderPilotViewer(selectedPilot, state);
  } else if (selectedRecruit) {
    rightPanel = renderRecruitViewer(selectedRecruit, state);
  } else {
    rightPanel = `<div class="empty-state-panel" role="status">Select a pilot or recruit to view details</div>`;
  }

  return `
    <div class="campaign-page">
      ${navBar}
      <main class="roster-screen" aria-label="Roster - Pilot management">
        <div class="roster-layout">
          <!-- Left Column: Pilots List -->
          <aside class="roster-list" aria-label="Pilots list">
            <header class="panel-header">
              <span class="panel-icon" aria-hidden="true">★</span>
              <span class="panel-title">Your Pilots</span>
              <span class="panel-count" aria-label="${state.pilots.length} pilots">${state.pilots.length}</span>
            </header>
            <div class="roster-pilots" role="listbox" aria-label="Your pilots">
              ${pilotCards}
            </div>

            <!-- Recruits Section -->
            <div class="roster-section-divider" aria-hidden="true"></div>
            <header class="panel-header recruits-header">
              <span class="panel-icon" aria-hidden="true">+</span>
              <span class="panel-title">Recruits</span>
              <span class="panel-count" aria-label="${state.availableRecruits.length} available">${state.availableRecruits.length}</span>
            </header>
            <div class="roster-recruits" role="listbox" aria-label="Available recruits">
              ${recruitCards || '<div class="no-recruits">No recruits available</div>'}
            </div>
          </aside>

          <!-- Right Column: Pilot/Recruit Viewer -->
          <section class="roster-viewer" aria-label="Pilot details">
            ${rightPanel}
          </section>
        </div>
      </main>
    </div>
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
    selectedRecruitId: null,
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
    ui.selectedRecruitId,
    ui.onNavigate,
  );

  // Bind navigation bar
  bindNavBar(ui.element, ui.onNavigate);

  // Bind close viewer button (for pilots)
  const closePilotBtn = ui.element.querySelector('#btn-close-pilot-viewer');
  if (closePilotBtn) {
    closePilotBtn.addEventListener('click', () => {
      ui.selectedPilotId = null;
      renderAndBindRoster(ui);
    });
  }

  // Bind close viewer button (for recruits)
  const closeRecruitBtn = ui.element.querySelector('#btn-close-recruit-viewer');
  if (closeRecruitBtn) {
    closeRecruitBtn.addEventListener('click', () => {
      ui.selectedRecruitId = null;
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
        ui.selectedRecruitId = null; // Deselect recruit when selecting pilot
        renderAndBindRoster(ui);
      }
    });
  });

  // Bind recruit card selection
  ui.element.querySelectorAll('.recruit-card').forEach((item) => {
    const el = item as HTMLElement;
    const recruitId = el.dataset.recruitId;

    el.addEventListener('click', () => {
      if (recruitId) {
        const isSelected = ui.selectedRecruitId === recruitId;
        ui.selectedRecruitId = isSelected ? null : recruitId;
        ui.selectedPilotId = null; // Deselect pilot when selecting recruit
        renderAndBindRoster(ui);
      }
    });
  });

  // Bind hire recruit button
  const hireBtn = ui.element.querySelector('#btn-hire-recruit');
  if (hireBtn) {
    hireBtn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const recruitId = target.dataset.recruitId;
      if (!recruitId) return;

      // Find the recruit name before updating state
      const recruit = ui.state.availableRecruits.find(
        (r) => r.id === recruitId,
      );
      if (!recruit) return;
      const recruitName = recruit.name;

      const newState = hirePilot(ui.state, recruitId);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Select the newly hired pilot by name
        const hiredPilot = newState.pilots.find((p) => p.name === recruitName);
        ui.selectedRecruitId = null;
        ui.selectedPilotId = hiredPilot?.id ?? null;
        renderAndBindRoster(ui);
      }
    });
  }

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
