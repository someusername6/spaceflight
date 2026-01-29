/**
 * Permission Utilities Unit Tests
 *
 * Tests for multiplayer permission utilities.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  canPlayerEditShip,
  DEFAULT_GUEST_PERMISSIONS,
  getPermissionDescription,
  getPermissionSummary,
  HOST_PERMISSIONS,
  hasPermission,
  updatePermissions,
} from '../../../../src/multiplayer/permissions.ts';

describe('Permission Utilities', () => {
  describe('Permission Constants', () => {
    it('HOST_PERMISSIONS grants all permissions', () => {
      assert.strictEqual(HOST_PERMISSIONS.shipEdit, 'any');
      assert.strictEqual(HOST_PERMISSIONS.canBuy, true);
      assert.strictEqual(HOST_PERMISSIONS.canSell, true);
      assert.strictEqual(HOST_PERMISSIONS.canConvertScrap, true);
    });

    it('DEFAULT_GUEST_PERMISSIONS has reasonable defaults', () => {
      assert.strictEqual(DEFAULT_GUEST_PERMISSIONS.shipEdit, 'own');
      assert.strictEqual(DEFAULT_GUEST_PERMISSIONS.canBuy, true);
      assert.strictEqual(DEFAULT_GUEST_PERMISSIONS.canSell, true);
      assert.strictEqual(DEFAULT_GUEST_PERMISSIONS.canConvertScrap, true);
    });
  });

  describe('canPlayerEditShip', () => {
    it('returns false with "none" permission', () => {
      const permissions = { ...DEFAULT_GUEST_PERMISSIONS, shipEdit: 'none' };
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', null),
        false,
      );
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', 'player1'),
        false,
      );
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', 'player2'),
        false,
      );
    });

    it('respects "own" permission - can only edit own ships', () => {
      const permissions = { ...DEFAULT_GUEST_PERMISSIONS, shipEdit: 'own' };

      // Can edit if owner matches player
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', 'player1'),
        true,
      );

      // Cannot edit if owner is different
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', 'player2'),
        false,
      );

      // Cannot edit if no owner
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', null),
        false,
      );
    });

    it('respects "any" permission - can edit any ship', () => {
      const permissions = { ...DEFAULT_GUEST_PERMISSIONS, shipEdit: 'any' };

      assert.strictEqual(canPlayerEditShip(permissions, 'player1', null), true);
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', 'player1'),
        true,
      );
      assert.strictEqual(
        canPlayerEditShip(permissions, 'player1', 'player2'),
        true,
      );
    });
  });

  describe('hasPermission', () => {
    it('checks buy permission', () => {
      const canBuyPerms = { ...DEFAULT_GUEST_PERMISSIONS, canBuy: true };
      const noBuyPerms = { ...DEFAULT_GUEST_PERMISSIONS, canBuy: false };

      assert.strictEqual(hasPermission(canBuyPerms, 'buy'), true);
      assert.strictEqual(hasPermission(noBuyPerms, 'buy'), false);
    });

    it('checks sell permission', () => {
      const canSellPerms = { ...DEFAULT_GUEST_PERMISSIONS, canSell: true };
      const noSellPerms = { ...DEFAULT_GUEST_PERMISSIONS, canSell: false };

      assert.strictEqual(hasPermission(canSellPerms, 'sell'), true);
      assert.strictEqual(hasPermission(noSellPerms, 'sell'), false);
    });

    it('checks convertScrap permission', () => {
      const canConvertPerms = {
        ...DEFAULT_GUEST_PERMISSIONS,
        canConvertScrap: true,
      };
      const noConvertPerms = {
        ...DEFAULT_GUEST_PERMISSIONS,
        canConvertScrap: false,
      };

      assert.strictEqual(hasPermission(canConvertPerms, 'convertScrap'), true);
      assert.strictEqual(hasPermission(noConvertPerms, 'convertScrap'), false);
    });
  });

  describe('getPermissionDescription', () => {
    it('describes host permissions', () => {
      const description = getPermissionDescription(HOST_PERMISSIONS);
      assert.ok(description.includes('Can edit any ship'));
      assert.ok(description.includes('Can buy items'));
      assert.ok(description.includes('Can sell items'));
      assert.ok(description.includes('Can convert scrap'));
    });

    it('describes restricted permissions', () => {
      const permissions = {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      };
      const description = getPermissionDescription(permissions);
      assert.ok(description.includes('Cannot edit loadouts'));
      assert.ok(description.includes('Cannot buy items'));
      assert.ok(description.includes('Cannot sell items'));
      assert.ok(description.includes('Cannot convert scrap'));
    });
  });

  describe('getPermissionSummary', () => {
    it('describes full access', () => {
      const summary = getPermissionSummary(HOST_PERMISSIONS);
      assert.ok(summary.includes('Full loadout access'));
    });

    it('describes own ship only', () => {
      const summary = getPermissionSummary(DEFAULT_GUEST_PERMISSIONS);
      assert.ok(summary.includes('Own ship only'));
    });

    it('describes no loadout access', () => {
      const permissions = { ...DEFAULT_GUEST_PERMISSIONS, shipEdit: 'none' };
      const summary = getPermissionSummary(permissions);
      assert.ok(summary.includes('No loadout access'));
    });

    it('describes no store access', () => {
      const permissions = {
        ...DEFAULT_GUEST_PERMISSIONS,
        canBuy: false,
        canSell: false,
      };
      const summary = getPermissionSummary(permissions);
      assert.ok(summary.includes('No store access'));
    });
  });

  describe('updatePermissions', () => {
    it('creates new permission object with overrides', () => {
      const base = DEFAULT_GUEST_PERMISSIONS;
      const updated = updatePermissions(base, { canBuy: false });

      assert.strictEqual(updated.canBuy, false);
      assert.strictEqual(updated.canSell, true);
      assert.strictEqual(updated.shipEdit, 'own');

      // Original unchanged
      assert.strictEqual(base.canBuy, true);
    });

    it('can update multiple fields', () => {
      const base = DEFAULT_GUEST_PERMISSIONS;
      const updated = updatePermissions(base, {
        canBuy: false,
        canSell: false,
        shipEdit: 'none',
      });

      assert.strictEqual(updated.canBuy, false);
      assert.strictEqual(updated.canSell, false);
      assert.strictEqual(updated.shipEdit, 'none');
      assert.strictEqual(updated.canConvertScrap, true);
    });
  });
});
