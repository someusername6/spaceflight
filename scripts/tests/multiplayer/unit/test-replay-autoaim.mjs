/**
 * Tests for per-player autoaim in replay playback.
 *
 * Verifies that:
 * 1. setReplayAutoaimOnPlayers sets autoaim on all player entities
 * 2. setReplayAutoaimByShipId matches by campaignShipId
 * 3. Multiplayer replay setup applies baseline autoaim even when per-player lookup fails
 *    (regression test: replay-spawned entities may lack campaignShipId)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createPlayerControlled } from '../../../../src/components/player.ts';
import { createShipIdentity } from '../../../../src/components/ship-identity.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../../src/core/ecs.ts';
import {
  setReplayAutoaimByShipId,
  setReplayAutoaimOnPlayers,
} from '../../../../src/replay/replay-autoaim.ts';

// =============================================================================
// Helpers
// =============================================================================

/** Create a minimal player entity (like replay spawning - no campaignShipId) */
function createPlayerEntity(
  world,
  { autoaimBonus = 0, callsign = 'Player' } = {},
) {
  const entity = createEntity(world);
  addComponent(world, entity, createPlayerControlled(true, autoaimBonus));
  addComponent(world, entity, createShipIdentity('fighter', callsign));
  return entity;
}

/** Create a player entity WITH campaignShipId */
function createPlayerEntityWithShipId(
  world,
  campaignShipId,
  { autoaimBonus = 0, callsign = 'Player' } = {},
) {
  const entity = createEntity(world);
  addComponent(world, entity, createPlayerControlled(true, autoaimBonus));
  addComponent(
    world,
    entity,
    createShipIdentity('fighter', callsign, campaignShipId),
  );
  return entity;
}

/** Get autoaimBonus from a player entity */
function getAutoaim(world, entity) {
  const player = getComponent(world, entity, 'playerControlled');
  return player?.autoaimBonus ?? null;
}

// =============================================================================
// Tests
// =============================================================================

describe('Replay Autoaim', () => {
  describe('setReplayAutoaimOnPlayers', () => {
    it('sets autoaim on a single player entity', () => {
      const world = createWorld(42);
      const entity = createPlayerEntity(world);

      assert.strictEqual(getAutoaim(world, entity), 0, 'default is 0');

      setReplayAutoaimOnPlayers(world, 3.5);

      assert.strictEqual(
        getAutoaim(world, entity),
        3.5,
        'should be set to 3.5',
      );
    });

    it('sets autoaim on multiple player entities', () => {
      const world = createWorld(42);
      const e1 = createPlayerEntity(world, { callsign: 'Player 1' });
      const e2 = createPlayerEntity(world, { callsign: 'Player 2' });

      setReplayAutoaimOnPlayers(world, 2.0);

      assert.strictEqual(getAutoaim(world, e1), 2.0);
      assert.strictEqual(getAutoaim(world, e2), 2.0);
    });
  });

  describe('setReplayAutoaimByShipId', () => {
    it('sets autoaim on entity matching campaignShipId', () => {
      const world = createWorld(42);
      const e1 = createPlayerEntityWithShipId(world, 'ship-A', {
        callsign: 'Host',
      });
      const e2 = createPlayerEntityWithShipId(world, 'ship-B', {
        callsign: 'Guest',
      });

      setReplayAutoaimByShipId(world, 'ship-B', 4.0);

      assert.strictEqual(getAutoaim(world, e1), 0, 'ship-A unchanged');
      assert.strictEqual(getAutoaim(world, e2), 4.0, 'ship-B set to 4.0');
    });

    it('does nothing when campaignShipId not found', () => {
      const world = createWorld(42);
      const entity = createPlayerEntity(world); // no campaignShipId

      setReplayAutoaimByShipId(world, 'nonexistent', 5.0);

      assert.strictEqual(getAutoaim(world, entity), 0, 'should remain default');
    });
  });

  describe('multiplayer replay baseline + override pattern', () => {
    it('baseline covers entities without campaignShipId', () => {
      // This is the regression test for Bug 1:
      // Replay-spawned entities lack campaignShipId, so per-player lookup fails.
      // The baseline setReplayAutoaimOnPlayers must still set autoaim.
      const world = createWorld(42);
      const e1 = createPlayerEntity(world, { callsign: 'Host' });
      const e2 = createPlayerEntity(world, { callsign: 'Guest' });

      // Simulate what viewer-playback.ts does (fixed version):
      // 1. Set baseline from global playerAutoaim
      const globalAutoaim = 2.5;
      setReplayAutoaimOnPlayers(world, globalAutoaim);

      // 2. Try per-player overrides (will silently fail - no campaignShipId)
      const players = [
        { autoaimDegrees: 1.0, campaignShipId: 'ship-A' },
        { autoaimDegrees: 4.0, campaignShipId: 'ship-B' },
      ];
      for (const player of players) {
        if (player.autoaimDegrees !== undefined && player.campaignShipId) {
          setReplayAutoaimByShipId(
            world,
            player.campaignShipId,
            player.autoaimDegrees,
          );
        }
      }

      // Both entities should have the baseline autoaim (per-player failed)
      assert.strictEqual(
        getAutoaim(world, e1),
        globalAutoaim,
        'entity without campaignShipId should get baseline autoaim',
      );
      assert.strictEqual(
        getAutoaim(world, e2),
        globalAutoaim,
        'entity without campaignShipId should get baseline autoaim',
      );
    });

    it('per-player overrides work when campaignShipId is present', () => {
      const world = createWorld(42);
      const e1 = createPlayerEntityWithShipId(world, 'ship-A', {
        callsign: 'Host',
      });
      const e2 = createPlayerEntityWithShipId(world, 'ship-B', {
        callsign: 'Guest',
      });

      // 1. Baseline
      setReplayAutoaimOnPlayers(world, 2.5);

      // 2. Per-player overrides
      setReplayAutoaimByShipId(world, 'ship-A', 1.0);
      setReplayAutoaimByShipId(world, 'ship-B', 4.0);

      assert.strictEqual(
        getAutoaim(world, e1),
        1.0,
        'Host gets per-player value',
      );
      assert.strictEqual(
        getAutoaim(world, e2),
        4.0,
        'Guest gets per-player value',
      );
    });

    it('WITHOUT baseline, missing campaignShipId leaves autoaim at 0 (old bug)', () => {
      // Demonstrates the bug: if we skip the baseline and only do per-player,
      // entities without campaignShipId get no autoaim at all.
      const world = createWorld(42);
      const entity = createPlayerEntity(world); // no campaignShipId

      // Skip baseline, only try per-player (the old buggy code path)
      setReplayAutoaimByShipId(world, 'ship-A', 3.0);

      // No fallback fired → entity stuck at default 0
      assert.strictEqual(
        getAutoaim(world, entity),
        0,
        'without baseline, autoaim stays at 0 when per-player fails',
      );
    });
  });
});
