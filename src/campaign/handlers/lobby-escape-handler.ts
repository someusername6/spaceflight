/**
 * Lobby Escape Handler - Setup global escape handler for multiplayer.
 *
 * Extracted from lobby-handlers.ts for file size management.
 */

import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import { setupSettingsScreen, setupTitleScreen } from './menu-handlers';
import { setupEscapeHandler } from './pause-handler';

// =============================================================================
// Escape Handler Setup for Multiplayer
// =============================================================================

/**
 * Setup the global escape key handler for multiplayer mode.
 * Called when entering the lobby to enable pause during missions.
 */
export function setupMultiplayerEscapeHandler(
  controller: CampaignController,
): void {
  const onStartGameplay = () => startCampaignGameplay(controller);

  // Settings callback - navigates to settings with return capability
  const setupSettings = (ctrl: CampaignController) => {
    void setupSettingsScreen(ctrl, onStartGameplay, () => {
      // Re-setup is not needed for multiplayer (we return to mission)
    });
  };

  // Title callback - for returning to title on quit
  const setupTitle = async (ctrl: CampaignController): Promise<void> => {
    await setupTitleScreen(ctrl, onStartGameplay);
  };

  setupEscapeHandler(controller, setupSettings, setupTitle);
}
