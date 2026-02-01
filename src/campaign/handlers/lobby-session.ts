/**
 * Lobby Session - Session lifecycle handling for lobby.
 *
 * Handles session cleanup and navigation when sessions end.
 */

import { clearMultiplayerContext } from '../../multiplayer/multiplayer-context';
import { broadcastSessionEnded } from '../../multiplayer/session-lifecycle';
import { goBackFromLobby, Screen } from '../../ui/common/screens';
import { showAlert } from '../../ui/screens/alert-modal';
import { cleanupLobbyScreen } from '../../ui/screens/lobby';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import { getLobbyContext, setLobbyContext } from './lobby-context';

/**
 * Handle session ended for guest (host quit or campaign ended).
 * Clean up and navigate back to title screen.
 *
 * If the guest is already on the game over screen (ironman death),
 * just clean up the connection - they'll navigate via the button.
 */
export async function handleSessionEndedForGuest(
  controller: CampaignController,
  reason: string,
): Promise<void> {
  // Clean up lobby (don't broadcast - we're the guest receiving the end message)
  const ctx = getLobbyContext();
  if (ctx) {
    ctx.cleanup();
    ctx.connectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    ctx.connectionFlow.dispose();
  }
  cleanupLobbyScreen();
  clearMultiplayerContext();
  setLobbyContext(null);

  // If already on game over screen (ironman death), don't navigate away
  // The guest will click "Start New Campaign" to leave
  if (controller.screenManager.currentScreen === Screen.GAME_OVER) {
    return;
  }

  // Navigate to title and re-setup title screen handlers
  goBackFromLobby(controller.screenManager);
  const { setupTitleScreen } = await import('./menu-handlers');
  const onStartGameplay = () => startCampaignGameplay(controller);
  void setupTitleScreen(controller, onStartGameplay);

  // Show notification about why session ended
  await showAlert('Session Ended', reason, 'OK');
}

/**
 * Clean up lobby state and connections.
 * Called when leaving the lobby (back button, host quit, etc.)
 */
export function cleanupLobby(): void {
  const ctx = getLobbyContext();
  if (ctx) {
    // Host broadcasts SessionEnded before leaving so guests know to return to title
    if (ctx.isHost) {
      broadcastSessionEnded(ctx, 'Host left the session');
    }

    // Run cleanup (router, sync manager, transport handlers)
    ctx.cleanup();

    // Disconnect and dispose connection flow
    ctx.connectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    ctx.connectionFlow.dispose();
  }

  // Cleanup screen
  cleanupLobbyScreen();

  // Clear multiplayer context
  clearMultiplayerContext();

  // Clear lobby context
  setLobbyContext(null);
}
