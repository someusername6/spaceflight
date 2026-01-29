/**
 * Lobby State Player Management Tests
 *
 * Tests for player-related lobby state functions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  addPlayer,
  createLobbyState,
  getLocalPlayer,
  getPlayer,
  removePlayer,
  setPlayerCallsign,
  setPlayerPing,
  setPlayerReady,
  setPlayerShip,
} from '../../../../src/multiplayer/lobby-state.ts';

describe('Lobby State - Player Management', () => {
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

  it('updates player callsign', () => {
    const player = {
      playerId: 'player1',
      callsign: 'OldName',
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

    state = setPlayerCallsign(state, 'player1', 'NewName');

    assert.strictEqual(state.players[0].callsign, 'NewName');
  });

  it('setPlayerCallsign returns new state object (immutable)', () => {
    const player = {
      playerId: 'player1',
      callsign: 'OldName',
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

    const newState = setPlayerCallsign(state, 'player1', 'NewName');

    // Original state unchanged
    assert.strictEqual(state.players[0].callsign, 'OldName');
    // New state has updated callsign
    assert.strictEqual(newState.players[0].callsign, 'NewName');
    // Different state objects
    assert.notStrictEqual(state, newState);
  });

  it('setPlayerCallsign does not affect other players', () => {
    const player1 = {
      playerId: 'player1',
      callsign: 'Player1',
      shipId: null,
      isReady: false,
      isHost: false,
      ping: 0,
    };
    const player2 = {
      playerId: 'player2',
      callsign: 'Player2',
      shipId: null,
      isReady: false,
      isHost: false,
      ping: 0,
    };

    let state = createLobbyState({
      roomCode: 'TEST1234',
      localPlayerId: 'player1',
      isHost: false,
      initialPlayers: [player1, player2],
    });

    state = setPlayerCallsign(state, 'player1', 'NewPlayer1');

    assert.strictEqual(state.players[0].callsign, 'NewPlayer1');
    assert.strictEqual(state.players[1].callsign, 'Player2');
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
