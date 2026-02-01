/**
 * Ship Assignment Types - Type definitions for ship assignment operations.
 *
 * Extracted from ship-assignment.ts to stay under 400 line limit.
 */

import type { CampaignState } from '../campaign/types';

/** Error codes for ship assignment failures */
export type ShipAssignmentError =
  | 'ship_not_found'
  | 'version_mismatch'
  | 'ship_occupied';

/** Successful ship assignment result */
export interface ShipAssignmentSuccess {
  success: true;
  /** Updated campaign state */
  newState: CampaignState;
}

/** Failed ship assignment result */
export interface ShipAssignmentFailure {
  success: false;
  /** Error code describing why assignment failed */
  error: ShipAssignmentError;
}

/** Result of a ship assignment operation (discriminated union) */
export type ShipAssignmentResult =
  | ShipAssignmentSuccess
  | ShipAssignmentFailure;
