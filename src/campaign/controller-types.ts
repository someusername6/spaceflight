/**
 * Campaign controller types.
 */

import type { createGame } from '../game';
import type { createScreenManager } from '../ui/common/screens';

/** Campaign controller state */
export interface CampaignController {
  container: HTMLElement;
  screenManager: ReturnType<typeof createScreenManager>;
  missionContainer: HTMLElement | null;
  game: ReturnType<typeof createGame> | null;
  missionEnded: boolean;
}
