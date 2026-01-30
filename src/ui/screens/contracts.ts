/**
 * Contracts screen - displays available missions to choose from.
 */

import {
  getContractRefreshCost,
  getSectorAdvanceCost,
  isCommanderAssigned,
} from '../../campaign/state';
import type { CampaignState, Contract } from '../../campaign/types';
import { isHost } from '../../multiplayer/context-permissions';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../common/nav-bar';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import {
  renderAdvanceButton,
  renderRefreshButton,
  renderRetireButton,
} from './contracts-buttons';
import { CONTRACTS_PER_SCREEN, generateContracts } from './contracts-data';
import {
  renderContractDetail,
  renderContractListItem,
} from './contracts-rendering';
import { showRetirementModal } from './retirement-modal';
import { showSectorAdvanceModal } from './sector-advance-modal';

/** Contracts screen state */
interface ContractsState {
  selectedContractId: string | null;
}

/** Contracts screen props */
interface ContractsProps {
  campaignState: CampaignState;
  contracts: Contract[];
  /** True if all missions completed and these are replays (50% reward) */
  isReplayMode: boolean;
  /** Refresh cost for current sector */
  refreshCost: number;
  /** Cost to advance to next sector */
  advanceCost: number;
  onNavigate: (destination: NavDestination) => void;
  onAccept: (contract: Contract) => void;
  onAdvanceSector: () => void;
  onRefresh: () => void;
  onRetire: () => void;
}

/** Legacy UI interface for backwards compatibility */
export interface ContractsUI {
  element: HTMLElement;
  state: CampaignState;
  contracts: Contract[];
  selectedContractId: string | null;
  onNavigate: (destination: NavDestination) => void;
  onAccept: (contract: Contract) => void;
  onAdvanceSector: () => void;
  onRefresh: () => void;
  onRetire: () => void;
}

// Re-export types and functions for external use
export type { NavDestination } from '../common/nav-bar';
export { generateContracts };

// =============================================================================
// Screen Component
// =============================================================================

