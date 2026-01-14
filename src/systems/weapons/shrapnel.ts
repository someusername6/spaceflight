/**
 * Shrapnel spawning - Creates shrapnel projectiles from flak explosions.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import { createFaction } from '../../components/faction';
import { createProjectile } from '../../components/projectile';
import { createTransform } from '../../components/transform';
import { addComponent, createEntity } from '../../core/ecs';
import { randomUnitVector } from '../../core/prng';
import type { Entity, World } from '../../core/types';
import { createCollision } from '../collision';

/** Default shrapnel stats (used if weapon doesn't specify) */
const DEFAULT_SHRAPNEL_SPEED = 450;
const DEFAULT_SHRAPNEL_RANGE = 80;
const DEFAULT_SHRAPNEL_DAMAGE = 4;
const SHRAPNEL_COLLISION_RADIUS = 0.3;

/** Shrapnel configuration from weapon stats */
export interface ShrapnelConfig {
  damage?: number | undefined;
  speed?: number | undefined;
  range?: number | undefined;
}

/**
 * Spawn shrapnel projectiles from a flak explosion.
 * Each piece goes in a random direction (uniform on sphere surface).
 *
 * Note: Creates projectiles directly (not via createProjectileEntity) because
 * shrapnel comes from explosions, not weapon muzzles - no muzzle flash needed.
 *
 * @param parentWeaponName - Weapon name for stats attribution (e.g., "Flak")
 * @param config - Optional shrapnel stats from weapon definition
 */
export function spawnShrapnel(
  world: World,
  position: THREE.Vector3,
  count: number,
  owner: Entity,
  ownerFaction: FactionComponent | undefined,
  parentWeaponName: string,
  config?: ShrapnelConfig,
): void {
  const damage = config?.damage ?? DEFAULT_SHRAPNEL_DAMAGE;
  const speed = config?.speed ?? DEFAULT_SHRAPNEL_SPEED;
  const range = config?.range ?? DEFAULT_SHRAPNEL_RANGE;

  for (let i = 0; i < count; i++) {
    // Random direction uniformly distributed on sphere surface
    const randDir = randomUnitVector(world.prng);
    const direction = new THREE.Vector3(randDir.x, randDir.y, randDir.z);

    const shrapnel = createEntity(world);

    addComponent(
      world,
      shrapnel,
      createTransform(position.x, position.y, position.z),
    );
    const projectile = createProjectile(
      owner,
      damage,
      speed,
      range,
      direction,
      'ballistic',
      parentWeaponName,
      { isShrapnel: true, visualName: 'Shrapnel' },
    );
    addComponent(world, shrapnel, projectile);
    addComponent(world, shrapnel, createCollision(SHRAPNEL_COLLISION_RADIUS));

    if (ownerFaction) {
      addComponent(world, shrapnel, createFaction(ownerFaction.faction));
    }
  }
}
