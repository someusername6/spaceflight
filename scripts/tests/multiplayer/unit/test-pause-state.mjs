/**
 * Unit tests for pause-state.ts
 *
 * Tests the pure state management functions for multiplayer pause.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  addPauseChatMessage,
  areAllPlayersReady,
  createPauseState,
  dropPlayer,
  getConnectedPlayerCount,
  getLocalPausePlayer,
  setCountdown,
  setPlayerReady,
  setPlayerStatus,
} from '../../../../src/multiplayer/pause-state.ts';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestPlayers() {
  return [
    {
      playerId: 'host-1',
      callsign: 'Alpha',
      isReady: false,
      status: 'connected',
      isHost: true,
    },
    {
      playerId: 'guest-1',
      callsign: 'Beta',
      isReady: false,
      status: 'connected',
      isHost: false,
    },
  ];
}

function createTestState() {
  return createPauseState({
    reason: 'player-request',
    initiatedBy: 'host-1',
    initiatedByCallsign: 'Alpha',
    players: createTestPlayers(),
    localPlayerId: 'host-1',
    isHost: true,
  });
}

// =============================================================================
// Tests: createPauseState
// =============================================================================

describe('pause-state', () => {
  describe('createPauseState', () => {
    it('creates state with provided values', () => {
      const players = createTestPlayers();
      const state = createPauseState({
        reason: 'player-disconnect',
        initiatedBy: 'guest-1',
        initiatedByCallsign: 'Beta',
        players,
        localPlayerId: 'host-1',
        isHost: true,
      });

      assert.strictEqual(state.reason, 'player-disconnect');
      assert.strictEqual(state.initiatedBy, 'guest-1');
      assert.strictEqual(state.initiatedByCallsign, 'Beta');
      assert.strictEqual(state.localPlayerId, 'host-1');
      assert.strictEqual(state.isHost, true);
      assert.deepStrictEqual(state.players, players);
    });

    it('initializes with empty chat messages', () => {
      const state = createTestState();
      assert.deepStrictEqual(state.chatMessages, []);
    });

    it('initializes with null countdown', () => {
      const state = createTestState();
      assert.strictEqual(state.countdownSeconds, null);
    });
  });

  // ===========================================================================
  // Tests: setPlayerReady
  // ===========================================================================

  describe('setPlayerReady', () => {
    it('sets player ready state to true', () => {
      const state = createTestState();
      const newState = setPlayerReady(state, 'guest-1', true);

      const guest = newState.players.find((p) => p.playerId === 'guest-1');
      assert.strictEqual(guest.isReady, true);
    });

    it('sets player ready state to false', () => {
      let state = createTestState();
      state = setPlayerReady(state, 'guest-1', true);
      state = setPlayerReady(state, 'guest-1', false);

      const guest = state.players.find((p) => p.playerId === 'guest-1');
      assert.strictEqual(guest.isReady, false);
    });

    it('does not modify other players', () => {
      const state = createTestState();
      const newState = setPlayerReady(state, 'guest-1', true);

      const host = newState.players.find((p) => p.playerId === 'host-1');
      assert.strictEqual(host.isReady, false);
    });

    it('returns new state object (immutable)', () => {
      const state = createTestState();
      const newState = setPlayerReady(state, 'guest-1', true);

      assert.notStrictEqual(state, newState);
      assert.notStrictEqual(state.players, newState.players);
    });
  });

  // ===========================================================================
  // Tests: setPlayerStatus
  // ===========================================================================

  describe('setPlayerStatus', () => {
    it('sets player status to disconnected', () => {
      const state = createTestState();
      const newState = setPlayerStatus(state, 'guest-1', 'disconnected');

      const guest = newState.players.find((p) => p.playerId === 'guest-1');
      assert.strictEqual(guest.status, 'disconnected');
    });

    it('sets player status to dropped', () => {
      const state = createTestState();
      const newState = setPlayerStatus(state, 'guest-1', 'dropped');

      const guest = newState.players.find((p) => p.playerId === 'guest-1');
      assert.strictEqual(guest.status, 'dropped');
    });

    it('does not modify other players', () => {
      const state = createTestState();
      const newState = setPlayerStatus(state, 'guest-1', 'disconnected');

      const host = newState.players.find((p) => p.playerId === 'host-1');
      assert.strictEqual(host.status, 'connected');
    });
  });

  // ===========================================================================
  // Tests: dropPlayer
  // ===========================================================================

  describe('dropPlayer', () => {
    it('marks player as dropped with AI skill', () => {
      const state = createTestState();
      const newState = dropPlayer(state, 'guest-1', 'regular');

      const guest = newState.players.find((p) => p.playerId === 'guest-1');
      assert.strictEqual(guest.status, 'dropped');
      assert.strictEqual(guest.droppedAISkill, 'regular');
    });

    it('supports different AI skill levels', () => {
      const state = createTestState();
      const newState = dropPlayer(state, 'guest-1', 'veteran');

      const guest = newState.players.find((p) => p.playerId === 'guest-1');
      assert.strictEqual(guest.droppedAISkill, 'veteran');
    });

    it('does not modify other players', () => {
      const state = createTestState();
      const newState = dropPlayer(state, 'guest-1', 'regular');

      const host = newState.players.find((p) => p.playerId === 'host-1');
      assert.strictEqual(host.status, 'connected');
      assert.strictEqual(host.droppedAISkill, undefined);
    });
  });

  // ===========================================================================
  // Tests: setCountdown
  // ===========================================================================

  describe('setCountdown', () => {
    it('sets countdown seconds', () => {
      const state = createTestState();
      const newState = setCountdown(state, 5);

      assert.strictEqual(newState.countdownSeconds, 5);
    });

    it('clears countdown with null', () => {
      let state = createTestState();
      state = setCountdown(state, 5);
      state = setCountdown(state, null);

      assert.strictEqual(state.countdownSeconds, null);
    });

    it('sets countdown to zero', () => {
      const state = createTestState();
      const newState = setCountdown(state, 0);

      assert.strictEqual(newState.countdownSeconds, 0);
    });
  });

  // ===========================================================================
  // Tests: addPauseChatMessage
  // ===========================================================================

  describe('addPauseChatMessage', () => {
    it('adds chat message to state', () => {
      const state = createTestState();
      const message = {
        id: 1,
        type: 'chat',
        fromPlayerId: 'host-1',
        fromCallsign: 'Alpha',
        text: 'Hello',
        timestamp: Date.now(),
      };

      const newState = addPauseChatMessage(state, message);

      assert.strictEqual(newState.chatMessages.length, 1);
      assert.deepStrictEqual(newState.chatMessages[0], message);
    });

    it('appends multiple messages', () => {
      let state = createTestState();
      const msg1 = {
        id: 1,
        type: 'chat',
        fromPlayerId: 'host-1',
        fromCallsign: 'Alpha',
        text: 'First',
        timestamp: 1000,
      };
      const msg2 = {
        id: 2,
        type: 'chat',
        fromPlayerId: 'guest-1',
        fromCallsign: 'Beta',
        text: 'Second',
        timestamp: 2000,
      };

      state = addPauseChatMessage(state, msg1);
      state = addPauseChatMessage(state, msg2);

      assert.strictEqual(state.chatMessages.length, 2);
      assert.strictEqual(state.chatMessages[0].text, 'First');
      assert.strictEqual(state.chatMessages[1].text, 'Second');
    });

    it('does not modify original state (immutable)', () => {
      const state = createTestState();
      const message = {
        id: 1,
        type: 'system',
        fromPlayerId: null,
        fromCallsign: null,
        text: 'System message',
        timestamp: Date.now(),
      };

      const newState = addPauseChatMessage(state, message);

      assert.strictEqual(state.chatMessages.length, 0);
      assert.strictEqual(newState.chatMessages.length, 1);
    });
  });

  // ===========================================================================
  // Tests: areAllPlayersReady
  // ===========================================================================

  describe('areAllPlayersReady', () => {
    it('returns false when no players are ready', () => {
      const state = createTestState();
      assert.strictEqual(areAllPlayersReady(state), false);
    });

    it('returns false when only some players are ready', () => {
      let state = createTestState();
      state = setPlayerReady(state, 'host-1', true);

      assert.strictEqual(areAllPlayersReady(state), false);
    });

    it('returns true when all connected players are ready', () => {
      let state = createTestState();
      state = setPlayerReady(state, 'host-1', true);
      state = setPlayerReady(state, 'guest-1', true);

      assert.strictEqual(areAllPlayersReady(state), true);
    });

    it('ignores disconnected players', () => {
      let state = createTestState();
      state = setPlayerReady(state, 'host-1', true);
      state = setPlayerStatus(state, 'guest-1', 'disconnected');

      assert.strictEqual(areAllPlayersReady(state), true);
    });

    it('ignores dropped players', () => {
      let state = createTestState();
      state = setPlayerReady(state, 'host-1', true);
      state = dropPlayer(state, 'guest-1', 'regular');

      assert.strictEqual(areAllPlayersReady(state), true);
    });

    it('returns false when no connected players remain', () => {
      let state = createTestState();
      state = setPlayerStatus(state, 'host-1', 'disconnected');
      state = setPlayerStatus(state, 'guest-1', 'disconnected');

      assert.strictEqual(areAllPlayersReady(state), false);
    });
  });

  // ===========================================================================
  // Tests: getLocalPausePlayer
  // ===========================================================================

  describe('getLocalPausePlayer', () => {
    it('returns local player when they exist', () => {
      const state = createTestState();
      const local = getLocalPausePlayer(state);

      assert.strictEqual(local.playerId, 'host-1');
      assert.strictEqual(local.callsign, 'Alpha');
    });

    it('returns undefined when local player not found', () => {
      const state = createPauseState({
        reason: 'player-request',
        initiatedBy: 'host-1',
        initiatedByCallsign: 'Alpha',
        players: createTestPlayers(),
        localPlayerId: 'unknown-player',
        isHost: false,
      });

      const local = getLocalPausePlayer(state);
      assert.strictEqual(local, undefined);
    });
  });

  // ===========================================================================
  // Tests: getConnectedPlayerCount
  // ===========================================================================

  describe('getConnectedPlayerCount', () => {
    it('counts all connected players', () => {
      const state = createTestState();
      assert.strictEqual(getConnectedPlayerCount(state), 2);
    });

    it('excludes disconnected players', () => {
      let state = createTestState();
      state = setPlayerStatus(state, 'guest-1', 'disconnected');

      assert.strictEqual(getConnectedPlayerCount(state), 1);
    });

    it('excludes dropped players', () => {
      let state = createTestState();
      state = dropPlayer(state, 'guest-1', 'regular');

      assert.strictEqual(getConnectedPlayerCount(state), 1);
    });

    it('returns zero when all disconnected', () => {
      let state = createTestState();
      state = setPlayerStatus(state, 'host-1', 'disconnected');
      state = setPlayerStatus(state, 'guest-1', 'disconnected');

      assert.strictEqual(getConnectedPlayerCount(state), 0);
    });
  });
});
