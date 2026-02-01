/**
 * Squadron Ship Events - Ship operation handlers (change ship, resupply).
 *
 * Extracted from bind-events.ts to stay under 400 line limit.
 */

import {
  resupplyAllShipsConstrained,
  resupplyShipConstrained,
} from '../../../campaign/resupply/resupply-constrained';
import type { CampaignState } from '../../../campaign/types';
import {
  requestResupplyAction,
  requestResupplyAllAction,
  shouldUseActionRequest,
} from '../../../multiplayer/action-client';
import {
  canEditAnyShip,
  canEditShip,
} from '../../../multiplayer/context-permissions';
import { addResupplyMessage } from '../../../multiplayer/system-messages';
import { showNotification } from '../../common/notification';
import type { ScreenAPI } from '../../framework/screen';
import { showShipPicker } from '../ship-picker';
import type { SquadronProps, SquadronState } from './bind-events';
import type { ListSelection } from './list';

/** Helper to update campaign state and trigger re-render */
function updateCampaignState(
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
  newCampaignState: CampaignState,
  newSelection?: ListSelection,
): void {
  if (props.onStateUpdate) {
    props.onStateUpdate(newCampaignState);
  }
  if (newSelection !== undefined) {
    api.setState({ selection: newSelection });
  }
}

/** Bind ship operation events (change ship, resupply) */
export function bindShipEvents(
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
): void {
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
      if (shouldUseActionRequest()) {
        void requestResupplyAction(props.campaignState, shipId);
      }
      addResupplyMessage(ship?.shipClass ?? 'ship');
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

    // Check permission
    if (!canEditAnyShip()) {
      showNotification('You do not have permission to resupply ships', {
        type: 'warning',
      });
      return;
    }

    const result = resupplyAllShipsConstrained(
      props.campaignState,
      commanderId,
    );
    if (result.state !== props.campaignState) {
      updateCampaignState(api, props, result.state);
      if (shouldUseActionRequest()) {
        void requestResupplyAllAction(props.campaignState, commanderId);
      }
      addResupplyMessage('all ships', true);
      const type = result.success ? 'success' : 'warning';
      for (const msg of result.messages) {
        showNotification(msg, { type });
      }
    }
  });
}
