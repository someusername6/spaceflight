/**
 * Squadron Event Bindings - Event handlers for squadron screen.
 *
 * Extracted from squadron.ts to stay under 400 line limit.
 */

import {
  assignPilotToShip,
  assignPilotToStoredShip,
  unassignPilot,
} from '../../../campaign/loadout';
import { hirePilot } from '../../../campaign/recruits';
import {
  resupplyAllShipsConstrained,
  resupplyShipConstrained,
} from '../../../campaign/resupply/resupply-constrained';
import type { CampaignState } from '../../../campaign/types';
import { canEditShip } from '../../../multiplayer/context-permissions';
import type { NavDestination } from '../../common/nav-bar';
import { showNotification } from '../../common/notification';
import type { ScreenAPI } from '../../framework/screen';
import { closePopovers } from '../popover-layer';
import { showShipPicker } from '../ship-picker';
import { bindHardpointEvents } from './hardpoint';
import type { ListSelection } from './list';
import type { ViewerTab } from './viewer';

/** Squadron screen state */
export interface SquadronState {
  selection: ListSelection;
  activeTab: ViewerTab;
}

/** Squadron screen props */
export interface SquadronProps {
  campaignState: CampaignState;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate?: ((newState: CampaignState) => void) | undefined;
}

/** Helper to update campaign state and trigger re-render */
function updateCampaignState(
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
  newCampaignState: CampaignState,
  newSelection?: ListSelection,
  newActiveTab?: ViewerTab,
): void {
  if (props.onStateUpdate) {
    props.onStateUpdate(newCampaignState);
  }
  if (newSelection !== undefined || newActiveTab !== undefined) {
    api.setState({
      ...(newSelection !== undefined && { selection: newSelection }),
      ...(newActiveTab !== undefined && { activeTab: newActiveTab }),
    });
  }
}

