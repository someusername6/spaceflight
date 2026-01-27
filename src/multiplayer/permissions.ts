/**
 * Permission Utilities - Constants and helpers for multiplayer permissions.
 *
 * Provides:
 * - Default permission sets for host and guests
 * - Permission checking utilities
 * - Human-readable permission descriptions
 */

import type { Permission, ShipEditPermission } from './protocol/types';

// =============================================================================
// Permission Defaults
// =============================================================================

/** Host permissions - full access to everything */
export const HOST_PERMISSIONS: Permission = {
  shipEdit: 'any',
  canBuy: true,
  canSell: true,
  canConvertScrap: true,
};

/** Default guest permissions - reasonable defaults for new players */
export const DEFAULT_GUEST_PERMISSIONS: Permission = {
  shipEdit: 'own',
  canBuy: true,
  canSell: true,
  canConvertScrap: true,
};

// =============================================================================
// Permission Checking
// =============================================================================

/**
 * Check if a player can edit a specific ship based on their permissions.
 *
 * @param permissions - Player's current permissions
 * @param playerId - ID of the player trying to edit
 * @param shipOwnerId - Player ID of the ship's current pilot (null if no pilot assigned)
 * @returns True if player can edit the ship
 */
export function canPlayerEditShip(
  permissions: Permission,
  playerId: string,
  shipOwnerId: string | null,
): boolean {
  switch (permissions.shipEdit) {
    case 'none':
      return false;
    case 'own':
      // Can only edit if they own the ship (are assigned to it)
      return shipOwnerId === playerId;
    case 'any':
      return true;
    default: {
      const exhaustive: never = permissions.shipEdit;
      return exhaustive;
    }
  }
}

/**
 * Check if player has a specific permission.
 */
export function hasPermission(
  permissions: Permission,
  action: 'buy' | 'sell' | 'convertScrap',
): boolean {
  switch (action) {
    case 'buy':
      return permissions.canBuy;
    case 'sell':
      return permissions.canSell;
    case 'convertScrap':
      return permissions.canConvertScrap;
  }
}

// =============================================================================
// Permission Descriptions
// =============================================================================

const SHIP_EDIT_DESCRIPTIONS: Record<ShipEditPermission, string> = {
  none: 'Cannot edit loadouts',
  own: 'Can edit own ship',
  any: 'Can edit any ship',
};

/**
 * Get a human-readable description of a permission set.
 *
 * @param permissions - Permission set to describe
 * @returns Multiline description of permissions
 */
export function getPermissionDescription(permissions: Permission): string {
  const lines: string[] = [];

  lines.push(SHIP_EDIT_DESCRIPTIONS[permissions.shipEdit]);

  if (permissions.canBuy) {
    lines.push('Can buy items');
  } else {
    lines.push('Cannot buy items');
  }

  if (permissions.canSell) {
    lines.push('Can sell items');
  } else {
    lines.push('Cannot sell items');
  }

  if (permissions.canConvertScrap) {
    lines.push('Can convert scrap');
  } else {
    lines.push('Cannot convert scrap');
  }

  return lines.join('\n');
}

/**
 * Get a short summary of permissions for display.
 */
export function getPermissionSummary(permissions: Permission): string {
  const parts: string[] = [];

  if (permissions.shipEdit === 'any') {
    parts.push('Full loadout access');
  } else if (permissions.shipEdit === 'own') {
    parts.push('Own ship only');
  } else {
    parts.push('No loadout access');
  }

  if (!permissions.canBuy || !permissions.canSell) {
    if (!permissions.canBuy && !permissions.canSell) {
      parts.push('No store access');
    } else if (!permissions.canBuy) {
      parts.push('No buying');
    } else {
      parts.push('No selling');
    }
  }

  return parts.join(', ');
}

// =============================================================================
// Permission Merging
// =============================================================================

/**
 * Create a new permission object with specific overrides.
 */
export function updatePermissions(
  base: Permission,
  updates: Partial<Permission>,
): Permission {
  return {
    ...base,
    ...updates,
  };
}
