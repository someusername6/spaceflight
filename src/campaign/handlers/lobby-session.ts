/**
 * Lobby Session - Session lifecycle handling for lobby.
 *
 * Handles session cleanup and navigation when sessions end.
 */

import { resetActionClient } from '../../multiplayer/action-client';
import { clearAllRateLimits } from '../../multiplayer/chat-validation';
import { resetLaunchState } from '../../multiplayer/launch-flow';
import { resetChatMessageIds } from '../../multiplayer/lobby-state';
import { clearMultiplayerContext } from '../../multiplayer/multiplayer-context';
import { broadcastSessionEnded } from '../../multiplayer/session-lifecycle';
import { goBackFromLobby, Screen } from '../../ui/common/screens';
import { showAlert } from '../../ui/screens/alert-modal';
import { cleanupLobbyScreen } from '../../ui/screens/lobby';
import { startCampaignGameplay } from '../controller';
import type { CampaignController } from '../controller-types';
import { getLobbyContext, setLobbyContext } from './lobby-context';
import { setupTitleScreen } from './menu-handlers';

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
  // Guard against duplicate calls (SessionEnded message + host disconnect can both fire)
  const ctx = getLobbyContext();
  if (!ctx) return;
  ctx.cleanup();
  ctx.connectionFlow.disconnect().catch(() => {
    // Ignore disconnect errors
  });
  ctx.connectionFlow.dispose();
  cleanupLobbyScreen();
  clearMultiplayerContext();
  resetLaunchState();
  resetActionClient();
  clearAllRateLimits();
  resetChatMessageIds();
  setLobbyContext(null);

  // If already on game over screen (ironman death), don't navigate away
  // The guest will click "Start New Campaign" to leave
  if (controller.screenManager.currentScreen === Screen.GAME_OVER) {
    return;
  }

  // Navigate to title and re-setup title screen handlers
  goBackFromLobby(controller.screenManager);
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

    // Defer connection teardown so the SessionEnded message has time to flush
    // through the WebRTC data channel before the connection is closed.
    // The disconnect (which notifies the signaling server) must complete
    // before dispose tears down resources.
    const connectionFlow = ctx.connectionFlow;
    setTimeout(async () => {
      try {
        await connectionFlow.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      connectionFlow.dispose();
    }, 50);
  }

  // Cleanup screen
  cleanupLobbyScreen();

  // Clear multiplayer context
  clearMultiplayerContext();

  // Reset launch flow state
  resetLaunchState();

  // Reset action client state (pending requests, handler flag)
  resetActionClient();

  // Clear chat rate limits and message ID counter
  clearAllRateLimits();
  resetChatMessageIds();

  // Clear lobby context
  setLobbyContext(null);
}