/** Bind all squadron screen events */
export function bindSquadronEvents(
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
  element: HTMLElement,
): void {
  const { onNavigate } = props;

  // List selection - deployed ships
  api.on('.ship-item[data-deployed-id]', 'click', (_e, el) => {
    const shipId = el.dataset.deployedId;
    if (shipId) {
      const currentState = api.getState();
      const isSelected =
        currentState.selection.type === 'deployed' &&
        currentState.selection.id === shipId;
      const newSelection: ListSelection = isSelected
        ? { type: 'none', id: null }
        : { type: 'deployed', id: shipId };
      closePopovers();
      api.setState({ selection: newSelection, activeTab: 'loadout' });
    }
  });

  // List selection - available pilots
  api.on('.ship-item[data-pilot-id]', 'click', (_e, el) => {
    const pilotId = el.dataset.pilotId;
    if (pilotId) {
      const currentState = api.getState();
      const isSelected =
        currentState.selection.type === 'available' &&
        currentState.selection.id === pilotId;
      const newSelection: ListSelection = isSelected
        ? { type: 'none', id: null }
        : { type: 'available', id: pilotId };
      api.setState({ selection: newSelection });
    }
  });

  // List selection - recruits
  api.on('.ship-item[data-recruit-id]', 'click', (_e, el) => {
    const recruitId = el.dataset.recruitId;
    if (recruitId) {
      const currentState = api.getState();
      const isSelected =
        currentState.selection.type === 'recruit' &&
        currentState.selection.id === recruitId;
      const newSelection: ListSelection = isSelected
        ? { type: 'none', id: null }
        : { type: 'recruit', id: recruitId };
      api.setState({ selection: newSelection });
    }
  });

  // Change ship button
  api.on('.btn-change-ship', 'click', (e, el) => {
    e.stopPropagation();
    const pilotId = el.dataset.pilot;
    const shipId = el.dataset.ship;
    if (!pilotId || !shipId) return;

    // Check permission
    if (!canEditShip(pilotId)) {
      showNotification('You do not have permission to change this ship', {
        type: 'warning',
      });
      return;
    }

    showShipPicker(
      el,
      pilotId,
      shipId,
      props.campaignState,
      (newState) => {
        const newShip = newState.ships.find((s) => s.pilot?.id === pilotId);
        const newSelection: ListSelection = newShip
          ? { type: 'deployed', id: newShip.id }
          : { type: 'available', id: pilotId };
        updateCampaignState(api, props, newState, newSelection);
      },
      () => api.setState({}),
    );
  });

  // Resupply ship button
  api.on('.btn-resupply-ship', 'click', (e, el) => {
    e.stopPropagation();
    const shipId = el.dataset.ship;
    if (!shipId) return;

    // Check permission
    const ship = props.campaignState.ships.find((s) => s.id === shipId);
    if (!canEditShip(ship?.pilot?.id ?? null)) {
      showNotification('You do not have permission to resupply this ship', {
        type: 'warning',
      });
      return;
    }

    const result = resupplyShipConstrained(props.campaignState, shipId);
    if (result.state !== props.campaignState) {
      updateCampaignState(api, props, result.state);
      const type = result.success ? 'success' : 'warning';
      for (const msg of result.messages) {
        showNotification(msg, { type });
      }
    }
  });

  // Resupply all button
  api.on('.btn-resupply-all', 'click', (e, el) => {
    e.stopPropagation();
    const commanderId = el.dataset.commander;
    if (!commanderId) return;

    const result = resupplyAllShipsConstrained(
      props.campaignState,
      commanderId,
    );
    if (result.state !== props.campaignState) {
      updateCampaignState(api, props, result.state);
      const type = result.success ? 'success' : 'warning';
      for (const msg of result.messages) {
        showNotification(msg, { type });
      }
    }
  });

  // Assign pilot to ship
  api.on('.btn-assign-pilot', 'click', (e, el) => {
    e.stopPropagation();
    const pilotId = el.dataset.pilot;
    const shipId = el.dataset.ship;
    if (!pilotId || !shipId) return;

    const newState = assignPilotToShip(props.campaignState, pilotId, shipId);
    if (newState !== props.campaignState) {
      updateCampaignState(
        api,
        props,
        newState,
        { type: 'deployed', id: shipId },
        'loadout',
      );
    }
  });

  // Deploy pilot with stored ship
  api.on('.stored-ship-card-btn', 'click', (e, el) => {
    e.stopPropagation();
    const pilotId = el.dataset.pilot;
    const storedShipIndex = Number.parseInt(
      el.dataset.storedShipIndex ?? '0',
      10,
    );
    if (!pilotId) return;

    const newState = assignPilotToStoredShip(
      props.campaignState,
      pilotId,
      storedShipIndex,
    );
    if (newState !== props.campaignState) {
      const newShip = newState.ships.find((s) => s.pilot?.id === pilotId);
      if (newShip) {
        updateCampaignState(
          api,
          props,
          newState,
          { type: 'deployed', id: newShip.id },
          'loadout',
        );
      } else {
        updateCampaignState(api, props, newState);
      }
    }
  });

  // Hire recruit
  api.on('#btn-hire-recruit', 'click', (_e, el) => {
    const recruitId = el.dataset.recruitId;
    if (!recruitId) return;

    const recruit = props.campaignState.availableRecruits.find(
      (r) => r.id === recruitId,
    );
    if (!recruit) return;
    const recruitName = recruit.name;

    const newState = hirePilot(props.campaignState, recruitId);
    if (newState !== props.campaignState) {
      const hiredPilot = newState.pilots.find((p) => p.name === recruitName);
      const newSelection: ListSelection = hiredPilot
        ? { type: 'available', id: hiredPilot.id }
        : { type: 'none', id: null };
      updateCampaignState(api, props, newState, newSelection);
    }
  });

  // Go to store
  api.on('.btn-go-to-store', 'click', () => {
    onNavigate('store');
  });

  // Unassign pilot
  api.on('.btn-unassign-pilot', 'click', (e, el) => {
    e.stopPropagation();
    const pilotId = el.dataset.pilot;
    const shipId = el.dataset.ship;
    if (!pilotId || !shipId) return;

    // Check permission
    if (!canEditShip(pilotId)) {
      showNotification('You do not have permission to unassign this pilot', {
        type: 'warning',
      });
      return;
    }

    const newState = unassignPilot(props.campaignState, shipId);
    if (newState !== props.campaignState) {
      updateCampaignState(api, props, newState, {
        type: 'available',
        id: pilotId,
      });
    }
  });

  // Hardpoint events (uses non-bubbling events, needs special handling)
  bindHardpointEvents(element, props);

  // Weapon badge tooltip positioning (fixed positioning needs JS)
  const TOOLTIP_OFFSET = 12; // Matches --space-3
  api.on('.weapon-badge', 'mouseenter', (_e, el) => {
    const tooltip = el.querySelector<HTMLElement>('.weapon-tooltip');
    if (!tooltip) return;

    const rect = el.getBoundingClientRect();
    tooltip.style.top = `${rect.top + rect.height / 2}px`;
    tooltip.style.left = `${rect.right + TOOLTIP_OFFSET}px`;
    tooltip.style.transform = 'translateY(-50%)';
  });
}
