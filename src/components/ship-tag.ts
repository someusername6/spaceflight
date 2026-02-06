/**
 * Ship Tag - Marks an entity as a ship.
 *
 * This is a tag component (no data fields beyond type). It replaces
 * the fragile negative check in isShip() (has collision but not
 * projectile/missile) with a positive identification.
 */

import type { ComponentBase } from '../core/types';

export interface ShipTag extends ComponentBase {
  readonly type: 'shipTag';
}

export function createShipTag(): ShipTag {
  return { type: 'shipTag' };
}

// Serialization

export interface SerializedShipTag {
  t: 26;
}

export function serializeShipTag(_c: ShipTag): SerializedShipTag {
  return { t: 26 };
}

export function deserializeShipTag(_s: SerializedShipTag): ShipTag {
  return { type: 'shipTag' };
}
