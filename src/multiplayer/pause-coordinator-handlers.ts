/**
 * Pause Coordinator Handlers - Message handlers for multiplayer pause.
 *
 * Extracted from pause-coordinator.ts to meet file size constraints.
 */

import type { SkillLevel } from '../campaign/types';
import type { ChatEntry, LobbyPlayer } from './lobby-state';
import { numericToSkillLevel } from './pause-coordinator-types';
import {
  addPauseChatMessage,
  areAllPlayersReady,
  dropPlayer as dropPlayerState,
  type PausePlayer,
  type PauseReason,
  type PauseState,
  setCountdown,
  setPlayerReady,
  setPlayerStatus,
} from './pause-state';
import type { MessageRouter } from './protocol/router';
import { GameMessageType } from './protocol/types';

// =============================================================================
// Types for Handler Setup
// =============================================================================

export interface HandlerContext {
  router: MessageRouter;
  isHost: boolean;
  localPlayerId: string;
  lobbyState: { players: LobbyPlayer[] };
  getPauseState: () => PauseState | null;
  setPauseState: (state: PauseState) => void;
  getNextChatId: () => number;
  startCountdown: () => void;
  doPause: (
    reason: PauseReason,
    initiatedBy: string,
    initiatedByCallsign: string,
  ) => void;
  doResume: () => void;
  onPlayerDropped?:
    | ((playerId: string, aiSkill: SkillLevel) => void)
    | undefined;
  onGuestQuit?: ((playerId: string) => void) | undefined;
  onPlayerDisconnect?: ((playerId: string) => void) | undefined;
}

// =============================================================================
// Handler Setup
// =============================================================================

/**
 * Set up all message handlers for pause coordination.
 */
export function setupPauseHandlers(ctx: HandlerContext): void {
  const { router, isHost, lobbyState } = ctx;

  // Handle pause request from other players
  router.onPauseRequest((msg) => {
    if (ctx.getPauseState()) return; // Already paused
    ctx.doPause(msg.reason, msg.playerId, msg.callsign);
  });

  // Handle chat messages during pause
  router.onChatMessage((msg) => {
    const pauseState = ctx.getPauseState();
    if (!pauseState) return;

    const player = pauseState.players.find(
      (p) => p.playerId === msg.fromPlayerId,
    );
    const callsign = player?.callsign ?? 'Unknown';

    const chatEntry: ChatEntry = {
      id: ctx.getNextChatId(),
      type: 'chat',
      fromPlayerId: msg.fromPlayerId,
      fromCallsign: callsign,
      text: msg.text,
      timestamp: msg.timestamp,
    };

    ctx.setPauseState(addPauseChatMessage(pauseState, chatEntry));
  });

  // Handle pause ready state from other players
  router.onPauseReadyState((msg) => {
    const pauseState = ctx.getPauseState();
    if (!pauseState) return;

    const newState = setPlayerReady(pauseState, msg.playerId, msg.ready);
    ctx.setPauseState(newState);

    if (areAllPlayersReady(newState)) {
      ctx.startCountdown();
    }
  });

  // Handle player dropped
  router.onPlayerDropped((msg) => {
    const pauseState = ctx.getPauseState();
    if (!pauseState) return;

    const aiSkill = numericToSkillLevel(msg.aiSkill);
    let newState = dropPlayerState(pauseState, msg.playerId, aiSkill);

    const player = newState.players.find((p) => p.playerId === msg.playerId);
    const callsign = player?.callsign ?? 'Unknown';
    const systemMsg = createSystemMessage(
      ctx,
      `${callsign} is now AI-controlled (${aiSkill})`,
    );
    newState = addPauseChatMessage(newState, systemMsg);
    ctx.setPauseState(newState);

    ctx.onPlayerDropped?.(msg.playerId, aiSkill);
  });

  // Handle guest quit request (host only)
  router.onGuestQuitRequest((msg) => {
    const pauseState = ctx.getPauseState();
    if (!isHost || !pauseState) return;

    const aiSkill: SkillLevel = 'regular';
    let newState = dropPlayerState(pauseState, msg.playerId, aiSkill);

    router.broadcast({
      type: GameMessageType.PlayerDropped,
      playerId: msg.playerId,
      aiSkill: 1,
    });

    const player = newState.players.find((p) => p.playerId === msg.playerId);
    const callsign = player?.callsign ?? 'Unknown';
    const systemMsg = createSystemMessage(
      ctx,
      `${callsign} has left the mission`,
    );
    newState = addPauseChatMessage(newState, systemMsg);
    ctx.setPauseState(newState);

    ctx.onGuestQuit?.(msg.playerId);
  });

  // Handle countdown from host (guests)
  router.onLaunchCountdown((msg) => {
    const pauseState = ctx.getPauseState();
    if (isHost || !pauseState) return;

    ctx.setPauseState(setCountdown(pauseState, msg.secondsRemaining));

    if (msg.secondsRemaining <= 0) {
      ctx.doResume();
    }
  });

  // Handle peer disconnect
  router.onPeerDisconnect = (peerId: string) => {
    const player = lobbyState.players.find((p) => p.playerId === peerId);
    if (!player) return;

    const callsign = player.callsign;
    ctx.onPlayerDisconnect?.(peerId);

    const pauseState = ctx.getPauseState();
    if (pauseState) {
      let newState = setPlayerStatus(pauseState, peerId, 'disconnected');
      const systemMsg = createSystemMessage(ctx, `${callsign} disconnected`);
      newState = addPauseChatMessage(newState, systemMsg);
      ctx.setPauseState(newState);
    } else {
      ctx.doPause('player-disconnect', peerId, callsign);

      const newPauseState = ctx.getPauseState();
      if (newPauseState) {
        let newState = setPlayerStatus(newPauseState, peerId, 'disconnected');
        const systemMsg = createSystemMessage(ctx, `${callsign} disconnected`);
        newState = addPauseChatMessage(newState, systemMsg);
        ctx.setPauseState(newState);
      }

      router.broadcast({
        type: GameMessageType.PauseRequest,
        playerId: peerId,
        callsign,
        reason: 'player-disconnect',
      });
    }
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createSystemMessage(ctx: HandlerContext, text: string): ChatEntry {
  return {
    id: ctx.getNextChatId(),
    type: 'system',
    fromPlayerId: null,
    fromCallsign: null,
    text,
    timestamp: Date.now(),
  };
}

/**
 * Convert lobby players to pause players.
 */
export function lobbyPlayersToPausePlayers(
  players: LobbyPlayer[],
): PausePlayer[] {
  return players.map((p) => ({
    playerId: p.playerId,
    callsign: p.callsign,
    isReady: false,
    status: 'connected',
    isHost: p.isHost,
  }));
}
