/**
 * Contracts screen - displays available missions to choose from.
 */

import { isCommanderAssigned } from '../../campaign/state';
import type { CampaignState, Contract } from '../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
  renderStatusDisplay,
} from '../common/nav-bar';

/** Contracts UI state */
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
 * Alternates firefly (red laser) and dragonfly (pulse) patrol craft for variety.
 * Patrol craft have 160 EHP for extended combat (~3x longer than scouts).
 */
export function generateContracts(_sector: number): Contract[] {
  return [
    {
      id: 'patrol-1',
      name: 'Patrol Duty',
      description: 'Clear hostiles from the shipping lanes.',
      difficulty: 'easy',
      waves: [
        { enemies: [{ archetype: 'dragonfly', skill: 'green', count: 2 }] },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'green', count: 2 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'green', count: 1 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'green', count: 1 }],
          delay: 10,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'green', count: 1 },
            { archetype: 'firefly', skill: 'green', count: 1 },
          ],
          delay: 10,
        },
      ],
      reward: 200,
    },
    {
      id: 'escort-1',
      name: 'Escort Mission',
      description: 'Defend cargo ships against raider attack.',
      difficulty: 'medium',
      waves: [
        { enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 2 }] },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 2 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 1 }],
          delay: 10,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'rookie', count: 1 },
            { archetype: 'firefly', skill: 'rookie', count: 1 },
          ],
          delay: 10,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'rookie', count: 1 },
            { archetype: 'firefly', skill: 'rookie', count: 1 },
          ],
          delay: 10,
        },
      ],
      reward: 350,
    },
    {
      id: 'assault-1',
      name: 'Strike Mission',
      description: 'Eliminate enemy patrol. Expect heavy resistance.',
      difficulty: 'hard',
      waves: [
        { enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 2 }] },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 2 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 2 }],
          delay: 10,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'rookie', count: 1 },
            { archetype: 'firefly', skill: 'regular', count: 1 },
          ],
          delay: 10,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 1 },
            { archetype: 'firefly', skill: 'regular', count: 1 },
          ],
          delay: 10,
        },
      ],
      reward: 600,
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
    <div class="contract-list-item ${isSelected ? 'selected' : ''}" data-contract-id="${contract.id}">
      <div class="contract-list-info">
        <div class="contract-list-name">${contract.name}</div>
        <span class="contract-difficulty ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-list-reward">${contract.reward}&nbsp;cr</div>
    </div>
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

  const acceptButton = canLaunch
    ? `<button class="btn btn-accept-mission" id="btn-accept-mission">ACCEPT MISSION</button>`
    : `<div class="no-commander-warning">Assign commander to a ship in Hangar</div>
       <button class="btn btn-accept-mission disabled" disabled>ACCEPT MISSION</button>`;

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
      <div class="contract-detail-section">
        <div class="detail-section-label">REWARD</div>
        <div class="contract-detail-reward">${contract.reward} credits</div>
      </div>
      ${acceptButton}
    </div>
  `;
}

/** Render contracts screen */
function renderContracts(
  state: CampaignState,
  contracts: Contract[],
  selectedContractId: string | null,
  onNavigate: (destination: NavDestination) => void,
): string {
  const navBar = renderNavBar({
    activeTab: 'contracts',
    credits: state.credits,
    sector: state.currentSector,
    onNavigate,
  });

  const selectedContract = selectedContractId
    ? contracts.find((c) => c.id === selectedContractId)
    : null;

  const canLaunch = isCommanderAssigned(state);

  return `
    ${navBar}
    ${renderStatusDisplay(state.credits, state.currentSector)}
    <div class="contracts-screen">
      <div class="contracts-layout">
        <div class="contracts-list-panel">
          ${contracts.map((c) => renderContractListItem(c, c.id === selectedContractId)).join('')}
        </div>
        <div class="contracts-detail-panel">
          ${selectedContract ? renderContractDetail(selectedContract, canLaunch) : '<div class="empty-state-panel">Select a contract to view details</div>'}
        </div>
      </div>
    </div>
  `;
}

/** Create contracts UI */
export function createContractsUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onAccept: (contract: Contract) => void,
): ContractsUI {
  const ui: ContractsUI = {
    element,
    state,
    contracts: generateContracts(state.currentSector),
    selectedContractId: null,
    onNavigate,
    onAccept,
  };

  renderAndBindContracts(ui);
  return ui;
}

/** Internal: render and bind events */
function renderAndBindContracts(ui: ContractsUI): void {
  ui.element.innerHTML = renderContracts(
    ui.state,
    ui.contracts,
    ui.selectedContractId,
    ui.onNavigate,
  );

  // Bind navigation bar
  bindNavBar(ui.element, ui.onNavigate);

  // Bind contract list item clicks (selection only)
  ui.element.querySelectorAll('.contract-list-item').forEach((item) => {
    item.addEventListener('click', () => {
      const contractId = item.getAttribute('data-contract-id');
      if (contractId) {
        // Toggle selection
        ui.selectedContractId =
          contractId === ui.selectedContractId ? null : contractId;
        renderAndBindContracts(ui);
      }
    });
  });

  // Bind accept mission button (launches mission)
  const acceptBtn = ui.element.querySelector('#btn-accept-mission');
  if (acceptBtn && ui.selectedContractId) {
    const contract = ui.contracts.find((c) => c.id === ui.selectedContractId);
    if (contract) {
      acceptBtn.addEventListener('click', () => {
        ui.onAccept(contract);
      });
    }
  }
}

/** Update contracts UI */
export function updateContractsUI(ui: ContractsUI, state: CampaignState): void {
  ui.state = state;
  ui.contracts = generateContracts(state.currentSector);
  renderAndBindContracts(ui);
}
