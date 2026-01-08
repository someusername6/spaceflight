/**
 * Squad Selection Modal - Pre-mission deployment interface.
 *
 * Allows player to select which ships to deploy before launching a mission.
 * Commander ship is always deployed (cannot be deselected).
 */

import type { CampaignState, Contract, OwnedShip } from '../../campaign/types';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';

/** Maximum ships that can be deployed */
const MAX_DEPLOYMENT = 4;

/** Result of squad selection */
export interface SquadSelectionResult {
  confirmed: boolean;
  deployedShipIds: string[];
}

/** Render loadout summary for a ship */
function renderLoadoutSummary(ship: OwnedShip): string {
  const parts: string[] = [];

  // Primary weapons
  for (const primary of ship.primaryWeapons) {
    if (primary) {
      parts.push(primary.weaponType);
    }
  }

  // Secondary weapons with count
  for (const secondary of ship.secondaryWeapons) {
    if (secondary && secondary.count > 0) {
      parts.push(`${secondary.weaponType} x${secondary.count}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'No weapons';
}

/** Render a ship card */
function renderShipCard(
  ship: OwnedShip,
  isCommander: boolean,
  isSelected: boolean,
): string {
  const pilot = ship.pilot;
  if (!pilot) return '';

  const iconPath = getShipIconPath(ship.shipClass);

  const cardClasses = [
    'squad-ship-card',
    isCommander ? 'commander' : '',
    isSelected ? 'selected' : 'unselected',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <article
      class="${cardClasses}"
      data-ship-id="${ship.id}"
      role="checkbox"
      aria-checked="${isSelected}"
      aria-label="${pilot.name}, ${ship.shipClass}${isCommander ? ', your ship' : ''}"
      tabindex="0"
    >
      <div class="squad-toggle" aria-hidden="true"></div>

      <img src="${iconPath}" alt="${ship.shipClass}" class="squad-ship-icon" onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'" />

      <div class="squad-ship-info">
        <div class="squad-ship-names">
          <div class="squad-ship-name-row">
            <span class="squad-ship-pilot">${pilot.name}</span>
            ${isCommander ? '<span class="squad-badge you">You</span>' : ''}
          </div>
          <span class="squad-ship-class">${ship.shipClass}</span>
        </div>
        <span class="squad-ship-loadout">${renderLoadoutSummary(ship)}</span>
      </div>
    </article>
  `;
}

/** Render the squad selection modal */
function renderModal(
  state: CampaignState,
  contract: Contract,
  selectedIds: Set<string>,
): string {
  // Get ships with pilots (can deploy)
  const deployableShips = state.ships.filter((s) => s.pilot !== null);
  const selectedCount = selectedIds.size;

  // Render ship cards
  const shipCards = deployableShips
    .map((ship) => {
      const isCommander = ship.pilot?.id === state.commanderId;
      const isSelected = selectedIds.has(ship.id);
      return renderShipCard(ship, isCommander, isSelected);
    })
    .join('');

  // Build capacity bar segments
  const capacitySegments = Array.from({ length: MAX_DEPLOYMENT }, (_, i) => {
    const filled = i < selectedCount;
    return `<div class="capacity-segment${filled ? ' filled' : ''}"></div>`;
  }).join('');

  return `
    <div class="squad-selection-overlay" role="dialog" aria-modal="true" aria-labelledby="squad-title">
      <div class="squad-selection-modal">
        <header class="squad-header panel-header">
          <h2 class="squad-title" id="squad-title">${contract.name}</h2>
        </header>

        <div class="squad-content">
          <div class="squad-ship-list" role="group" aria-label="Available ships">
            ${shipCards}
          </div>
        </div>

        <footer class="squad-footer">
          <div class="squad-capacity">
            <div class="capacity-bar" role="meter" aria-valuenow="${selectedCount}" aria-valuemin="0" aria-valuemax="${MAX_DEPLOYMENT}">
              ${capacitySegments}
            </div>
            <div class="capacity-label"><span class="capacity-current">${selectedCount}</span>/${MAX_DEPLOYMENT} ships</div>
          </div>
          <div class="squad-footer-actions">
            <button class="btn btn-large" id="btn-squad-cancel">Cancel</button>
            <button
              class="btn btn-large btn-success"
              id="btn-squad-launch"
              ${selectedCount === 0 ? 'disabled' : ''}
            >
              <span class="launch-icon">&#9654;</span>
              Launch Mission
            </button>
          </div>
        </footer>
      </div>
    </div>
  `;
}

/** Show squad selection modal and return selected ship IDs */
export function showSquadSelection(
  state: CampaignState,
  contract: Contract,
): Promise<SquadSelectionResult> {
  return new Promise((resolve) => {
    // Find commander ship
    const commanderShip = state.ships.find(
      (s) => s.pilot?.id === state.commanderId,
    );
    if (!commanderShip) {
      // No commander, shouldn't happen but handle gracefully
      resolve({ confirmed: false, deployedShipIds: [] });
      return;
    }

    // Initialize selection: commander always selected, all wingmen selected by default
    const selectedIds = new Set<string>(
      state.ships
        .filter((s) => s.pilot !== null)
        .slice(0, MAX_DEPLOYMENT)
        .map((s) => s.id),
    );

    // Ensure commander is selected
    selectedIds.add(commanderShip.id);

    // Create container
    const container = document.createElement('div');
    container.innerHTML = renderModal(state, contract, selectedIds);
    document.body.appendChild(container);

    // Focus management
    const modal = container.querySelector('.squad-selection-modal');
    if (modal instanceof HTMLElement) {
      modal.focus();
    }

    /** Update UI without full re-render to avoid flash */
    const updateUI = () => {
      // Update each ship card's classes
      container.querySelectorAll('.squad-ship-card').forEach((card) => {
        const el = card as HTMLElement;
        const shipId = el.dataset.shipId;
        if (!shipId) return;

        const isSelected = selectedIds.has(shipId);
        el.classList.toggle('selected', isSelected);
        el.classList.toggle('unselected', !isSelected);
        el.setAttribute('aria-checked', String(isSelected));
      });

      // Update capacity bar segments
      const segments = container.querySelectorAll('.capacity-segment');
      segments.forEach((seg, i) => {
        seg.classList.toggle('filled', i < selectedIds.size);
      });

      // Update capacity label
      const currentEl = container.querySelector('.capacity-current');
      if (currentEl) {
        currentEl.textContent = String(selectedIds.size);
      }

      // Update capacity bar aria
      const capacityBar = container.querySelector('.capacity-bar');
      if (capacityBar) {
        capacityBar.setAttribute('aria-valuenow', String(selectedIds.size));
      }

      // Update launch button
      const launchBtn = container.querySelector(
        '#btn-squad-launch',
      ) as HTMLButtonElement;
      if (launchBtn) {
        launchBtn.disabled = selectedIds.size === 0;
      }
    };

    /** Handle ship card click */
    const handleCardClick = (shipId: string) => {
      // Don't allow deselecting commander
      if (commanderShip.id === shipId) return;

      if (selectedIds.has(shipId)) {
        selectedIds.delete(shipId);
      } else if (selectedIds.size < MAX_DEPLOYMENT) {
        selectedIds.add(shipId);
      }

      updateUI();
    };

    /** Cleanup event listeners */
    const cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
      container.remove();
    };

    /** Handle cancel */
    const handleCancel = () => {
      cleanup();
      resolve({ confirmed: false, deployedShipIds: [] });
    };

    /** Handle launch */
    const handleLaunch = () => {
      cleanup();
      resolve({
        confirmed: true,
        deployedShipIds: Array.from(selectedIds),
      });
    };

    /** Handle keyboard */
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    /** Bind all event handlers */
    const bindEvents = () => {
      // Ship card clicks
      container.querySelectorAll('.squad-ship-card').forEach((card) => {
        const el = card as HTMLElement;
        const shipId = el.dataset.shipId;
        if (!shipId) return;

        el.addEventListener('click', () => handleCardClick(shipId));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(shipId);
          }
        });
      });

      // Cancel button
      const cancelBtn = container.querySelector('#btn-squad-cancel');
      cancelBtn?.addEventListener('click', handleCancel);

      // Launch button
      const launchBtn = container.querySelector('#btn-squad-launch');
      launchBtn?.addEventListener('click', handleLaunch);

      // Keyboard handler
      document.addEventListener('keydown', handleKeydown);
    };

    // Initial bind
    bindEvents();
  });
}
