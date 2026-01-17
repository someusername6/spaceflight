/**
 * Contracts screen - displays available missions to choose from.
 */

import {
  getContractRefreshCost,
  isCommanderAssigned,
} from '../../campaign/state';
import {
  type CampaignState,
  type Contract,
  MAX_SECTOR,
} from '../../campaign/types';
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
import { generateContracts } from './contracts-data';
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
  onNavigate: (destination: NavDestination) => void;
  onAccept: (contract: Contract) => void;
  onAdvanceSector: () => void;
  onRefresh: () => void;
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
}

// Re-export types and functions for external use
export type { NavDestination } from '../common/nav-bar';
export { generateContracts };

/** Count total enemies across all waves */
function countTotalEnemies(contract: Contract): number {
  const waves = contract.waves ?? [];
  return waves.reduce(
    (total, wave) => total + wave.enemies.reduce((sum, e) => sum + e.count, 0),
    0,
  );
}

/** Render a contract list item (compact) */
function renderContractListItem(
  contract: Contract,
  isSelected: boolean,
  isReplayMode: boolean,
): string {
  const replayBadge = isReplayMode
    ? '<span class="contract-badge replay">REPLAY</span>'
    : '';

  return `
    <article
      class="contract-list-item ${isSelected ? 'selected' : ''} ${isReplayMode ? 'replay-mode' : ''}"
      data-contract-id="${contract.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${contract.name}, ${contract.difficulty} difficulty, ${contract.reward} credits${isReplayMode ? ', replay mission' : ''}"
    >
      <div class="contract-list-info">
        <div class="contract-list-name">${contract.name}${replayBadge}</div>
        <span class="contract-difficulty ${contract.difficulty}" aria-label="Difficulty: ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-list-reward" aria-hidden="true">${contract.reward}&nbsp;cr</div>
    </article>
  `;
}

/** Render hostiles section for wave-based missions */
function renderWaveHostiles(contract: Contract): string {
  const waves = contract.waves ?? [];
  const enemyCounts = new Map<string, number>();
  for (const wave of waves) {
    for (const enemy of wave.enemies) {
      const key = `${enemy.archetype}`;
      enemyCounts.set(key, (enemyCounts.get(key) ?? 0) + enemy.count);
    }
  }
  const enemyList = Array.from(enemyCounts.entries())
    .map(([type, count]) => `<div class="enemy-entry">${count}× ${type}</div>`)
    .join('');

  const totalEnemies = countTotalEnemies(contract);
  const waveCount = waves.length;

  return `
    <div class="contract-detail-section">
      <div class="detail-section-label">HOSTILES</div>
      <div class="contract-enemies">${enemyList}</div>
      <div class="contract-waves">${totalEnemies} total in ${waveCount} waves</div>
    </div>
  `;
}

/** Render mission info for escort missions */
function renderEscortInfo(contract: Contract): string {
  const escort = contract.escortData!;
  const enemyTypes = escort.enemyPool
    .map((e) => e.archetype)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .join(', ');

  return `
    <div class="contract-detail-section">
      <div class="detail-section-label">ESCORT MISSION</div>
      <div class="escort-info">
        <div class="escort-entry">Convoy: ${escort.convoySize} ships</div>
        <div class="escort-entry">Distance: ${(escort.escapeZoneDistance / 1000).toFixed(1)} km to jump point</div>
        <div class="escort-entry">Jump charge: ${escort.jumpChargeTime}s</div>
      </div>
    </div>
    <div class="contract-detail-section">
      <div class="detail-section-label">THREAT</div>
      <div class="contract-enemies">
        <div class="enemy-entry">Continuous spawns: ${enemyTypes}</div>
        <div class="enemy-entry">Max concurrent: ${escort.maxConcurrentEnemies}</div>
      </div>
      <div class="contract-waves">Reward scales with convoy survival</div>
    </div>
  `;
}

/** Render contract detail panel */
function renderContractDetail(contract: Contract, canLaunch: boolean): string {
  const isEscort = contract.missionType === 'escort' && contract.escortData;

  // Accept button or commander warning (hard block)
  const acceptButton = canLaunch
    ? `<button class="btn btn-large btn-success" id="btn-accept-mission">ACCEPT MISSION</button>`
    : `<button class="btn btn-warning btn-goto-squadron">⚠ ASSIGN COMMANDER IN SQUADRON</button>`;

  const missionInfo = isEscort
    ? renderEscortInfo(contract)
    : renderWaveHostiles(contract);

  return `
    <div class="contract-detail">
      <div class="contract-detail-header">
        <span class="contract-detail-name">${contract.name}</span>
        <span class="contract-difficulty ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-detail-desc">${contract.description}</div>
      ${missionInfo}
      <div class="contract-actions">
        <div class="contract-reward-price">${contract.reward.toLocaleString()}<span class="currency">cr</span></div>
        ${acceptButton}
      </div>
    </div>
  `;
}

