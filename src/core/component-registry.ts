/**
 * Component Registry - Central type mapping for compile-time safety.
 *
 * This registry maps component type strings to their interfaces, enabling:
 * - Compile-time validation of component type strings
 * - Automatic return type inference for getComponent()
 * - IDE auto-complete for component names
 *
 * When adding a new component:
 * 1. Create the component interface in src/components/
 * 2. Import the interface here
 * 3. Add an entry to ComponentRegistry: `typeName: InterfaceName`
 *    (where typeName matches the component's `readonly type` field)
 */

import type { AIControlled } from '../components/ai';
import type { AimError } from '../components/aim-error';
import type { Collision } from '../components/collision';
import type { CombatStats } from '../components/combat-stats';
import type { ConvoyAutopilot, ConvoyShip } from '../components/convoy';
import type { DamageTracking } from '../components/damage-tracking';
import type { Decoy } from '../components/decoy';
import type { Explosion } from '../components/explosion';
import type { FactionComponent } from '../components/faction';
import type { Health } from '../components/health';
import type { Heat } from '../components/heat';
import type { HullCollider } from '../components/hull-collider';
import type { HyperspaceJump } from '../components/hyperspace-jump';
import type { Missile } from '../components/missile';
import type { Physics } from '../components/physics';
import type { PlayerControlled } from '../components/player';
import type { Projectile } from '../components/projectile';
import type { ShieldHit } from '../components/shield-hit';
import type { Shields } from '../components/shields';
import type { ShipIdentity } from '../components/ship-identity';
import type { ShipTag } from '../components/ship-tag';
import type { Structure } from '../components/structure';
import type { Targeting } from '../components/targeting';
import type { Transform } from '../components/transform';
import type { PrimaryWeapons, SecondaryWeapons } from '../components/weapons';

/**
 * Maps component type strings to their TypeScript interfaces.
 *
 * Usage:
 *   const transform = getComponent(world, entity, 'transform');
 *   // transform is automatically typed as Transform | undefined
 *
 *   getComponent(world, entity, 'typo'); // Compile error!
 */
export interface ComponentRegistry {
  // Core components
  transform: Transform;
  physics: Physics;
  health: Health;
  collision: Collision;
  hullCollider: HullCollider;
  faction: FactionComponent;

  // Control components
  playerControlled: PlayerControlled;
  aiControlled: AIControlled;
  targeting: Targeting;
  aimError: AimError;

  // Weapon components
  primaryWeapons: PrimaryWeapons;
  secondaryWeapons: SecondaryWeapons;

  // Projectile/missile components
  projectile: Projectile;
  missile: Missile;
  decoy: Decoy;
  explosion: Explosion;

  // Ship components
  shipIdentity: ShipIdentity;
  heat: Heat;
  shields: Shields;
  shieldHit: ShieldHit;
  combatStats: CombatStats;

  // Convoy components (escort and ambush missions)
  convoyShip: ConvoyShip;
  convoyAutopilot: ConvoyAutopilot;
  damageTracking: DamageTracking;

  // Structure components
  structure: Structure;

  // Effect components
  hyperspaceJump: HyperspaceJump;

  // Tag components
  shipTag: ShipTag;
}

/** All valid component type strings (derived from registry keys) */
export type ComponentType = keyof ComponentRegistry;

/**
 * Numeric IDs for compact serialization.
 * These must remain stable - never change existing IDs, only add new ones.
 */
export const ComponentTypeId = {
  transform: 0,
  physics: 1,
  health: 2,
  collision: 3,
  hullCollider: 4,
  faction: 5,
  playerControlled: 6,
  aiControlled: 7,
  targeting: 8,
  aimError: 9,
  primaryWeapons: 10,
  secondaryWeapons: 11,
  projectile: 12,
  missile: 13,
  decoy: 14,
  explosion: 15,
  shipIdentity: 16,
  heat: 17,
  shields: 18,
  shieldHit: 19,
  combatStats: 20,
  convoyShip: 21,
  convoyAutopilot: 22,
  damageTracking: 23,
  structure: 24,
  hyperspaceJump: 25,
  shipTag: 26,
} as const;
