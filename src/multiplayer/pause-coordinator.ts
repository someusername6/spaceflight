/**
 * Pause Coordinator - Central coordinator for multiplayer mission pause.
 *
 * Handles:
 * - Pause request broadcasting
 * - Ready-to-resume state tracking
 * - 5-second resume countdown
 * - Player disconnect detection
 * - Player drop (convert to AI)
 * - Guest quit requests
 */

import type { SkillLevel } from '../campaign/types';
import { pauseGame, resumeGame } from '../game';
import type { ChatEntry } from './lobby-state';
import {
  pauseMultiplayerGameLoop,
  resumeMultiplayerGameLoop,
} from './multiplayer-game-loop';
import {
  type HandlerContext,
  lobbyPlayersToPausePlayers,
  setupPauseHandlers,
} from './pause-coordinator-handlers';
import {
  COUNTDOWN_INTERVAL_MS,
  type PauseCoordinatorConfig,
  type PauseCoordinatorHandle,
  RESUME_COUNTDOWN_SECONDS,
  skillLevelToNumeric,
} from './pause-coordinator-types';
import {
  addPauseChatMessage,
  areAllPlayersReady,
  createPauseState,
  dropPlayer as dropPlayerState,
  type PauseReason,
  type PauseState,
  setCountdown,
  setPlayerReady,
} from './pause-state';
import { GameMessageType } from './protocol/types';

// Re-export types for consumers
export type {
  OnGuestQuitCallback,
  OnPauseStateChangeCallback,
  OnPauseTriggeredCallback,
  OnPlayerDisconnectCallback,
  OnPlayerDroppedCallback,
  OnResumeCallback,
  PauseCoordinatorConfig,
  PauseCoordinatorHandle,
} from './pause-coordinator-types';

// =============================================================================
// Implementation
// =============================================================================

/**
 * Initialize pause coordination for a multiplayer mission.
 */
