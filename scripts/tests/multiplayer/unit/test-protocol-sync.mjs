/**
 * Additional Permission and Action Processing Tests
 *
 * Edge case tests for permission validation and action processing.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  processAction,
  validateActionPermission,
} from '../../../../src/multiplayer/campaign-sync.ts';
import { DEFAULT_PERMISSION } from '../../../../src/multiplayer/protocol/index.ts';
import {
  createTestCampaignState,
  createTestPlayerInfo,
} from './protocol-helpers.mjs';

// =============================================================================
// Additional Permission Validation Tests
// =============================================================================

describe('Permission Validation - Additional Cases', () => {
  describe('validateActionPermission', () => {
    it('should deny sell action without canSell permission', () => {
      const action = {
        type: 'sell',
        itemType: 'ship',
        itemId: '0',
        quantity: 1,
      };
      const permissions = { ...DEFAULT_PERMISSION, canSell: false };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
      );
      assert.ok(error !== null);
      assert.ok(error.includes('sell'));
    });

    it('should allow sell action with canSell permission', () => {
      const action = {
        type: 'sell',
        itemType: 'ship',
        itemId: '0',
        quantity: 1,
      };
      const permissions = { ...DEFAULT_PERMISSION, canSell: true };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
      );
      assert.strictEqual(error, null);
    });

    it('should deny unequip action with shipEdit=none', () => {
      const action = {
        type: 'unequip',
        shipId: 'ship-1',
        slotIndex: 0,
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
      );
      assert.ok(error !== null);
    });

    it('should deny unequip on other ship with shipEdit=own', () => {
      const action = {
        type: 'unequip',
        shipId: 'ship-2',
        slotIndex: 0,
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
      );
      assert.ok(error !== null);
      assert.ok(error.includes('own'));
    });

    it('should deny resupply with shipEdit=none', () => {
      const action = {
        type: 'resupply',
        shipId: 'ship-1',
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
      );
      assert.ok(error !== null);
    });

    it('should deny resupply on other ship with shipEdit=own', () => {
      const action = {
        type: 'resupply',
        shipId: 'ship-2',
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
      );
      assert.ok(error !== null);
      assert.ok(error.includes('own'));
    });

    it('should allow resupply on own ship with shipEdit=own', () => {
      const action = {
        type: 'resupply',
        shipId: 'ship-1',
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
      );
      assert.strictEqual(error, null);
    });

    // Note: assignShip action was removed (dead code cleanup)

    it('should allow convertScrap with canConvertScrap permission', () => {
      const action = {
        type: 'convertScrap',
        shipClass: 'interceptor',
        quantity: 1,
      };
      const permissions = { ...DEFAULT_PERMISSION, canConvertScrap: true };
      const players = new Map([
        ['peer-1', createTestPlayerInfo('peer-1', 'Player1')],
      ]);

      const error = validateActionPermission(
        action,
        'peer-1',
        permissions,
        players,
      );
      assert.strictEqual(error, null);
    });
  });
});

// =============================================================================
// Additional Action Processing Tests
// =============================================================================

describe('Action Processing - Additional Cases', () => {
  describe('processAction - sell actions', () => {
    it('should return state unchanged for invalid sell', () => {
      const state = createTestCampaignState();
      const action = {
        type: 'sell',
        itemType: 'ship',
        itemId: '999',
        quantity: 1,
      };

      const result = processAction(action, state);
      assert.strictEqual(result.success, false);
    });
  });

  describe('processAction - equip actions', () => {
    it('should return state unchanged for invalid storage index', () => {
      const state = createTestCampaignState();
      const action = {
        type: 'equip',
        shipId: 'ship-1',
        slotIndex: 0,
        storageIndex: 999,
        bankSize: 1,
        category: 'primary',
      };

      const result = processAction(action, state);
      assert.strictEqual(result.success, false);
    });

    it('should return state unchanged for negative storage index', () => {
      const state = createTestCampaignState();
      const action = {
        type: 'equip',
        shipId: 'ship-1',
        slotIndex: 0,
        storageIndex: -1,
        bankSize: 1,
        category: 'primary',
      };

      const result = processAction(action, state);
      assert.strictEqual(result.success, false);
    });
  });

  describe('processAction - unequip actions', () => {
    it('should handle unequip on non-existent ship', () => {
      const state = createTestCampaignState();
      const action = {
        type: 'unequip',
        shipId: 'non-existent-ship',
        slotIndex: 0,
        category: 'primary',
      };

      const result = processAction(action, state);
      assert.strictEqual(result.success, false);
    });
  });

  describe('processAction - buy actions', () => {
    it('should handle unknown item type gracefully', () => {
      const state = createTestCampaignState();
      state.credits = 100000;
      const action = {
        type: 'buy',
        itemType: 'unknown',
        itemId: 'something',
        quantity: 1,
      };

      const result = processAction(action, state);
      assert.strictEqual(result.success, false);
    });
  });

  describe('processAction - sell actions item types', () => {
    it('should handle unknown sell item type gracefully', () => {
      const state = createTestCampaignState();
      const action = {
        type: 'sell',
        itemType: 'unknown',
        itemId: '0',
        quantity: 1,
      };

      const result = processAction(action, state);
      assert.strictEqual(result.success, false);
    });
  });
});
