/**
 * Ship Actions - Rendering for ship management UI
 *
 * Note: Hull swap functionality was removed.
 * Pilot assignment is handled via the Pilots panel in hangar.
 */

import type { CampaignState, OwnedShip } from '../../campaign/types';

/** Render ship management actions (currently empty - reserved for future use) */
export function renderShipActions(
  _ship: OwnedShip,
  _state: CampaignState,
): string {
  // Hull swap removed - pilot assignment happens via Pilots panel
  return '';
}