export function initPauseCoordination(
  config: PauseCoordinatorConfig,
): PauseCoordinatorHandle {
  const { router, game, lobbyContext } = config;
  const { isHost, localPlayerId, lobbyState } = lobbyContext;

  let pauseState: PauseState | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let nextChatId = 1;

  // =========================================================================
  // Internal helpers
  // =========================================================================

  function getLocalCallsign(): string {
    const player = lobbyState.players.find((p) => p.playerId === localPlayerId);
    return player?.callsign ?? 'Unknown';
  }

  function createSystemMessage(text: string): ChatEntry {
    return {
      id: nextChatId++,
      type: 'system',
      fromPlayerId: null,
      fromCallsign: null,
      text,
      timestamp: Date.now(),
    };
  }

  function updateState(newState: PauseState): void {
    pauseState = newState;
    config.onPauseStateChange?.(newState);
  }

  function stopCountdown(): void {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function startCountdown(): void {
    if (countdownInterval || !pauseState) return;

    let seconds = RESUME_COUNTDOWN_SECONDS;
    let currentState = setCountdown(pauseState, seconds);
    updateState(currentState);

    if (isHost) {
      const msg = createSystemMessage(`Resuming in ${seconds}...`);
      currentState = addPauseChatMessage(currentState, msg);
      updateState(currentState);
      router.broadcast({
        type: GameMessageType.LaunchCountdown,
        secondsRemaining: seconds,
      });
    }

    countdownInterval = setInterval(() => {
      if (!pauseState) {
        stopCountdown();
        return;
      }

      if (!areAllPlayersReady(pauseState)) {
        stopCountdown();
        let abortedState = setCountdown(pauseState, null);
        const abortMsg = createSystemMessage(
          'Countdown aborted - player not ready',
        );
        abortedState = addPauseChatMessage(abortedState, abortMsg);
        updateState(abortedState);
        return;
      }

      seconds--;

      if (seconds <= 0) {
        stopCountdown();
        updateState(setCountdown(pauseState, 0));
        if (isHost) {
          router.broadcast({
            type: GameMessageType.LaunchCountdown,
            secondsRemaining: 0,
          });
        }
        doResume();
      } else {
        updateState(setCountdown(pauseState, seconds));
        if (isHost) {
          router.broadcast({
            type: GameMessageType.LaunchCountdown,
            secondsRemaining: seconds,
          });
        }
      }
    }, COUNTDOWN_INTERVAL_MS);
  }

  function doPause(
    reason: PauseReason,
    initiatedBy: string,
    initiatedByCallsign: string,
  ): void {
    const mpState = config.getMultiplayerGameState?.();
    if (mpState) {
      pauseMultiplayerGameLoop(mpState);
    } else {
      pauseGame(game);
    }

    pauseState = createPauseState({
      reason,
      initiatedBy,
      initiatedByCallsign,
      players: lobbyPlayersToPausePlayers(lobbyState.players),
      localPlayerId,
      isHost,
    });

    const msg = createSystemMessage(`Game paused by ${initiatedByCallsign}`);
    pauseState = addPauseChatMessage(pauseState, msg);

    config.onPauseTriggered?.(reason, initiatedBy, initiatedByCallsign);
    config.onPauseStateChange?.(pauseState);
  }

  function doResume(): void {
    pauseState = null;
    const mpState = config.getMultiplayerGameState?.();
    if (mpState) {
      resumeMultiplayerGameLoop(mpState);
    } else {
      resumeGame(game);
    }
    config.onResume?.();
  }

  // =========================================================================
  // Set up message handlers
  // =========================================================================

  const handlerCtx: HandlerContext = {
    router,
    isHost,
    localPlayerId,
    lobbyState,
    getPauseState: () => pauseState,
    setPauseState: updateState,
    getNextChatId: () => nextChatId++,
    startCountdown,
    doPause,
    doResume,
    onPlayerDropped: config.onPlayerDropped,
    onGuestQuit: config.onGuestQuit,
    onPlayerDisconnect: config.onPlayerDisconnect,
  };

  setupPauseHandlers(handlerCtx);

  // =========================================================================
  // Public API
  // =========================================================================

  const handle: PauseCoordinatorHandle = {
    requestPause(reason: PauseReason = 'player-request'): void {
      if (pauseState) return;

      const callsign = getLocalCallsign();
      doPause(reason, localPlayerId, callsign);

      router.broadcast({
        type: GameMessageType.PauseRequest,
        playerId: localPlayerId,
        callsign,
        reason,
      });
    },

    setReadyToResume(ready: boolean): void {
      if (!pauseState) return;

      const newState = setPlayerReady(pauseState, localPlayerId, ready);
      updateState(newState);

      router.broadcast({
        type: GameMessageType.PauseReadyState,
        playerId: localPlayerId,
        ready,
      });

      if (ready && areAllPlayersReady(newState) && !countdownInterval) {
        startCountdown();
      }
    },

    dropPlayer(playerId: string, aiSkill: SkillLevel): void {
      if (!isHost || !pauseState) return;

      let newState = dropPlayerState(pauseState, playerId, aiSkill);
      updateState(newState);

      router.broadcast({
        type: GameMessageType.PlayerDropped,
        playerId,
        aiSkill: skillLevelToNumeric(aiSkill),
      });

      const player = newState.players.find((p) => p.playerId === playerId);
      const callsign = player?.callsign ?? 'Unknown';
      const systemMsg = createSystemMessage(
        `${callsign} dropped - now AI (${aiSkill})`,
      );
      newState = addPauseChatMessage(newState, systemMsg);
      updateState(newState);

      config.onPlayerDropped?.(playerId, aiSkill);
    },

    requestQuit(): void {
      if (isHost) return;

      router.sendToHost({
        type: GameMessageType.GuestQuitRequest,
        playerId: localPlayerId,
      });
    },

    getPauseState(): PauseState | null {
      return pauseState;
    },

    isPaused(): boolean {
      return pauseState !== null;
    },

    destroy(): void {
      stopCountdown();
      pauseState = null;
    },
  };

  return handle;
}
