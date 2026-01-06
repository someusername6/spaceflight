/**
 * Common UI types shared across screens.
 */

import type { CampaignState } from '../../campaign/types';

/** Callback to update campaign state */
export type StateUpdater = (newState: CampaignState) => void;

/** Base props that all screens receive */
export interface BaseScreenProps {
  /** Current campaign state */
  state: CampaignState;
}

/** Base actions that most screens support */
export interface BaseScreenActions {
  /** Called when state changes (store updates, purchases, etc.) */
  onStateUpdate: StateUpdater;
}
