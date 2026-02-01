/**
 * Desync Detection Tests
 *
 * Tests that desync is detected via hash mismatch.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getComponent } from '../../../../src/core/ecs.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import {
  createHostGuestAdapters,
  generateInputsForTick,
  stepBothAdapters,
} from './helpers.mjs';

// =============================================================================
// Desync Detection Tests
// =============================================================================

describe('Desync Detection', () => {
  it('detects desync when guest state is modified', () => {
    const {
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    // Run 100 ticks in sync
    stepBothAdapters(
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
      100,
    );

    // Verify still in sync
    const hostHashBefore = hostAdapter.hash();
    const guestHashBefore = guestAdapter.hash();
    assert.strictEqual(
      hostHashBefore,
      guestHashBefore,
      'Should be in sync initially',
    );

    // Intentionally modify guest world (simulating a bug or network issue)
    guestWorld.systemState.gameTime += 1;

    // Desync should now be detectable
    const guestHashAfter = guestAdapter.hash();
    assert.notStrictEqual(
      hostHashBefore,
      guestHashAfter,
      'Hash should change after modification',
    );

    // Host and guest are now desynced
    assert.notStrictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Host and guest hashes should differ',
    );
  });

  it('detects desync when entity state differs', () => {
    const {
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    stepBothAdapters(
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
      50,
    );

    // Verify sync
    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Should be in sync',
    );

    // Modify an entity's health in guest world
    // Note: Health component uses 'hull' not 'current'
    const guestEntities = Array.from(guestWorld.entities);
    for (const entity of guestEntities) {
      const health = getComponent(guestWorld, entity, 'health');
      if (health) {
        health.hull -= 10; // Simulate damage that only happened on guest
        break;
      }
    }

    // Desync should be detected
    assert.notStrictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Hashes should differ after entity modification',
    );
  });

  it('reports precise tick of desync', () => {
    const {
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    // Run 50 ticks, tracking hashes
    const hashes = { host: [], guest: [] };

    for (let tick = 0; tick < 50; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);

      hostAdapter.step(inputs);
      guestAdapter.step(inputs);

      hashes.host.push(hostAdapter.hash());
      hashes.guest.push(guestAdapter.hash());
    }

    // Introduce desync at tick 50
    guestWorld.systemState.gameTime += 1;

    // Continue running
    for (let tick = 50; tick < 100; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);

      hostAdapter.step(inputs);
      guestAdapter.step(inputs);

      hashes.host.push(hostAdapter.hash());
      hashes.guest.push(guestAdapter.hash());
    }

    // Find first mismatch
    let desyncTick = -1;
    for (let i = 0; i < hashes.host.length; i++) {
      if (hashes.host[i] !== hashes.guest[i]) {
        desyncTick = i;
        break;
      }
    }

    assert.strictEqual(desyncTick, 50, 'Desync should be detected at tick 50');
  });
});
