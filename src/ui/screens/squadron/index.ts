/**
 * Squadron screen - unified pilot and ship management interface.
 *
 * Three-column layout:
 * [Unified List] | [Tabbed Viewer] | [Ship Stats]
 *
 * Unified list shows:
 * - DEPLOYED: Pilot-ship pairs (with weapon status)
 * - AVAILABLE: Unassigned pilots
 * - RECRUITS: Hireable pilots
 *
 * Tabbed viewer for deployed pairs:
 * - [LOADOUT] tab: Ship hardpoint editor
 * - [PILOT] tab: Pilot career stats
 */

import { estimateAllShipsResupplyCost } from '../../../campaign/resupply/resupply-constrained';
import type { CampaignState } from '../../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../../common/nav-bar';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import {
  destroyShipConnectors,
  initShipConnectors,
} from '../../ship/connectors';
import { renderPilotViewer } from '../pilot-viewer';
import { renderRecruitViewer } from '../recruit-viewer';
import { closeShipPicker } from '../ship-picker';
import {
  bindSquadronEvents,
  type SquadronProps,
  type SquadronState,
} from './bind-events';
import { destroyHardpointListeners } from './hardpoint';
import { type ListSelection, renderSquadronList } from './list';
import {
  anyShipsNeedAmmoResupply,
  renderShipDetails,
  renderShipViewerWithActions,
  sortShipsCommanderFirst,
} from './render';
import {
  bindViewerTabs,
  destroyViewerTabListeners,
  renderViewerWithTabs,
  type ViewerTab,
} from './viewer';

/** Squadron UI interface */
export interface SquadronUI {
  element: HTMLElement;
  state: CampaignState;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate?: ((newState: CampaignState) => void) | undefined;
  /** Update campaign state and re-render */
  update(newState: CampaignState): void;
  /** Clean up resources */
  destroy(): void;
}

/** Render the squadron screen content */
function renderSquadronContent(
  selection: ListSelection,
  activeTab: ViewerTab,
  campaignState: CampaignState,
  onNavigate: (destination: NavDestination) => void,
): string {
  // Sort ships with commander first
  const sortedShips = sortShipsCommanderFirst(
    campaignState.ships,
    campaignState.commanderId,
  );

  // Find selected items
  const selectedShip =
    selection.type === 'deployed' || selection.type === 'ship'
      ? campaignState.ships.find((s) => s.id === selection.id)
      : null;

  const selectedPilot =
    selection.type === 'available'
      ? campaignState.pilots.find((p) => p.id === selection.id)
      : null;

  const selectedRecruit =
    selection.type === 'recruit'
      ? campaignState.availableRecruits.find((r) => r.id === selection.id)
      : null;

  const navBar = renderNavBar({
    activeTab: 'squadron',
    credits: campaignState.credits,
    sector: campaignState.currentSector,
    sectorMissionsCompleted: campaignState.sectorMissionsCompleted,
    onNavigate,
  });

  // Check if any ships need ammo/missile resupply (not just empty slots)
  const showResupplyAll = anyShipsNeedAmmoResupply(campaignState.ships);
  const resupplyAllEstimate = showResupplyAll
    ? estimateAllShipsResupplyCost(campaignState)
    : null;

  // Build unified list
  const listHtml = renderSquadronList(
    sortedShips,
    campaignState.pilots,
    campaignState.availableRecruits,
    campaignState.commanderId,
    campaignState.credits,
    selection,
    {
      showResupplyAll,
      ...(resupplyAllEstimate?.cost !== undefined && {
        resupplyAllCost: resupplyAllEstimate.cost,
      }),
      commanderId: campaignState.commanderId,
    },
  );

  // Build center panel based on selection
  let centerPanel: string;
  if (selection.type === 'deployed' && selectedShip) {
    // Deployed pilot-ship pair: show tabbed viewer
    centerPanel = renderViewerWithTabs(
      selectedShip,
      campaignState,
      activeTab,
      renderShipViewerWithActions,
      renderPilotViewer,
    );
  } else if (selection.type === 'available' && selectedPilot) {
    // Available pilot: show pilot viewer (with assignment options)
    centerPanel = `
      <section class="squadron-viewer" aria-label="Pilot details">
        ${renderPilotViewer(selectedPilot, campaignState)}
      </section>
    `;
  } else if (selection.type === 'recruit' && selectedRecruit) {
    // Recruit: show recruit viewer (with hire option)
    centerPanel = `
      <section class="squadron-viewer" aria-label="Recruit details">
        ${renderRecruitViewer(selectedRecruit, campaignState)}
      </section>
    `;
  } else {
    // No selection
    centerPanel = `
      <div class="empty-state-panel" role="status" aria-label="No selection">
        Select a pilot or ship to view details
      </div>
    `;
  }

  // Right column: Ship details when viewing deployed or available pilot's ship
  const showDetails = selection.type === 'deployed' && selectedShip;
  const rightColumn = showDetails
    ? `<aside class="squadron-details" aria-label="Ship statistics">${renderShipDetails(selectedShip)}</aside>`
    : `<div class="squadron-details-placeholder" aria-hidden="true"></div>`;

  return `
    <div class="campaign-page">
      ${navBar}
      <main class="squadron-screen" aria-label="Squadron - Pilot and ship management">
        <div class="squadron-layout">
          <!-- Left Column: Unified List -->
          ${listHtml}

          <!-- Center Column: Viewer -->
          ${centerPanel}

          <!-- Right Column: Ship Details -->
          ${rightColumn}
        </div>
      </main>
    </div>
  `;
}

