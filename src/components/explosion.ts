/**
 * Explosion component - marks an expanding explosion effect.
 */

import * as THREE from 'three';
import type { ComponentBase, Entity } from '../core/types';

/** Explosion visual variant */
export type ExplosionVariant = 'standard' | 'nuke';

export interface Explosion extends ComponentBase {
  readonly type: 'explosion';
  /** Current age in seconds */
  age: number;
  /** Total lifetime in seconds */
  maxAge: number;
  /** Base size (ship radius) */
  size: number;
  /** Explosion color (base color, nukes override with progression) */
  color: THREE.Color;
  /** Source entity to follow (for coasting dying ships) */
  sourceEntity?: Entity;
  /** Visual variant (affects rendering) */
  variant: ExplosionVariant;
}

/** Default explosion duration */
const DEFAULT_MAX_AGE = 0.8;
/** Nuke explosions last longer */
const NUKE_MAX_AGE = 2.0;

/** Creates an Explosion component */
export function createExplosion(
  size: number,
  color: THREE.Color = new THREE.Color(0xff6600),
  sourceEntity?: Entity,
  variant: ExplosionVariant = 'standard',
): Explosion {
  const explosion: Explosion = {
    type: 'explosion',
    age: 0,
    maxAge: variant === 'nuke' ? NUKE_MAX_AGE : DEFAULT_MAX_AGE,
    size,
    color,
    variant,
  };
  if (sourceEntity !== undefined) {
    explosion.sourceEntity = sourceEntity;
  }
  return explosion;
}

/** Check if explosion is finished */
export function isExplosionFinished(explosion: Explosion): boolean {
  return explosion.age >= explosion.maxAge;
}

// =============================================================================
// Serialization
// =============================================================================

import {
  deserializeColor,
  type SerializedColor,
  serializeColor,
} from '../serialization';

/** Variant as numeric */
const VariantToNum: Record<ExplosionVariant, number> = { standard: 0, nuke: 1 };
const NumToVariant: ExplosionVariant[] = ['standard', 'nuke'];

export interface SerializedExplosion {
  t: 15; // Component type ID
  a: number; // age
  ma: number; // maxAge
  s: number; // size
  c: SerializedColor; // color
  se?: Entity; // sourceEntity
  v: number; // variant
}

export function serializeExplosion(c: Explosion): SerializedExplosion {
  const result: SerializedExplosion = {
    t: 15,
    a: c.age,
    ma: c.maxAge,
    s: c.size,
    c: serializeColor(c.color),
    v: VariantToNum[c.variant],
  };
  if (c.sourceEntity !== undefined) result.se = c.sourceEntity;
  return result;
}

export function deserializeExplosion(s: SerializedExplosion): Explosion {
  const result: Explosion = {
    type: 'explosion',
    age: s.a,
    maxAge: s.ma,
    size: s.s,
    color: deserializeColor(s.c),
    variant: NumToVariant[s.v] ?? 'standard',
  };
  if (s.se !== undefined) result.sourceEntity = s.se;
  return result;
}
