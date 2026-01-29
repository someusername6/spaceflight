/**
 * Lobby State Unit Tests
 *
 * Tests for lobby state management functions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  addChatMessage,
  addPlayer,
  addSystemMessage,
  clearErrorMessage,
  createLobbyState,
  getLocalPlayer,
  getPlayer,
  removePlayer,
  setErrorMessage,
  setPlayerPing,
  setPlayerReady,
  setPlayerShip,
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

  describe('Player Management', () => {
    it('adds a player to the lobby', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host',
        isHost: true,
      });

      const player = {
        playerId: 'guest1',
        callsign: 'Guest',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 50,
      };

      const newState = addPlayer(state, player);

      assert.strictEqual(newState.players.length, 1);
      assert.deepStrictEqual(newState.players[0], player);
      // Original state unchanged
      assert.strictEqual(state.players.length, 0);
    });

    it('does not add duplicate player', () => {
      const player = {
        playerId: 'player1',
        callsign: 'Player',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host',
        isHost: true,
        initialPlayers: [player],
      });

      state = addPlayer(state, player);

      assert.strictEqual(state.players.length, 1);
    });

    it('removes a player from the lobby', () => {
      const player1 = {
        playerId: 'player1',
        callsign: 'Player 1',
        shipId: null,
        isReady: false,
        isHost: true,
        ping: 0,
      };
      const player2 = {
        playerId: 'player2',
        callsign: 'Player 2',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 50,
      };

      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: true,
        initialPlayers: [player1, player2],
      });

      state = removePlayer(state, 'player2');

      assert.strictEqual(state.players.length, 1);
      assert.strictEqual(state.players[0].playerId, 'player1');
    });

    it('updates player ready status', () => {
      const player = {
        playerId: 'player1',
        callsign: 'Player',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: false,
        initialPlayers: [player],
      });

      state = setPlayerReady(state, 'player1', true);

      assert.strictEqual(state.players[0].isReady, true);
    });

    it('updates player ping', () => {
      const player = {
        playerId: 'player1',
        callsign: 'Player',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: false,
        initialPlayers: [player],
      });

      state = setPlayerPing(state, 'player1', 75);

      assert.strictEqual(state.players[0].ping, 75);
    });

    it('updates player ship assignment', () => {
      const player = {
        playerId: 'player1',
        callsign: 'Player',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: false,
        initialPlayers: [player],
      });

      state = setPlayerShip(state, 'player1', 1);

      assert.strictEqual(state.players[0].shipId, 1);
    });

    it('gets player by ID', () => {
      const player = {
        playerId: 'player1',
        callsign: 'Player',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player1',
        isHost: false,
        initialPlayers: [player],
      });

      const found = getPlayer(state, 'player1');
      assert.deepStrictEqual(found, player);

      const notFound = getPlayer(state, 'nonexistent');
      assert.strictEqual(notFound, undefined);
    });

    it('gets local player', () => {
      const player = {
        playerId: 'local',
        callsign: 'Local',
        shipId: null,
        isReady: false,
        isHost: true,
        ping: 0,
      };

      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'local',
        isHost: true,
        initialPlayers: [player],
      });

      const localPlayer = getLocalPlayer(state);
      assert.deepStrictEqual(localPlayer, player);
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
