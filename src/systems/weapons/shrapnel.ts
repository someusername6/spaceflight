/**
 * Shrapnel spawning - Creates shrapnel projectiles from flak explosions.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import { createFaction } from '../../components/faction';
import { createProjectile } from '../../components/projectile';
import { createTransform } from '../../components/transform';
import { addComponent, createEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { createCollision } from '../collision';

/** Shrapnel projectile stats */
const SHRAPNEL_SPEED = 450;
const SHRAPNEL_RANGE = 120;
const SHRAPNEL_DAMAGE = 8;
const SHRAPNEL_RADIUS = 0.3;

/** Spawn shrapnel projectiles from a flak explosion */
export function spawnShrapnel(
  world: World,
  position: THREE.Vector3,
  count: number,
  owner: Entity,
  ownerFaction: FactionComponent | undefined,
): void {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

  for (let i = 0; i < count; i++) {
    // Distribute shrapnel in a sphere using golden ratio
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    const direction = new THREE.Vector3(
      radiusAtY * Math.cos(theta),
      y,
      radiusAtY * Math.sin(theta),
    ).normalize();

    const shrapnel = createEntity(world);

    addComponent(
      world,
      shrapnel,
      createTransform(position.x, position.y, position.z),
    );
    addComponent(
      world,
      shrapnel,
      createProjectile(
        owner,
        SHRAPNEL_DAMAGE,
        SHRAPNEL_SPEED,
        SHRAPNEL_RANGE,
        direction,
        'ballistic',
        'Shrapnel',
      ),
    );
    addComponent(world, shrapnel, createCollision(SHRAPNEL_RADIUS));

    if (ownerFaction) {
      addComponent(world, shrapnel, createFaction(ownerFaction.faction));
    }
  }
}
