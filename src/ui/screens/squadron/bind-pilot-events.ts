/**
 * Squadron Pilot Events - Pilot operation handlers.
 *
 * Handles: assign, unassign, hire, dismiss, upgrade skill, deploy stored ship.
 * Extracted from bind-events.ts to stay under 400 line limit.
 */

import {
  assignPilotToShip,
  assignPilotToStoredShip,
  unassignPilot,
} from '../../../campaign/loadout';
import { dismissPilot } from '../../../campaign/pilot-assignment';
import { spendXPOnShip } from '../../../campaign/pilot-skills';
import { hirePilot } from '../../../campaign/recruits';
import type { CampaignState } from '../../../campaign/types';
import {
  requestAssignPilotAction,
  requestDeployStoredShipAction,
  requestDismissPilotAction,
  requestSpendXPAction,
  shouldUseActionRequest,
} from '../../../multiplayer/action-client';
import {
  canEditAnyShip,
  canEditShip,
  isHost,
} from '../../../multiplayer/context-permissions';
import { showNotification } from '../../common/notification';
import type { ScreenAPI } from '../../framework/screen';
import { showConfirm } from '../confirm-modal';
import type { SquadronProps, SquadronState } from './bind-events';
import type { ListSelection } from './list';
import type { ViewerTab } from './viewer';

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

/** Bind pilot operation events */
export function bindPilotEvents(
  api: ScreenAPI<SquadronState>,
  props: SquadronProps,
): void {
  // Assign pilot to ship
  api.on('.btn-assign-pilot', 'click', (e, el) => {
    e.stopPropagation();
    const pilotId = el.dataset.pilot;
    const shipId = el.dataset.ship;
    if (!pilotId || !shipId) return;

    // Check permission
    if (!canEditAnyShip()) {
      showNotification('You do not have permission to assign pilots', {
        type: 'warning',
      });
      return;
    }

    const newState = assignPilotToShip(props.campaignState, pilotId, shipId);
    if (newState !== props.campaignState) {
      updateCampaignState(
        api,
        props,
        newState,
        { type: 'deployed', id: shipId },
        'loadout',
      );
      if (shouldUseActionRequest()) {
        void requestAssignPilotAction(props.campaignState, pilotId, shipId);
      }
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

    // Check permission
    if (!canEditAnyShip()) {
      showNotification('You do not have permission to deploy ships', {
        type: 'warning',
      });
      return;
    }

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
      if (shouldUseActionRequest()) {
        void requestDeployStoredShipAction(
          props.campaignState,
          pilotId,
          storedShipIndex,
        );
      }
    }
  });

  // Hire recruit (host only)
  api.on('#btn-hire-recruit', 'click', (_e, el) => {
    const recruitId = el.dataset.recruitId;
    if (!recruitId) return;

    // Only host can hire recruits
    if (!isHost()) {
      showNotification('Only the host can hire recruits', { type: 'warning' });
      return;
    }

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

  // Dismiss pilot (host only)
  api.on('.btn-dismiss-pilot', 'click', async (_e, el) => {
    const pilotId = el.dataset.pilotId;
    const pilotName = el.dataset.pilotName ?? 'this pilot';
    if (!pilotId) return;

    // Only host can dismiss pilots
    if (!isHost()) {
      showNotification('Only the host can dismiss pilots', { type: 'warning' });
      return;
    }

    // Confirmation dialog
    const confirmed = await showConfirm(
      'Dismiss Pilot?',
      `Dismiss ${pilotName}? This cannot be undone.`,
      { confirmText: 'Dismiss', danger: true },
    );
    if (!confirmed) return;

    try {
      const newState = dismissPilot(props.campaignState, pilotId);
      if (newState !== props.campaignState) {
        updateCampaignState(api, props, newState, { type: 'none', id: null });
        if (shouldUseActionRequest()) {
          void requestDismissPilotAction(props.campaignState, pilotId);
        }
        showNotification(`${pilotName} has been dismissed`, { type: 'info' });
      }
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'Cannot dismiss pilot',
        { type: 'error' },
      );
    }
  });

  // Upgrade/unlock ship skill (host only)
  api.on('.btn-upgrade-skill', 'click', (_e, el) => {
    const pilotId = el.dataset.pilotId;
    const shipClass = el.dataset.shipClass;
    if (!pilotId || !shipClass) return;

    // Only host can spend XP
    if (!isHost()) {
      showNotification('Only the host can upgrade pilot skills', {
        type: 'warning',
      });
      return;
    }

    const pilot = props.campaignState.pilots.find((p) => p.id === pilotId);
    if (!pilot) return;

    try {
      const updatedPilot = spendXPOnShip(pilot, shipClass);
      const newState = {
        ...props.campaignState,
        pilots: props.campaignState.pilots.map((p) =>
          p.id === pilotId ? updatedPilot : p,
        ),
        // Also update pilot in ships (denormalized data)
        ships: props.campaignState.ships.map((s) =>
          s.pilot?.id === pilotId ? { ...s, pilot: updatedPilot } : s,
        ),
      };

      updateCampaignState(api, props, newState);

      if (shouldUseActionRequest()) {
        void requestSpendXPAction(props.campaignState, pilotId, shipClass);
      }

      const actionLabel = pilot.shipSkills[shipClass] ? 'upgraded' : 'unlocked';
      showNotification(`${pilot.name} ${actionLabel} ${shipClass} skill`, {
        type: 'success',
      });
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'Cannot upgrade skill',
        { type: 'error' },
      );
    }
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
}