/** Contracts screen component */
const ContractsScreenComponent: Screen<ContractsState, ContractsProps> = {
  render(state, props) {
    const {
      campaignState,
      contracts,
      isReplayMode,
      refreshCost,
      advanceCost,
      onNavigate,
    } = props;
    const currentSector = campaignState.currentSector;
    const canAffordRefresh = campaignState.credits >= refreshCost;
    const canAffordAdvance = campaignState.credits >= advanceCost;
    const isNotHost = !isHost();

    const navBar = renderNavBar({
      activeTab: 'contracts',
      credits: campaignState.credits,
      sector: currentSector,
      onNavigate,
    });

    const selectedContract = state.selectedContractId
      ? contracts.find((c) => c.id === state.selectedContractId)
      : null;
    const canLaunch = isCommanderAssigned(campaignState);

    // Pool counter
    const completedCount = campaignState.sectorMissionsCompleted;
    const completedText =
      completedCount === 0
        ? 'No contracts completed'
        : completedCount === 1
          ? '1 contract completed'
          : `${completedCount} contracts completed`;
    const replayText =
      currentSector >= 5 ? 'Replay mode' : 'Replay mode (50% rewards)';
    const poolCounter = isReplayMode
      ? `<div class="contracts-pool-counter replay">${replayText}</div>`
      : `<div class="contracts-pool-counter">${completedText}</div>`;

    return `
      <div class="campaign-page">
        ${navBar}
        <main class="contracts-screen" aria-label="Contract selection">
          <div class="contracts-layout">
            <aside class="contracts-list-panel" role="listbox" aria-label="Available contracts">
              ${poolCounter}
              ${contracts.map((c) => renderContractListItem(c, c.id === state.selectedContractId, isReplayMode)).join('')}
              <div class="contracts-actions">
                ${renderRefreshButton(refreshCost, canAffordRefresh, isNotHost)}
                ${renderAdvanceButton(currentSector, advanceCost, canAffordAdvance, isNotHost)}
                ${renderRetireButton(currentSector, isNotHost)}
              </div>
            </aside>
            <section class="contracts-detail-panel" aria-label="Contract details">
              ${selectedContract ? renderContractDetail(selectedContract, canLaunch) : '<div class="empty-state-panel" role="status">Select a contract to view details</div>'}
            </section>
          </div>
        </main>
      </div>
    `;
  },

  bind(api: ScreenAPI<ContractsState>, props: ContractsProps) {
    const {
      contracts,
      onNavigate,
      onAccept,
      onAdvanceSector,
      onRefresh,
      onRetire,
    } = props;
    const currentSector = props.campaignState.currentSector;

    // Bind navigation bar (uses Screen framework's event delegation)
    bindNavBar(api, onNavigate);

    // Contract list item clicks (selection toggle)
    api.on('.contract-list-item', 'click', (_e, el) => {
      const contractId = el.getAttribute('data-contract-id');
      if (contractId) {
        const currentState = api.getState();
        // Toggle selection
        const newId =
          contractId === currentState.selectedContractId ? null : contractId;
        api.setState({ selectedContractId: newId });
      }
    });

    // Accept mission button (launches mission) - host only in multiplayer
    api.on('#btn-accept-mission', 'click', () => {
      // Guard: only host can accept in multiplayer
      if (!isHost()) return;

      const state = api.getState();
      if (state.selectedContractId) {
        const contract = contracts.find(
          (c) => c.id === state.selectedContractId,
        );
        if (contract) {
          onAccept(contract);
        }
      }
    });

    // Warning action buttons (navigate to squadron)
    api.on('.btn-goto-squadron', 'click', () => {
      onNavigate('squadron');
    });

    // Refresh contracts button - host only in multiplayer
    api.on('#btn-refresh-contracts', 'click', () => {
      if (!isHost()) return;
      onRefresh();
    });

    // Advance sector button - show confirmation modal - host only in multiplayer
    api.on('#btn-advance-sector', 'click', () => {
      if (!isHost()) return;

      const advanceCost = props.advanceCost;
      const playerCredits = props.campaignState.credits;
      showSectorAdvanceModal(currentSector, advanceCost, playerCredits).then(
        (result) => {
          if (result.confirmed) {
            onAdvanceSector();
          }
        },
      );
    });

    // Retire button - show retirement modal (sector 5 only) - host only in multiplayer
    api.on('#btn-retire', 'click', () => {
      if (!isHost()) return;

      const playerCredits = props.campaignState.credits;
      const isIronman = props.campaignState.settings?.ironmanMode ?? false;
      showRetirementModal(playerCredits, isIronman).then((result) => {
        if (result.confirmed) {
          onRetire();
        }
      });
    });
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<ContractsState, ContractsProps> | null = null;

/**
 * Get the IDs of currently displayed contracts.
 * Returns empty array if no contracts screen is active.
 */
export function getCurrentContractIds(): string[] {
  if (!screenHandle) return [];
  const props = screenHandle.getProps();
  return props.contracts.map((c: Contract) => c.id);
}

/**
 * Refresh the contracts UI with new campaign state.
 * Call when campaign state changes externally (e.g., from network).
 */
export function refreshContractsUI(newCampaignState: CampaignState): void {
  if (!screenHandle) return;
  const currentProps = screenHandle.getProps();
  screenHandle.setProps({ ...currentProps, campaignState: newCampaignState });
}

/**
 * Check if the contracts UI is currently active.
 */
export function isContractsUIActive(): boolean {
  return screenHandle !== null;
}

/** Create contracts UI */
export function createContractsUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onAccept: (contract: Contract) => void,
  onAdvanceSector: () => void,
  onRefresh: () => void,
  onRetire: () => void,
): ContractsUI {
  // Clean up previous handle
  screenHandle?.destroy();

  const generated = generateContracts(
    state.currentSector,
    state.seed,
    state.sectorMissionsCompleted,
    CONTRACTS_PER_SCREEN,
    state.completedContracts,
    state.contractRefreshCount,
  );
  const initialState: ContractsState = { selectedContractId: null };
  const props: ContractsProps = {
    campaignState: state,
    contracts: generated.contracts,
    isReplayMode: generated.isReplayMode,
    refreshCost: getContractRefreshCost(state.currentSector),
    advanceCost: getSectorAdvanceCost(state.currentSector),
    onNavigate,
    onAccept,
    onAdvanceSector,
    onRefresh,
    onRetire,
  };

  screenHandle = createScreen(
    ContractsScreenComponent,
    element,
    initialState,
    props,
  );

  // Return legacy UI object for compatibility
  return {
    element,
    state,
    contracts: generated.contracts,
    selectedContractId: null,
    onNavigate,
    onAccept,
    onAdvanceSector,
    onRefresh,
    onRetire,
  };
}

/** Update contracts UI */
export function updateContractsUI(
  ui: ContractsUI,
  state: CampaignState,
  onRefresh: () => void,
): void {
  ui.state = state;
  const generated = generateContracts(
    state.currentSector,
    state.seed,
    state.sectorMissionsCompleted,
    CONTRACTS_PER_SCREEN,
    state.completedContracts,
    state.contractRefreshCount,
  );
  ui.contracts = generated.contracts;

  if (screenHandle) {
    const newProps: ContractsProps = {
      campaignState: state,
      contracts: generated.contracts,
      isReplayMode: generated.isReplayMode,
      refreshCost: getContractRefreshCost(state.currentSector),
      advanceCost: getSectorAdvanceCost(state.currentSector),
      onNavigate: ui.onNavigate,
      onAccept: ui.onAccept,
      onAdvanceSector: ui.onAdvanceSector,
      onRefresh,
      onRetire: ui.onRetire,
    };
    screenHandle.setProps(newProps);
  }
}
