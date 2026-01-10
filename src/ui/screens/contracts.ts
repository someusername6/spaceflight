/**
 * Contracts screen - displays available missions to choose from.
 */

import { isCommanderAssigned } from '../../campaign/state';
import type { CampaignState, Contract } from '../../campaign/types';
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

/** Contracts screen state */
interface ContractsState {
  selectedContractId: string | null;
}

/** Contracts screen props */
interface ContractsProps {
  campaignState: CampaignState;
  contracts: Contract[];
  onNavigate: (destination: NavDestination) => void;
  onAccept: (contract: Contract) => void;
}

/** Legacy UI interface for backwards compatibility */
export interface ContractsUI {
  element: HTMLElement;
  state: CampaignState;
  contracts: Contract[];
  selectedContractId: string | null;
  onNavigate: (destination: NavDestination) => void;
  onAccept: (contract: Contract) => void;
}

// Re-export types for external use
export type { NavDestination } from '../common/nav-bar';

/**
 * Generate contracts with wave-based enemy spawning.
 * Waves spawn when previous wave is cleared, creating longer engagements.
 * All missions are combat-focused - eliminate all hostile ships.
 */
export function generateContracts(_sector: number): Contract[] {
  return [
    // Easy: Intro mission with basic patrol craft
    {
      id: 'patrol-1',
      name: 'Patrol Duty',
      description: 'Clear hostiles from the shipping lanes.',
      difficulty: 'easy',
      waves: [
        {
          enemies: [{ archetype: 'dragonfly', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'green', count: 1 },
            { archetype: 'firefly', skill: 'green', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 2000,
    },
    // Medium: Fast autocannon scouts with missiles
    {
      id: 'wasp-nest',
      name: 'Wasp Nest',
      description:
        'Eliminate scout squadron. Fast ships with ballistic weapons.',
      difficulty: 'medium',
      waves: [
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'wasp', skill: 'regular', count: 1 },
            { archetype: 'hornet', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'hornet', skill: 'regular', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 3500,
    },
    // Hard: Tanky defender with lightning escorts
    {
      id: 'armored-patrol',
      name: 'Armored Patrol',
      description: 'Heavy enemy formation. Defender-class with moth escorts.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'moth', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'moth', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'beetle', skill: 'regular', count: 1 },
            { archetype: 'moth', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 6000,
    },
    // Hard: Railgun sniper with fast support
    {
      id: 'sniper-ambush',
      name: 'Sniper Ambush',
      description: 'Long-range threat. Railgun raider with wasp support.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'regular', count: 1 },
            { archetype: 'wasp', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'hornet', skill: 'regular', count: 1 },
            { archetype: 'wasp', skill: 'regular', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 6000,
    },
  ];
}

/** Count total enemies across all waves */
function countTotalEnemies(contract: Contract): number {
  return contract.waves.reduce(
    (total, wave) => total + wave.enemies.reduce((sum, e) => sum + e.count, 0),
    0,
  );
}

/** Render a contract list item (compact) */
function renderContractListItem(
  contract: Contract,
  isSelected: boolean,
): string {
  return `
    <article
      class="contract-list-item ${isSelected ? 'selected' : ''}"
      data-contract-id="${contract.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${contract.name}, ${contract.difficulty} difficulty, ${contract.reward} credits"
    >
      <div class="contract-list-info">
        <div class="contract-list-name">${contract.name}</div>
        <span class="contract-difficulty ${contract.difficulty}" aria-label="Difficulty: ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-list-reward" aria-hidden="true">${contract.reward}&nbsp;cr</div>
    </article>
  `;
}

/** Render contract detail panel */
function renderContractDetail(contract: Contract, canLaunch: boolean): string {
  // Summarize enemies across all waves
  const enemyCounts = new Map<string, number>();
  for (const wave of contract.waves) {
    for (const enemy of wave.enemies) {
      const key = `${enemy.archetype}`;
      enemyCounts.set(key, (enemyCounts.get(key) ?? 0) + enemy.count);
    }
  }
  const enemyList = Array.from(enemyCounts.entries())
    .map(([type, count]) => `<div class="enemy-entry">${count}× ${type}</div>`)
    .join('');

  const totalEnemies = countTotalEnemies(contract);
  const waveCount = contract.waves.length;

  // Accept button or commander warning (hard block)
  const acceptButton = canLaunch
    ? `<button class="btn btn-large btn-success" id="btn-accept-mission">ACCEPT MISSION</button>`
    : `<button class="btn btn-warning btn-goto-squadron">⚠ ASSIGN COMMANDER IN SQUADRON</button>`;

  return `
    <div class="contract-detail">
      <div class="contract-detail-header">
        <span class="contract-detail-name">${contract.name}</span>
        <span class="contract-difficulty ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-detail-desc">${contract.description}</div>
      <div class="contract-detail-section">
        <div class="detail-section-label">HOSTILES</div>
        <div class="contract-enemies">
          ${enemyList}
        </div>
        <div class="contract-waves">${totalEnemies} total in ${waveCount} waves</div>
      </div>
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
    const { campaignState, contracts, onNavigate } = props;

    const navBar = renderNavBar({
      activeTab: 'contracts',
      credits: campaignState.credits,
      sector: campaignState.currentSector,
      onNavigate,
    });

    const selectedContract = state.selectedContractId
      ? contracts.find((c) => c.id === state.selectedContractId)
      : null;

    const canLaunch = isCommanderAssigned(campaignState);

    return `
      <div class="campaign-page">
        ${navBar}
        <main class="contracts-screen" aria-label="Contract selection">
          <div class="contracts-layout">
            <aside class="contracts-list-panel" role="listbox" aria-label="Available contracts">
              ${contracts.map((c) => renderContractListItem(c, c.id === state.selectedContractId)).join('')}
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
    const { contracts, onNavigate, onAccept } = props;

    // Bind navigation bar
    bindNavBar(api.getRoot(), onNavigate);

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
): ContractsUI {
  // Clean up previous handle
  screenHandle?.destroy();

  const contracts = generateContracts(state.currentSector);
  const initialState: ContractsState = { selectedContractId: null };
  const props: ContractsProps = {
    campaignState: state,
    contracts,
    onNavigate,
    onAccept,
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
    contracts,
    selectedContractId: null,
    onNavigate,
    onAccept,
  };
}

/** Update contracts UI */
export function updateContractsUI(ui: ContractsUI, state: CampaignState): void {
  ui.state = state;
  ui.contracts = generateContracts(state.currentSector);

  if (screenHandle) {
    screenHandle.setProps({
      campaignState: state,
      contracts: ui.contracts,
      onNavigate: ui.onNavigate,
      onAccept: ui.onAccept,
    });
  }
}
