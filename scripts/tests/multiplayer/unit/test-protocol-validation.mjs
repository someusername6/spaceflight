/**
 * Protocol Validation Tests
 *
 * Tests for message type validation, permission validation, and action processing.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  processAction,
  validateActionPermission,
} from '../../../../src/multiplayer/campaign-sync.ts';
import {
  DEFAULT_PERMISSION,
  decodeMessage,
  encodeMessage,
  GameMessageType,
  getMessageType,
  HOST_ONLY_MESSAGES,
  isGameMessage,
  isHostOnlyMessage,
} from '../../../../src/multiplayer/protocol/index.ts';
import {
  createTestCampaignState,
  createTestPlayerInfo,
} from './protocol-helpers.mjs';

// =============================================================================
// Message Type Validation Tests
// =============================================================================

describe('Message Type Validation', () => {
  describe('isGameMessage', () => {
    it('should return true for game messages (0x80+)', () => {
      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'p1',
        text: 'hi',
        timestamp: 0,
      };
      const encoded = encodeMessage(msg);
      assert.strictEqual(isGameMessage(encoded), true);
    });

    it('should return false for rollback-netcode messages (< 0x80)', () => {
      const nonGameMessage = new Uint8Array([0x01, 0x02, 0x03]);
      assert.strictEqual(isGameMessage(nonGameMessage), false);
    });

    it('should return false for empty array', () => {
      assert.strictEqual(isGameMessage(new Uint8Array([])), false);
    });
  });

  describe('getMessageType', () => {
    it('should return message type for game messages', () => {
      const msg = {
        type: GameMessageType.ReadyState,
        playerId: 'p1',
        ready: true,
      };
      const encoded = encodeMessage(msg);
      assert.strictEqual(getMessageType(encoded), GameMessageType.ReadyState);
    });

    it('should return null for non-game messages', () => {
      const nonGameMessage = new Uint8Array([0x01, 0x02, 0x03]);
      assert.strictEqual(getMessageType(nonGameMessage), null);
    });
  });

  describe('isHostOnlyMessage', () => {
    it('should return true for host-only messages', () => {
      assert.strictEqual(isHostOnlyMessage(GameMessageType.Welcome), true);
      assert.strictEqual(isHostOnlyMessage(GameMessageType.CampaignSync), true);
      assert.strictEqual(
        isHostOnlyMessage(GameMessageType.ActionResponse),
        true,
      );
      assert.strictEqual(
        isHostOnlyMessage(GameMessageType.KickNotification),
        true,
      );
    });

    it('should return false for non-host-only messages', () => {
      assert.strictEqual(isHostOnlyMessage(GameMessageType.ChatMessage), false);
      assert.strictEqual(isHostOnlyMessage(GameMessageType.ReadyState), false);
      assert.strictEqual(
        isHostOnlyMessage(GameMessageType.ActionRequest),
        false,
      );
      assert.strictEqual(
        isHostOnlyMessage(GameMessageType.CallsignAnnounce),
        false,
      );
    });
  });

  describe('HOST_ONLY_MESSAGES set', () => {
    it('should contain 16 host-only message types', () => {
      assert.strictEqual(HOST_ONLY_MESSAGES.size, 16);
    });
  });

  describe('decodeMessage', () => {
    it('should throw on invalid type byte below range', () => {
      // 0x00 is below the game message range (0x80+)
      const invalidMessage = new Uint8Array([0x00, 0x01, 0x02]);
      assert.throws(
        () => decodeMessage(invalidMessage),
        /Invalid game message type: 0x0/,
      );
    });

    it('should throw on invalid type byte 0x7f (just below range)', () => {
      // 0x7f is the highest non-game message type
      const invalidMessage = new Uint8Array([0x7f, 0x01, 0x02]);
      assert.throws(
        () => decodeMessage(invalidMessage),
        /Invalid game message type: 0x7f/,
      );
    });

    it('should throw on invalid type byte above range', () => {
      // 0xff is above the valid game message range
      const invalidMessage = new Uint8Array([0xff, 0x01, 0x02]);
      assert.throws(
        () => decodeMessage(invalidMessage),
        /Invalid game message type: 0xff/,
      );
    });
  });
});

// =============================================================================
// Permission Validation Tests
// =============================================================================

describe('Permission Validation', () => {
  describe('validateActionPermission', () => {
    it('should allow buy action with canBuy permission', () => {
      const action = {
        type: 'buy',
        itemType: 'ship',
        itemId: 'interceptor',
        quantity: 1,
      };
      const permissions = { ...DEFAULT_PERMISSION, canBuy: true };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.strictEqual(error, null);
    });

    it('should deny buy action without canBuy permission', () => {
      const action = {
        type: 'buy',
        itemType: 'ship',
        itemId: 'interceptor',
        quantity: 1,
      };
      const permissions = { ...DEFAULT_PERMISSION, canBuy: false };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.ok(error !== null, 'Should return error');
      assert.ok(error.includes('buy'), 'Error should mention buy');
    });

    it('should deny equip action with shipEdit=none', () => {
      const action = {
        type: 'equip',
        shipId: 'ship-1',
        slotIndex: 0,
        storageIndex: 0,
        bankSize: 1,
        category: 'primary',
      };
      const permissions = { ...DEFAULT_PERMISSION, shipEdit: 'none' };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1', 'ship-1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.ok(error !== null);
      assert.ok(error.includes('permission') || error.includes('edit'));
    });

    it('should allow equip action on own ship with shipEdit=own', () => {
      const action = {
        type: 'equip',
        shipId: 'ship-1',
        slotIndex: 0,
        storageIndex: 0,
        bankSize: 1,
        category: 'primary',
      };
      const permissions = { ...DEFAULT_PERMISSION, shipEdit: 'own' };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1', 'ship-1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.strictEqual(error, null);
    });

    it('should deny equip action on other ship with shipEdit=own', () => {
      const action = {
        type: 'equip',
        shipId: 'ship-2',
        slotIndex: 0,
        storageIndex: 0,
        bankSize: 1,
        category: 'primary',
      };
      const permissions = { ...DEFAULT_PERMISSION, shipEdit: 'own' };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1', 'ship-1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.ok(error !== null);
      assert.ok(error.includes('own'));
    });

    it('should allow equip action on any ship with shipEdit=any', () => {
      const action = {
        type: 'equip',
        shipId: 'ship-2',
        slotIndex: 0,
        storageIndex: 0,
        bankSize: 1,
        category: 'primary',
      };
      const permissions = { ...DEFAULT_PERMISSION, shipEdit: 'any' };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1', 'ship-1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.strictEqual(error, null);
    });

    it('should deny convertScrap without canConvertScrap permission', () => {
      const action = {
        type: 'convertScrap',
        shipClass: 'interceptor',
        quantity: 1,
      };
      const permissions = { ...DEFAULT_PERMISSION, canConvertScrap: false };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
        'host-peer',
      );
      assert.ok(error !== null);
      assert.ok(error.includes('scrap') || error.includes('convert'));
    });
  });
});

// =============================================================================
// Action Processing Tests
// =============================================================================

describe('Action Processing', () => {
  describe('processAction', () => {
    it('should return success=false for action that cannot be applied', () => {
      const state = createTestCampaignState();
      state.credits = 0;

      const action = {
        type: 'buy',
        itemType: 'ship',
        itemId: 'interceptor',
        quantity: 1,
      };
      const result = processAction(action, state);

      assert.strictEqual(result.success, false);
      assert.ok(result.error !== undefined);
    });

    it('should handle unknown action types gracefully', () => {
      const state = createTestCampaignState();
      const action = { type: 'unknownAction' };

      try {
        const result = processAction(action, state);
        assert.strictEqual(result.success, false);
      } catch (_e) {
        assert.ok(true);
      }
    });

    // Note: assignShip action was removed (dead code cleanup)
  });
});

// =============================================================================
// Message Handling Setup Tests
// =============================================================================

// Note: setupMessageHandling cannot be easily tested in isolation because it imports
// modules that have Vite-specific dependencies (import.meta.glob). The function's
// error handling for missing transport is verified through E2E tests and code review.
// The throw statement at lobby-protocol-routing.ts:79-82 ensures a clear error if
// transport is null.
