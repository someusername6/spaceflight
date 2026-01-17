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

  // Convoy components (escort missions)
  convoyShip: ConvoyShip;
  convoyAutopilot: ConvoyAutopilot;

  // Structure components
  structure: Structure;

  // Effect components
  hyperspaceJump: HyperspaceJump;
}

/** All valid component type strings (derived from registry keys) */
export type ComponentType = keyof ComponentRegistry;