/** Contracts screen component */
const ContractsScreenComponent: Screen<ContractsState, ContractsProps> = {
  render(state, props) {
    const { campaignState, contracts, isReplayMode, refreshCost, onNavigate } =
      props;
    const currentSector = campaignState.currentSector;
    const canAdvance = currentSector < MAX_SECTOR;
    const canAffordRefresh = campaignState.credits >= refreshCost;

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

    // Pool counter showing completed missions (no total shown for replayability)
    const completedCount = campaignState.sectorMissionsCompleted;
    const completedText =
      completedCount === 0
        ? 'No contracts completed'
        : completedCount === 1
          ? '1 contract completed'
          : `${completedCount} contracts completed`;
    const poolCounter = isReplayMode
      ? '<div class="contracts-pool-counter replay">Replay mode (50% rewards)</div>'
      : `<div class="contracts-pool-counter">${completedText}</div>`;

    // Refresh button
    const refreshButton = `
      <button
        class="btn btn-secondary contracts-refresh-btn ${!canAffordRefresh ? 'disabled' : ''}"
        id="btn-refresh-contracts"
        ${!canAffordRefresh ? 'disabled' : ''}
        title="${canAffordRefresh ? 'Get different contracts' : 'Not enough credits'}"
      >
        Refresh (${refreshCost} cr)
      </button>
    `;

    // Advance sector button (only show if not at max sector)
    const advanceButton = canAdvance
      ? `<button class="btn btn-secondary contracts-advance-btn" id="btn-advance-sector">
           Advance to Sector ${currentSector + 1} →
         </button>`
      : '';

    return `
      <div class="campaign-page">
        ${navBar}
        <main class="contracts-screen" aria-label="Contract selection">
          <div class="contracts-layout">
            <aside class="contracts-list-panel" role="listbox" aria-label="Available contracts">
              ${poolCounter}
              ${contracts.map((c) => renderContractListItem(c, c.id === state.selectedContractId, isReplayMode)).join('')}
              <div class="contracts-actions">
                ${refreshButton}
                ${advanceButton}
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
    const { contracts, onNavigate, onAccept, onAdvanceSector, onRefresh } =
      props;
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

    // Accept mission button (launches mission)
    api.on('#btn-accept-mission', 'click', () => {
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

    // Refresh contracts button
    api.on('#btn-refresh-contracts', 'click', () => {
      onRefresh();
    });

    // Advance sector button - show confirmation modal
    api.on('#btn-advance-sector', 'click', () => {
      showSectorAdvanceModal(currentSector).then((result) => {
        if (result.confirmed) {
          onAdvanceSector();
        }
      });
    });
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<ContractsState, ContractsProps> | null = null;

/** Create contracts UI */
export function createContractsUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onAccept: (contract: Contract) => void,
  onAdvanceSector: () => void,
  onRefresh: () => void,
): ContractsUI {
  // Clean up previous handle
  screenHandle?.destroy();

  const generated = generateContracts(
    state.currentSector,
    state.seed,
    state.sectorMissionsCompleted,
    4,
    state.completedContracts,
    state.contractRefreshCount,
  );
  const initialState: ContractsState = { selectedContractId: null };
  const props: ContractsProps = {
    campaignState: state,
    contracts: generated.contracts,
    isReplayMode: generated.isReplayMode,
    refreshCost: getContractRefreshCost(state.currentSector),
    onNavigate,
    onAccept,
    onAdvanceSector,
    onRefresh,
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
    4,
    state.completedContracts,
    state.contractRefreshCount,
  );
  ui.contracts = generated.contracts;

  if (screenHandle) {
    screenHandle.setProps({
      campaignState: state,
      contracts: generated.contracts,
      isReplayMode: generated.isReplayMode,
      refreshCost: getContractRefreshCost(state.currentSector),
      onNavigate: ui.onNavigate,
      onAccept: ui.onAccept,
      onAdvanceSector: ui.onAdvanceSector,
      onRefresh,
    });
  }
}
