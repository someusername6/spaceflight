/**
 * Squadron Event Bindings - Event handlers for squadron screen.
 *
 * Main orchestration file that delegates to specialized event modules.
 */

import type { CampaignState } from '../../../campaign/types';
import type { NavDestination } from '../../common/nav-bar';
import type { ScreenAPI } from '../../framework/screen';
import { closePopovers } from '../popover-layer';
import { bindPilotEvents } from './bind-pilot-events';
import { bindShipEvents } from './bind-ship-events';
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

  // Delegate to specialized event handlers
  bindShipEvents(api, props);
  bindPilotEvents(api, props);

  // Go to store
  api.on('.btn-go-to-store', 'click', () => {
    onNavigate('store');
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
