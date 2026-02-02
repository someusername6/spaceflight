/**
 * Mission Sync - Synchronizes mission start across multiplayer clients.
 *
 * All clients must initialize the mission world identically:
 * 1. Host broadcasts MissionStarted { seed, contractId, campaignStateHash }
 * 2. All clients have identical campaignState (from Welcome/CampaignSync)
 * 3. Each client creates world locally using: seed + campaignState + contractId
 * 4. Identical inputs → identical PRNG seed → identical initial state
 * 5. No serialized world state is sent at mission start
 * 6. All clients start at tick 0
 * 7. Guest verifies campaignStateHash matches local state
 */

import type { CampaignState, Contract } from '../campaign/types';
import { deriveKey } from '../core/prng';

// =============================================================================
// Types
// =============================================================================

/** Data needed to synchronize mission start */
export interface MissionStartData {
  /** Contract ID being launched */
  contractId: string;
  /** PRNG seed for deterministic simulation */
  seed: number;
  /** Hash of the campaign state for verification */
  campaignStateHash: number;
}

/** Result of finding a contract */
export interface ContractLookupResult {
  found: boolean;
  contract?: Contract;
  error?: string;
}

// =============================================================================
// Campaign State Hashing
// =============================================================================

/**
 * Compute a hash of the campaign state for verification.
 * Uses a simple DJB2-style hash over the JSON representation.
 * The hash is used to verify host and guest have identical campaign state
 * at mission start.
 */
export function hashCampaignState(campaignState: CampaignState): number {
  const json = JSON.stringify(campaignState);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
  }
  // Convert to unsigned 32-bit
  return hash >>> 0;
}

// =============================================================================
// Seed Generation
// =============================================================================

/**
 * Generate the mission seed for a given campaign state.
 * This must be called by the host to generate the seed that will be broadcast.
 *
 * The seed is derived from:
 * - Campaign seed (unique per campaign)
 * - "mission" key
 * - Mission count (ensures different seed each mission)
 */
export function generateMissionSeed(campaignState: CampaignState): number {
  return deriveKey(campaignState.seed, 'mission', campaignState.missionCount);
}

// =============================================================================
// Contract Lookup
// =============================================================================

/**
 * Find a contract by ID in the current campaign state.
 * Used by guests to locate the contract from the MissionStarted message.
 *
 * Note: This requires the contracts to be regenerated on the guest side
 * using the same parameters as the host.
 */
export function findContractById(
  contractId: string,
  contracts: Contract[],
): ContractLookupResult {
  const contract = contracts.find((c) => c.id === contractId);

  if (!contract) {
    return {
      found: false,
      error: `Contract ${contractId} not found`,
    };
  }

  return {
    found: true,
    contract,
  };
}

// =============================================================================
// Mission Start Data Creation
// =============================================================================

/**
 * Create mission start data for broadcasting.
 * Host calls this when launching a mission.
 */
export function createMissionStartData(
  contractId: string,
  campaignState: CampaignState,
): MissionStartData {
  return {
    contractId,
    seed: generateMissionSeed(campaignState),
    campaignStateHash: hashCampaignState(campaignState),
  };
}
