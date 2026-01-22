/**
 * Squad Selection Modal - Pre-mission deployment interface.
 *
 * Allows player to select which ships to deploy before launching a mission.
 * Commander ship is always deployed (cannot be deselected).
 */

import {
  needsAttention,
  needsPrimaryAttention,
  needsSecondaryAttention,
} from '../../../campaign/resupply/resupply-constrained';
import {
  type CampaignState,
  type Contract,
  getDeploymentLimit,
  type OwnedShip,
} from '../../../campaign/types';
import { logError } from '../../../core/logger';
import { showError } from '../../common/notification';
import {
  renderPrimarySummary,
  renderSecondarySummary,
  renderShipItem,
} from '../../common/ship-item';
import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../../framework/screen';

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

/** Render checkbox toggle for ship selection */
function renderToggle(isCommander: boolean, isSelected: boolean): string {
  const stateClass = isCommander ? 'commander' : isSelected ? 'selected' : '';
  return `<div class="ship-item-toggle${stateClass ? ` ${stateClass}` : ''}" aria-hidden="true"></div>`;
}

/** Render a ship card */
function renderShipCard(
  ship: OwnedShip,
  isCommander: boolean,
  isSelected: boolean,
): string {
  const primaryLoadout = renderPrimarySummary(ship);
  const secondaryLoadout = renderSecondarySummary(ship);
  const showWarning = needsAttention(ship);
  const primaryWarning = needsPrimaryAttention(ship);
  const secondaryWarning = needsSecondaryAttention(ship);
  const warningBadge = showWarning
    ? '<span class="ship-item-warning" aria-label="Needs attention">!</span>'
    : '';

  const primaryClass = primaryWarning ? 'warning' : '';
  const secondaryClass = secondaryWarning ? 'warning' : '';
  const loadoutHtml = `
    <div class="ship-item-loadout-stack">
      <span class="ship-item-loadout primary ${primaryClass}">${primaryLoadout}</span>
      <span class="ship-item-loadout secondary ${secondaryClass}">${secondaryLoadout}</span>
    </div>
  `;
  return renderShipItem({
    ship,
    isCommander,
    isSelected,
    extraClasses: 'squad-card',
    dataAttrs: { 'ship-id': ship.id },
    beforeContent: renderToggle(isCommander, isSelected),
    iconContent: warningBadge,
    afterContent: loadoutHtml,
  });
}

/** Squad selection screen component */
const SquadSelectionScreen: Screen<SquadState, SquadProps> = {
  render(state, props) {
    const { campaignState, contract, commanderShipId } = props;
    const selectedSet = new Set(state.selectedIds);
    const selectedCount = selectedSet.size;
    const maxDeployment = getDeploymentLimit(campaignState.currentSector);

    // Get ships with non-injured pilots (can deploy), commander first
    // Injured pilots (injuredMissionsLeft > 0) cannot deploy until recovered
    const deployableShips = campaignState.ships
      .filter((s) => s.pilot !== null && s.pilot.injuredMissionsLeft <= 0)
      .sort((a, b) => {
        if (a.id === commanderShipId) return -1;
        if (b.id === commanderShipId) return 1;
        return 0;
      });

    // Render ship cards
    const shipCards = deployableShips
      .map((ship) => {
        const isCommander = ship.id === commanderShipId;
        const isSelected = selectedSet.has(ship.id);
        return renderShipCard(ship, isCommander, isSelected);
      })
      .join('');

    // Build capacity bar segments
    const capacitySegments = Array.from({ length: maxDeployment }, (_, i) => {
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
              <div class="capacity-bar" role="meter" aria-valuenow="${selectedCount}" aria-valuemin="0" aria-valuemax="${maxDeployment}">
                ${capacitySegments}
              </div>
              <div class="capacity-label"><span class="capacity-current">${selectedCount}</span>/${maxDeployment} ships</div>
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
    const { campaignState, commanderShipId, onComplete } = props;
    const root = api.getRoot();
    const maxDeployment = getDeploymentLimit(campaignState.currentSector);

    // Ship card clicks - direct DOM manipulation for smooth toggling
    api.on('.squad-card', 'click', (_e, el) => {
      const shipId = el.dataset.shipId;
      if (!shipId) return;

      // Don't allow deselecting commander
      if (shipId === commanderShipId) return;

      const state = api.getState();
      const selectedSet = new Set(state.selectedIds);
      const wasSelected = selectedSet.has(shipId);

      // Check if we can add more
      if (!wasSelected && selectedSet.size >= maxDeployment) return;

      // Toggle selection
      if (wasSelected) {
        selectedSet.delete(shipId);
      } else {
        selectedSet.add(shipId);
      }
      const isNowSelected = !wasSelected;
      const newCount = selectedSet.size;

      // Update state without re-render
      api.updateState({ selectedIds: Array.from(selectedSet) });

      // Update card classes
      el.classList.toggle('selected', isNowSelected);
      el.setAttribute('aria-selected', String(isNowSelected));

      // Update toggle inside card
      const toggle = el.querySelector('.ship-item-toggle');
      if (toggle) {
        toggle.classList.toggle('selected', isNowSelected);
      }

      // Update capacity bar segments
      const segments = root.querySelectorAll('.capacity-segment');
      segments.forEach((seg, i) => {
        seg.classList.toggle('filled', i < newCount);
      });

      // Update capacity count text
      const countEl = root.querySelector('.capacity-current');
      if (countEl) countEl.textContent = String(newCount);

      // Update capacity bar aria
      const capacityBar = root.querySelector('.capacity-bar');
      if (capacityBar)
        capacityBar.setAttribute('aria-valuenow', String(newCount));

      // Update launch button
      const launchBtn =
        root.querySelector<HTMLButtonElement>('#btn-squad-launch');
      if (launchBtn) launchBtn.disabled = newCount === 0;
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
  // Check if commander pilot exists
  const commanderPilot = state.pilots.find((p) => p.id === state.commanderId);
  if (!commanderPilot) {
    // This indicates state corruption - commander death should trigger game over
    logError('[Squad] Commander pilot not found - state corrupted', {
      commanderId: state.commanderId,
      pilotIds: state.pilots.map((p) => p.id),
    });
    showError(
      'Unable to launch mission. Please reload and report this bug.',
      5000,
    );
    return Promise.resolve({ confirmed: false, deployedShipIds: [] });
  }

  // Find commander ship
  const commanderShip = state.ships.find(
    (s) => s.pilot?.id === state.commanderId,
  );
  if (!commanderShip) {
    // Commander pilot exists but has no ship - also state corruption
    logError('[Squad] Commander has no ship - state corrupted', {
      commanderId: state.commanderId,
      shipPilotIds: state.ships.map((s) => s.pilot?.id),
    });
    showError(
      'Unable to launch mission. Please reload and report this bug.',
      5000,
    );
    return Promise.resolve({ confirmed: false, deployedShipIds: [] });
  }

  // Initialize selection: all ships with non-injured pilots, up to sector limit
  // Injured pilots cannot deploy until recovered
  const maxDeployment = getDeploymentLimit(state.currentSector);
  const initialSelectedIds = state.ships
    .filter((s) => s.pilot !== null && s.pilot.injuredMissionsLeft <= 0)
    .slice(0, maxDeployment)
    .map((s) => s.id);

  // Ensure commander is in selection
  if (!initialSelectedIds.includes(commanderShip.id)) {
    initialSelectedIds.unshift(commanderShip.id);
    if (initialSelectedIds.length > maxDeployment) {
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
