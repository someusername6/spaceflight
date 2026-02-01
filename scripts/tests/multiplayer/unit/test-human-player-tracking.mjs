/**
 * Human Player Tracking Unit Tests
 *
 * Tests for multiplayer defeat condition: all human players dead.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  spawnGuestFromCampaign,
  spawnPlayerFromCampaign,
} from '../../../../src/campaign/ship-spawning.ts';
import { createSlotArray } from '../../../../src/campaign/slot-array.ts';
import { createWorld, getComponent } from '../../../../src/core/ecs.ts';
import {
  areAllHumanPlayersDead,
  countLivingHumanPlayers,
} from '../../../../src/multiplayer/mission-setup.ts';
import { initCombatStats } from '../../shared/combat-utils.mjs';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestOwnedShip(id, shipClass, pilotName = null) {
  return {
    id,
    shipClass,
    pilot: pilotName
      ? { id: `pilot-${id}`, name: pilotName, skill: 'player' }
      : null,
    primaryWeapons: createSlotArray([
      { weaponType: 'plasma', bankSize: 2, currentAmmo: undefined },
    ]),
    secondaryWeapons: createSlotArray([]),
  };
}

function createTestLobbyPlayer(playerId, callsign, shipId, isHost = false) {
  return {
    playerId,
    callsign,
    shipId,
    isReady: true,
    isHost,
    ping: 50,
    permissions: { store: true, loadout: true, roster: true },
  };
}

// =============================================================================
// Tests: countLivingHumanPlayers
// =============================================================================

describe('Human Player Tracking - countLivingHumanPlayers', () => {
  it('counts all living human players', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');

    spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );
    spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const count = countLivingHumanPlayers(world, players, 'ship1');

    assert.strictEqual(count, 2);
  });

  it('returns 1 when only commander is present (no guests)', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );

    const players = [createTestLobbyPlayer('host-id', 'Commander', null, true)];

    const count = countLivingHumanPlayers(world, players, 'ship1');

    assert.strictEqual(count, 1);
  });

  it('excludes spectators from count', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', null, true),
      createTestLobbyPlayer('spectator-id', 'Spectator', null, false),
    ];

    const count = countLivingHumanPlayers(world, players, 'ship1');

    assert.strictEqual(count, 1);
  });

  it('returns 0 when human player ship is dead', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const entity = spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );

    const health = getComponent(world, entity, 'health');
    health.hull = 0;

    const players = [createTestLobbyPlayer('host-id', 'Commander', null, true)];

    const count = countLivingHumanPlayers(world, players, 'ship1');

    assert.strictEqual(count, 0);
  });

  it('counts correctly when only some humans are dead', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');

    const hostEntity = spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );
    spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const health = getComponent(world, hostEntity, 'health');
    health.hull = 0;

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const count = countLivingHumanPlayers(world, players, 'ship1');

    assert.strictEqual(count, 1);
  });
});

// =============================================================================
// Tests: areAllHumanPlayersDead
// =============================================================================

describe('Human Player Tracking - areAllHumanPlayersDead', () => {
  it('returns false when all humans are alive', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');

    spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );
    spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const allDead = areAllHumanPlayersDead(world, players, 'ship1');

    assert.strictEqual(allDead, false);
  });

  it('returns false when only host is dead (guest alive)', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');

    const hostEntity = spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );
    spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const health = getComponent(world, hostEntity, 'health');
    health.hull = 0;

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const allDead = areAllHumanPlayersDead(world, players, 'ship1');

    assert.strictEqual(allDead, false);
  });

  it('returns false when only guest is dead (host alive)', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');

    spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );
    const guestEntity = spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const health = getComponent(world, guestEntity, 'health');
    health.hull = 0;

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const allDead = areAllHumanPlayersDead(world, players, 'ship1');

    assert.strictEqual(allDead, false);
  });

  it('returns true when all humans are dead', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');

    const hostEntity = spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );
    const guestEntity = spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const hostHealth = getComponent(world, hostEntity, 'health');
    hostHealth.hull = 0;
    const guestHealth = getComponent(world, guestEntity, 'health');
    guestHealth.hull = 0;

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const allDead = areAllHumanPlayersDead(world, players, 'ship1');

    assert.strictEqual(allDead, true);
  });

  it('returns true for single host when host is dead', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const hostEntity = spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );

    const health = getComponent(world, hostEntity, 'health');
    health.hull = 0;

    const players = [createTestLobbyPlayer('host-id', 'Commander', null, true)];

    const allDead = areAllHumanPlayersDead(world, players, 'ship1');

    assert.strictEqual(allDead, true);
  });
});
