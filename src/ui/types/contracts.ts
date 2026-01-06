/**
 * Contracts screen type definitions.
 *
 * The Contracts screen displays available missions for selection.
 */

import type { CampaignState, Contract } from '../../campaign/types';
import type { BaseScreenProps } from './common';

/** Props for the Contracts screen */
export interface ContractsProps extends BaseScreenProps {
  /** Current credit balance */
  credits: number;

  /** Current sector number */
  currentSector: number;

  /** Available contracts to choose from */
  contracts: Contract[];
}

/** Actions the Contracts screen can trigger */
export interface ContractsActions {
  /** Navigate back to hangar */
  goBack: () => void;

  /** Accept a contract and start the mission */
  acceptContract: (contract: Contract) => void;
}

/** Summary of enemies in a contract (for display) */
export interface ContractEnemySummary {
  /** Total enemy count across all waves */
  totalEnemies: number;

  /** Number of waves */
  waveCount: number;

  /** Enemy breakdown by type (e.g., "4x dragonfly, 4x firefly") */
  enemyBreakdown: string;
}

/** Get enemy summary for a contract */
export function getContractEnemySummary(
  contract: Contract,
): ContractEnemySummary {
  const enemyCounts = new Map<string, number>();

  for (const wave of contract.waves) {
    for (const enemy of wave.enemies) {
      const current = enemyCounts.get(enemy.archetype) ?? 0;
      enemyCounts.set(enemy.archetype, current + enemy.count);
    }
  }

  const totalEnemies = Array.from(enemyCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const enemyBreakdown = Array.from(enemyCounts.entries())
    .map(([type, count]) => `${count}x ${type}`)
    .join(', ');

  return {
    totalEnemies,
    waveCount: contract.waves.length,
    enemyBreakdown,
  };
}

/** Derive ContractsProps from state */
export function deriveContractsProps(
  state: CampaignState,
  contracts: Contract[],
): ContractsProps {
  return {
    state,
    credits: state.credits,
    currentSector: state.currentSector,
    contracts,
  };
}
