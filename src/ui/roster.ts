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
} from '../campaign/loadout';
import type { CampaignState, OwnedShip, Pilot } from '../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
  renderStatusDisplay,
} from './nav-bar';
import { getMaxHull } from './ship-card';
import { getShipAbbrev } from './ship-viewer';

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
    <div class="roster-pilot-card ${selectedClass} ${assignedClass} ${commanderClass}"
         data-pilot-id="${pilot.id}">
      <div class="roster-pilot-info">
        <div class="roster-pilot-name">${pilot.name}${skillText}</div>
        <div class="roster-pilot-status">${isAssigned ? 'Assigned' : 'Available'}</div>
      </div>
      <div class="roster-pilot-ship">${shipText}</div>
    </div>
  `;
}

/** Get available ships for pilot assignment (ships without pilots) */
function getAvailableShipsForPilot(state: CampaignState): OwnedShip[] {
  return state.ships.filter((s) => s.pilot === null);
}

/** Render pilot viewer with career stats and assignment options */
function renderPilotViewer(pilot: Pilot, state: CampaignState): string {
  const isCommander = pilot.id === state.commanderId;
  const isAssigned = state.ships.some((s) => s.pilot?.id === pilot.id);
  const currentShip = state.ships.find((s) => s.pilot?.id === pilot.id);
  const availableShips = getAvailableShipsForPilot(state);

  // Rank: "PLAYER" for commander, skill level for others
  const rankText = isCommander ? 'PLAYER' : pilot.skill.toUpperCase();

  // Unassign option when pilot is assigned
  const unassignOption =
    isAssigned && currentShip
      ? `
        <div class="pilot-assignment">
          <div class="assignment-row">
            <span class="assignment-label">Currently assigned:</span>
            <span class="assignment-ship">${currentShip.shipClass}</span>
          </div>
          <button class="btn btn-danger btn-unassign-pilot"
                  data-ship="${currentShip.id}"
                  data-pilot="${pilot.id}">
            Unassign
          </button>
        </div>
      `
      : '';

  // Available ships list for assignment
  const shipOptions =
    !isAssigned && availableShips.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Assign to ship:</div>
          <div class="assignment-options">
            ${availableShips
              .map(
                (ship) => `
              <button class="btn btn-assign-pilot"
                      data-pilot="${pilot.id}"
                      data-ship="${ship.id}">
                ${ship.shipClass}
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `
      : '';

  // Stored hulls for creating new ships
  const hullOptions =
    !isAssigned && state.storedHulls.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Deploy with hull:</div>
          <div class="hull-options">
            ${state.storedHulls
              .map((hull, index) => {
                const maxHull = getMaxHull(hull.shipClass);
                const currentHull = maxHull - hull.hullDamage;
                const hullPercent = Math.round((currentHull / maxHull) * 100);
                const abbrev = getShipAbbrev(hull.shipClass);
                const isDamaged = hull.hullDamage > 0;
                return `
              <button class="hull-card-btn"
                      data-pilot="${pilot.id}"
                      data-hull-index="${index}">
                <div class="hull-card-icon">
                  <span class="hull-abbrev">${abbrev}</span>
                </div>
                <div class="hull-card-name">${hull.shipClass}</div>
                <div class="hull-card-health ${isDamaged ? 'damaged' : ''}">
                  <div class="hull-bar">
                    <div class="hull-fill" style="width: ${hullPercent}%"></div>
                  </div>
                  <span class="hull-text">${hullPercent}%</span>
                </div>
              </button>
            `;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

  return `
    <div class="pilot-viewer">
      <div class="pilot-viewer-header">
        <div class="pilot-header-info">
          <div class="pilot-viewer-name">${pilot.name}</div>
          <div class="pilot-rank">${rankText}</div>
        </div>
        <div class="pilot-header-right">
          <button class="btn-close-viewer" id="btn-close-pilot-viewer">✕</button>
        </div>
      </div>

      <div class="pilot-viewer-stats">
        <div class="stat-row">
          <span class="stat-label">Missions Flown</span>
          <span class="stat-value">${pilot.missionsFlown}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Victories</span>
          <span class="stat-value">${pilot.missionsWon}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Kills</span>
          <span class="stat-value">${pilot.kills}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Assists</span>
          <span class="stat-value">${pilot.assists}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Damage Dealt</span>
          <span class="stat-value">${pilot.damageDealt.toLocaleString()}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Damage Received</span>
          <span class="stat-value">${pilot.damageReceived.toLocaleString()}</span>
        </div>
      </div>

      ${unassignOption}
      ${shipOptions}
      ${hullOptions}
    </div>
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
    : `<div class="empty-state-panel">Select a pilot to view details</div>`;

  return `
    ${navBar}
    ${renderStatusDisplay(state.credits, state.currentSector)}
    <div class="roster-screen">
      <div class="roster-layout">
        <!-- Left Column: Pilots List -->
        <div class="roster-list">
          <div class="panel-header">
            <span class="panel-icon">★</span> Pilots
            <span class="panel-count">${state.pilots.length}</span>
          </div>
          <div class="roster-pilots">
            ${pilotCards}
          </div>
        </div>

        <!-- Right Column: Pilot Viewer -->
        <div class="roster-viewer">
          ${rightPanel}
        </div>
      </div>
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