/** Squadron screen component */
const SquadronScreenComponent: Screen<SquadronState, SquadronProps> = {
  render(state, props) {
    // Close any open pickers before render
    closeShipPicker();

    return renderSquadronContent(
      state.selection,
      state.activeTab,
      props.campaignState,
      props.onNavigate,
    );
  },

  bind(api: ScreenAPI<SquadronState>, props: SquadronProps) {
    const element = api.getRoot();
    const { onNavigate } = props;

    // Clean up existing connectors
    const existingViewer = element.querySelector('.ship-viewer');
    if (existingViewer) {
      destroyShipConnectors(existingViewer);
    }

    // Initialize connector lines for ship viewer
    const viewer = element.querySelector('.ship-viewer');
    if (viewer) {
      initShipConnectors(viewer);
    }

    // Bind navigation bar
    bindNavBar(element, onNavigate);

    // Bind viewer tabs
    bindViewerTabs(element, (tab) => {
      api.setState({ activeTab: tab });
    });

    // Bind all squadron screen events
    bindSquadronEvents(api, props, element);
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<SquadronState, SquadronProps> | null = null;

/** Create squadron UI */
export function createSquadronUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onStateUpdate?: (newState: CampaignState) => void,
  initialSelection?: ListSelection,
): SquadronUI {
  // Clean up previous screen to prevent stale closures
  destroyHardpointListeners();
  destroyViewerTabListeners();
  screenHandle?.destroy();

  const initialState: SquadronState = {
    selection: initialSelection ?? { type: 'none', id: null },
    activeTab: 'loadout',
  };

  // Props object updated via closure
  let props: SquadronProps;

  // Wrap onStateUpdate to also update the screen props
  const wrappedOnStateUpdate = onStateUpdate
    ? (newCampaignState: CampaignState) => {
        onStateUpdate(newCampaignState);
        props = { ...props, campaignState: newCampaignState };
        screenHandle?.setProps(props);
      }
    : undefined;

  props = {
    campaignState: state,
    onNavigate,
    onStateUpdate: wrappedOnStateUpdate,
  };

  screenHandle = createScreen(
    SquadronScreenComponent,
    element,
    initialState,
    props,
  );

  // UI object with methods using closures
  const ui: SquadronUI = {
    element,
    state,
    onNavigate,
    onStateUpdate,
    update(newState: CampaignState) {
      ui.state = newState;
      props = { ...props, campaignState: newState };
      screenHandle?.setProps(props);
    },
    destroy() {
      destroyHardpointListeners();
      destroyViewerTabListeners();
      screenHandle?.destroy();
    },
  };

  return ui;
}

// Re-export NavDestination for external use
export type { NavDestination } from '../../common/nav-bar';
export type { ListSelection } from './list';

/** Update squadron UI with new state */
export function updateSquadronUI(ui: SquadronUI, state: CampaignState): void {
  ui.update(state);
}
