/**
 * Campaign controller types.
 */

import type { createGame } from '../game';
import type { createScreenManager } from '../ui/common/screens';
import type { MissionRenderers } from './mission-renderer';

/** Campaign controller state */
export interface CampaignController {
  container: HTMLElement;
  screenManager: ReturnType<typeof createScreenManager>;
  missionContainer: HTMLElement | null;
  game: ReturnType<typeof createGame> | null;
  missionRenderers: MissionRenderers | null;
  missionEnded: boolean;
  /** Tracks if we paused a mission to go to settings (for proper resume) */
  pausedMissionForSettings: boolean;
}
