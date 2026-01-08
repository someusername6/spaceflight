/**
 * Squad Selection Modal - Pre-mission deployment interface.
 *
 * Allows player to select which ships to deploy before launching a mission.
 * Commander ship is always deployed (cannot be deselected).
 */

import type { CampaignState, Contract, OwnedShip } from '../../campaign/types';
import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';

/** Maximum ships that can be deployed */
const MAX_DEPLOYMENT = 4;

/** Result of squad selection */
export interface SquadSelectionResult {
  confirmed: boolean;
  deployedShipIds: string[];
}

/** Squad selection state */
interface SquadState {
  selectedIds: string[];
}

/** Squad selection props */
interface SquadProps extends ModalProps<SquadSelectionResult> {
  campaignState: CampaignState;
  contract: Contract;
  commanderShipId: string;
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

/** Squad selection screen component */
const SquadSelectionScreen: Screen<SquadState, SquadProps> = {
  render(state, props) {
    const { campaignState, contract, commanderShipId } = props;
    const selectedSet = new Set(state.selectedIds);
    const selectedCount = selectedSet.size;

    // Get ships with pilots (can deploy)
    const deployableShips = campaignState.ships.filter((s) => s.pilot !== null);

    // Render ship cards
    const shipCards = deployableShips
      .map((ship) => {
        const isCommander = ship.id === commanderShipId;
        const isSelected = selectedSet.has(ship.id);
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
  },

  bind(api: ScreenAPI<SquadState>, props: SquadProps) {
    const { commanderShipId, onComplete } = props;

    // Ship card clicks
    api.on('.squad-ship-card', 'click', (_e, el) => {
      const shipId = el.dataset.shipId;
      if (!shipId) return;

      // Don't allow deselecting commander
      if (shipId === commanderShipId) return;

      const state = api.getState();
      const selectedSet = new Set(state.selectedIds);

      if (selectedSet.has(shipId)) {
        selectedSet.delete(shipId);
      } else if (selectedSet.size < MAX_DEPLOYMENT) {
        selectedSet.add(shipId);
      }

      api.setState({ selectedIds: Array.from(selectedSet) });
    });

    // Cancel button
    api.on('#btn-squad-cancel', 'click', () => {
      onComplete({ confirmed: false, deployedShipIds: [] });
    });

    // Launch button
    api.on('#btn-squad-launch', 'click', () => {
      const state = api.getState();
      onComplete({ confirmed: true, deployedShipIds: state.selectedIds });
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        onComplete({ confirmed: false, deployedShipIds: [] });
      }
    });
  },
};

/** Show squad selection modal and return selected ship IDs */
export function showSquadSelection(
  state: CampaignState,
  contract: Contract,
): Promise<SquadSelectionResult> {
  // Find commander ship
  const commanderShip = state.ships.find(
    (s) => s.pilot?.id === state.commanderId,
  );
  if (!commanderShip) {
    // No commander, shouldn't happen but handle gracefully
    return Promise.resolve({ confirmed: false, deployedShipIds: [] });
  }

  // Initialize selection: all ships with pilots, up to MAX_DEPLOYMENT
  const initialSelectedIds = state.ships
    .filter((s) => s.pilot !== null)
    .slice(0, MAX_DEPLOYMENT)
    .map((s) => s.id);

  // Ensure commander is in selection
  if (!initialSelectedIds.includes(commanderShip.id)) {
    initialSelectedIds.unshift(commanderShip.id);
    if (initialSelectedIds.length > MAX_DEPLOYMENT) {
      initialSelectedIds.pop();
    }
  }

  const initialState: SquadState = {
    selectedIds: initialSelectedIds,
  };

  return showModal<SquadState, SquadProps, SquadSelectionResult>(
    SquadSelectionScreen,
    initialState,
    {
      campaignState: state,
      contract,
      commanderShipId: commanderShip.id,
    },
  );
}
