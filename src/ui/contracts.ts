/**
 * Contracts screen - displays available missions to choose from.
 */

import type { CampaignState, Contract } from '../campaign/types';

/** Contracts UI state */
export interface ContractsUI {
  element: HTMLElement;
  contracts: Contract[];
  onBack: () => void;
  onAccept: (contract: Contract) => void;
}

/**
 * Generate contracts with wave-based enemy spawning.
 * Waves spawn when previous wave is cleared, creating longer engagements.
 * Each wave is manageable; total enemies add up for pacing.
 */
export function generateContracts(_sector: number): Contract[] {
  // Early game uses "fighter" archetype (same as player) for longer engagements.
  // Rookie skill keeps difficulty manageable while tankier ships extend fight times.
  return [
    {
      id: 'patrol-1',
      name: 'Patrol Duty',
      description: 'Clear hostiles from the shipping lanes.',
      difficulty: 'easy',
      // 2 waves = 2 total rookie fighters (tankier than scouts, longer fights)
      waves: [
        { enemies: [{ archetype: 'fighter', skill: 'rookie', count: 1 }] },
        {
          enemies: [{ archetype: 'fighter', skill: 'rookie', count: 1 }],
          delay: 3,
        },
      ],
      reward: 200,
    },
    {
      id: 'escort-1',
      name: 'Escort Mission',
      description: 'Defend cargo ships against raider attack.',
      difficulty: 'medium',
      // 2 waves: fighters then fighter + interceptor = 3 total enemies
      waves: [
        { enemies: [{ archetype: 'fighter', skill: 'rookie', count: 1 }] },
        {
          enemies: [
            { archetype: 'fighter', skill: 'rookie', count: 1 },
            { archetype: 'interceptor', skill: 'rookie', count: 1 },
          ],
          delay: 3,
        },
      ],
      reward: 350,
    },
    {
      id: 'assault-1',
      name: 'Strike Mission',
      description: 'Eliminate enemy patrol. Expect heavy resistance.',
      difficulty: 'hard',
      // 3 waves - fighters then interceptors = 4 total enemies
      waves: [
        { enemies: [{ archetype: 'fighter', skill: 'rookie', count: 1 }] },
        {
          enemies: [{ archetype: 'fighter', skill: 'rookie', count: 1 }],
          delay: 3,
        },
        {
          enemies: [{ archetype: 'interceptor', skill: 'rookie', count: 2 }],
          delay: 3,
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

/** Render a contract item */
function renderContractItem(contract: Contract): string {
  // Summarize enemies across all waves
  const enemyCounts = new Map<string, number>();
  for (const wave of contract.waves) {
    for (const enemy of wave.enemies) {
      const key = `${enemy.archetype}`;
      enemyCounts.set(key, (enemyCounts.get(key) ?? 0) + enemy.count);
    }
  }
  const enemyDesc = Array.from(enemyCounts.entries())
    .map(([type, count]) => `${count}x ${type}`)
    .join(', ');

  const totalEnemies = countTotalEnemies(contract);
  const waveCount = contract.waves.length;

  return `
    <div class="contract-item" data-contract-id="${contract.id}">
      <div class="contract-name">${contract.name}</div>
      <span class="contract-difficulty ${contract.difficulty}">
        ${contract.difficulty.toUpperCase()}
      </span>
      <div class="contract-description">${contract.description}</div>
      <div style="font-size: 0.85em; color: #7a9aba; margin-bottom: 8px;">
        ${totalEnemies} hostiles in ${waveCount} waves (${enemyDesc})
      </div>
      <div class="contract-reward">Reward: ${contract.reward} credits</div>
    </div>
  `;
}

/** Render contracts screen */
function renderContracts(state: CampaignState, contracts: Contract[]): string {
  return `
    <button class="btn btn-back" id="btn-back">← Back</button>
    <div class="credits-display">${state.credits}</div>

    <h1>Available Contracts</h1>
    <h2>Sector ${state.currentSector}</h2>

    <div class="screen-panel">
      <div class="contract-list">
        ${contracts.map(renderContractItem).join('')}
      </div>
    </div>
  `;
}

/** Create contracts UI */
export function createContractsUI(
  element: HTMLElement,
  state: CampaignState,
  onBack: () => void,
  onAccept: (contract: Contract) => void,
): ContractsUI {
  const contracts = generateContracts(state.currentSector);
  element.innerHTML = renderContracts(state, contracts);

  // Bind back button
  const backBtn = element.querySelector('#btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', onBack);
  }

  // Bind contract clicks
  const contractItems = element.querySelectorAll('.contract-item');
  contractItems.forEach((item) => {
    item.addEventListener('click', () => {
      const contractId = item.getAttribute('data-contract-id');
      const contract = contracts.find((c) => c.id === contractId);
      if (contract) {
        onAccept(contract);
      }
    });
  });

  return {
    element,
    contracts,
    onBack,
    onAccept,
  };
}

/** Update contracts UI */
export function updateContractsUI(ui: ContractsUI, state: CampaignState): void {
  ui.contracts = generateContracts(state.currentSector);
  ui.element.innerHTML = renderContracts(state, ui.contracts);

  // Re-bind back button
  const backBtn = ui.element.querySelector('#btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', ui.onBack);
  }

  // Re-bind contract clicks
  const contractItems = ui.element.querySelectorAll('.contract-item');
  contractItems.forEach((item) => {
    item.addEventListener('click', () => {
      const contractId = item.getAttribute('data-contract-id');
      const contract = ui.contracts.find((c) => c.id === contractId);
      if (contract) {
        ui.onAccept(contract);
      }
    });
  });
}
