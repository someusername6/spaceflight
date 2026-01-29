/**
 * Lobby State Unit Tests
 *
 * Tests for lobby state management functions.
 * Player management tests are in test-lobby-state-players.mjs.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  addChatMessage,
  addSystemMessage,
  clearErrorMessage,
  createLobbyState,
  setErrorMessage,
} from '../../../../src/multiplayer/lobby-state.ts';

describe('Lobby State', () => {
  describe('createLobbyState', () => {
    it('creates initial state with required fields', () => {
      const state = createLobbyState({
        roomCode: 'ABCD1234',
        localPlayerId: 'player1',
        isHost: true,
      });

      assert.strictEqual(state.roomCode, 'ABCD1234');
      assert.strictEqual(state.localPlayerId, 'player1');
      assert.strictEqual(state.isHost, true);
      assert.deepStrictEqual(state.players, []);
      assert.deepStrictEqual(state.chatMessages, []);
      assert.strictEqual(state.errorMessage, null);
    });

    it('creates state with initial players', () => {
      const player = {
        playerId: 'player1',
        callsign: 'Host',
        shipId: null,
        isReady: false,
        isHost: true,
        ping: 0,
      };

      const state = createLobbyState({
        roomCode: 'ABCD1234',
        localPlayerId: 'player1',
        isHost: true,
        initialPlayers: [player],
      });

      assert.strictEqual(state.players.length, 1);
      assert.deepStrictEqual(state.players[0], player);
    });
  });

  describe('Chat Management', () => {
    it('adds a chat message', () => {
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: true,
      });

      const timestamp = Date.now();
      state = addChatMessage(state, 'player1', 'Host', 'Hello!', timestamp);

      assert.strictEqual(state.chatMessages.length, 1);
      assert.strictEqual(state.chatMessages[0].type, 'chat');
      assert.strictEqual(state.chatMessages[0].fromPlayerId, 'player1');
      assert.strictEqual(state.chatMessages[0].fromCallsign, 'Host');
      assert.strictEqual(state.chatMessages[0].text, 'Hello!');
      assert.strictEqual(state.chatMessages[0].timestamp, timestamp);
    });

    it('adds a system message', () => {
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: true,
      });

      state = addSystemMessage(state, 'Player joined');

      assert.strictEqual(state.chatMessages.length, 1);
      assert.strictEqual(state.chatMessages[0].type, 'system');
      assert.strictEqual(state.chatMessages[0].fromPlayerId, null);
      assert.strictEqual(state.chatMessages[0].fromCallsign, null);
      assert.strictEqual(state.chatMessages[0].text, 'Player joined');
    });

    it('assigns unique IDs to messages', () => {
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: true,
      });

      state = addSystemMessage(state, 'Message 1');
      state = addSystemMessage(state, 'Message 2');
      state = addChatMessage(state, 'p1', 'User', 'Message 3', Date.now());

      const ids = state.chatMessages.map((m) => m.id);
      const uniqueIds = [...new Set(ids)];
      assert.strictEqual(ids.length, uniqueIds.length);
    });
  });

  describe('Error Management', () => {
    it('sets error message', () => {
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: true,
      });

      state = setErrorMessage(state, 'Connection lost');

      assert.strictEqual(state.errorMessage, 'Connection lost');
    });

    it('clears error message', () => {
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: true,
      });

      state = setErrorMessage(state, 'Error');
      state = clearErrorMessage(state);

      assert.strictEqual(state.errorMessage, null);
    });
  });
});
