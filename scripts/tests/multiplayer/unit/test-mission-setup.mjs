/**
 * Mission Setup Unit Tests
 *
 * Tests for multiplayer mission entity mapping and guest ship detection.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  spawnGuestFromCampaign,
  spawnPlayerFromCampaign,
} from '../../../../src/campaign/ship-spawning.ts';
import { createSlotArray } from '../../../../src/campaign/slot-array.ts';
import {
  createWorld,
  getComponent,
  hasComponent,
} from '../../../../src/core/ecs.ts';
import {
  buildPlayerEntityMap,
  getGuestShipIds,
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
      ? {
          id: `pilot-${id}`,
          name: pilotName,
          shipSkills: { [shipClass]: 'regular' },
        }
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
// Tests: getGuestShipIds
// =============================================================================

describe('Mission Setup - getGuestShipIds', () => {
  it('returns empty map when only host has a ship', () => {
    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
    ];

    const guestMap = getGuestShipIds(players, 'host-id');

    assert.strictEqual(guestMap.size, 0);
  });

  it('returns guest ship IDs with callsigns', () => {
    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const guestMap = getGuestShipIds(players, 'host-id');

    assert.strictEqual(guestMap.size, 1);
    assert.ok(guestMap.has('ship2'));
    assert.strictEqual(guestMap.get('ship2'), 'Wingman');
    assert.ok(!guestMap.has('ship1')); // Host ship not included
  });

  it('excludes spectators (players without ships)', () => {
    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
      createTestLobbyPlayer('spectator-id', 'Spectator', null, false),
    ];

    const guestMap = getGuestShipIds(players, 'host-id');

    assert.strictEqual(guestMap.size, 1);
    assert.ok(guestMap.has('ship2'));
  });

  it('handles multiple guests with callsigns', () => {
    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest1-id', 'Alpha', 'ship2', false),
      createTestLobbyPlayer('guest2-id', 'Beta', 'ship3', false),
      createTestLobbyPlayer('guest3-id', 'Gamma', 'ship4', false),
    ];

    const guestMap = getGuestShipIds(players, 'host-id');

    assert.strictEqual(guestMap.size, 3);
    assert.ok(guestMap.has('ship2'));
    assert.ok(guestMap.has('ship3'));
    assert.ok(guestMap.has('ship4'));
    assert.strictEqual(guestMap.get('ship2'), 'Alpha');
    assert.strictEqual(guestMap.get('ship3'), 'Beta');
    assert.strictEqual(guestMap.get('ship4'), 'Gamma');
  });
});

// =============================================================================
// Tests: buildPlayerEntityMap
// =============================================================================

describe('Mission Setup - buildPlayerEntityMap', () => {
  it('maps host player to their entity', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const hostShip = createTestOwnedShip('ship1', 'fighter', 'Commander');
    const hostEntity = spawnPlayerFromCampaign(
      world,
      hostShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
    ];

    const setup = buildPlayerEntityMap(world, players, 'host-id');

    assert.strictEqual(setup.playerEntityMap.size, 1);
    assert.strictEqual(setup.localPlayerEntity, hostEntity);
    assert.strictEqual(setup.spectatorIds.length, 0);
  });

  it('maps guest players to their entities', () => {
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

    const players = [
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('guest-id', 'Wingman', 'ship2', false),
    ];

    const setup = buildPlayerEntityMap(world, players, 'host-id');

    assert.strictEqual(setup.playerEntityMap.size, 2);
    assert.strictEqual(setup.localPlayerEntity, hostEntity);

    // Verify the mapping is correct
    const hostMapped = setup.playerEntityMap.get('host-id');
    const guestMapped = setup.playerEntityMap.get('guest-id');

    assert.strictEqual(hostMapped, hostEntity);
    assert.strictEqual(guestMapped, guestEntity);
  });

  it('identifies spectators correctly', () => {
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
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('spectator-id', 'Spectator', null, false),
    ];

    const setup = buildPlayerEntityMap(world, players, 'host-id');

    assert.strictEqual(setup.playerEntityMap.size, 1);
    assert.strictEqual(setup.spectatorIds.length, 1);
    assert.strictEqual(setup.spectatorIds[0], 'spectator-id');
  });

  it('returns null localPlayerEntity when local player is spectator', () => {
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
      createTestLobbyPlayer('host-id', 'Commander', 'ship1', true),
      createTestLobbyPlayer('spectator-id', 'Spectator', null, false),
    ];

    // spectator-id is the local player
    const setup = buildPlayerEntityMap(world, players, 'spectator-id');

    assert.strictEqual(setup.localPlayerEntity, null);
  });
});

// =============================================================================
// Tests: spawnGuestFromCampaign
// =============================================================================

describe('Mission Setup - spawnGuestFromCampaign', () => {
  it('creates entity with PlayerControlled component', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const guestShip = createTestOwnedShip('ship2', 'fighter', 'Wingman');
    const entity = spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    assert.ok(hasComponent(world, entity, 'playerControlled'));
    // Should NOT have AIControlled
    assert.ok(!hasComponent(world, entity, 'aiControlled'));
    // Should NOT have AimError
    assert.ok(!hasComponent(world, entity, 'aimError'));
  });

  it('sets callsign from pilot name', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const guestShip = createTestOwnedShip('ship2', 'fighter', 'GuestPlayer');
    const entity = spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(30, 0, -15),
      new Quaternion(),
    );

    const identity = getComponent(world, entity, 'shipIdentity');
    assert.strictEqual(identity.callsign, 'GuestPlayer');
    assert.strictEqual(identity.campaignShipId, 'ship2');
  });

  it('sets campaignShipId for entity mapping', () => {
    const world = createWorld(12345);
    initCombatStats(world);

    const guestShip = createTestOwnedShip('ship-abc-123', 'fighter', 'Test');
    const entity = spawnGuestFromCampaign(
      world,
      guestShip,
      new Vector3(0, 0, 0),
      new Quaternion(),
    );

    const identity = getComponent(world, entity, 'shipIdentity');
    assert.strictEqual(identity.campaignShipId, 'ship-abc-123');
  });
});
