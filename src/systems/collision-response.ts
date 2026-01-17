/**
 * Collision Response System - Keeps ships from overlapping.
 *
 * Uses sliding collision - ships slide along each other instead of stopping.
 * This works like wall collision in FPS games: you don't stop when you hit
 * a wall at an angle, you slide along it.
 *
 * The key insight: we can't just clamp velocity once, because thrust keeps
 * getting applied. Instead, we:
 * 1. Push ships apart (position correction)
 * 2. Project velocity to slide along the collision surface
 * 3. Add separation velocity to counteract ongoing thrust
 */

import { Vector3 } from 'three';
import { getComponent } from '../core/ecs';
import type { World } from '../core/types';
import { hullCollisions } from './collision';

/** Minimum gap to maintain between ships after separation */
const SEPARATION_GAP = 1.0;

/**
 * Separation velocity added per unit of penetration.
 * This counteracts thrust that's pushing ships together.
 * Higher = ships bounce apart faster, lower = more "sticky" collisions.
 */
const SEPARATION_VELOCITY_FACTOR = 2.0;

// Reusable vectors
const _separationDir = new Vector3();

/**
 * Collision response system - enforces non-overlap constraint with sliding.
 *
 * Must run AFTER collisionSystem in the system order.
 */
export function collisionResponseSystem(world: World, _dt: number): void {
  for (const collision of hullCollisions) {
    const transformA = getComponent(world, collision.entityA, 'transform');
    const transformB = getComponent(world, collision.entityB, 'transform');
    const physicsA = getComponent(world, collision.entityA, 'physics');
    const physicsB = getComponent(world, collision.entityB, 'physics');
    const hullA = getComponent(world, collision.entityA, 'hullCollider');
    const hullB = getComponent(world, collision.entityB, 'hullCollider');

    if (
      !transformA ||
      !transformB ||
      !physicsA ||
      !physicsB ||
      !hullA ||
      !hullB
    ) {
      continue;
    }

    // Get masses for weighting (heavier objects move less)
    const massA = hullA.mass;
    const massB = hullB.mass;
    const totalMass = massA + massB;
    if (totalMass === 0) continue;

    const massRatioA = massB / totalMass; // A moves more if B is heavier
    const massRatioB = massA / totalMass; // B moves more if A is heavier

    // Use center-to-center direction for stable separation
    _separationDir.copy(transformB.position).sub(transformA.position);
    const dist = _separationDir.length();
    if (dist < 0.001) {
      // Centers exactly coincide (extremely rare) - use arbitrary direction
      _separationDir.set(1, 0, 0);
    } else {
      _separationDir.divideScalar(dist);
    }

    // === STEP 1: Position Correction ===
    const correction = collision.penetration + SEPARATION_GAP;
    transformA.position.addScaledVector(
      _separationDir,
      -correction * massRatioA,
    );
    transformB.position.addScaledVector(
      _separationDir,
      correction * massRatioB,
    );

    // === STEP 2: Velocity Sliding ===
    // Project each ship's velocity onto the plane tangent to collision.
    // This makes ships "slide" along each other instead of stopping.

    // Ship A: remove velocity component toward B, keep tangent component
    const velATowardB = physicsA.velocity.dot(_separationDir);
    if (velATowardB > 0) {
      physicsA.velocity.addScaledVector(_separationDir, -velATowardB);
    }

    // Ship B: remove velocity component toward A
    const velBTowardA = -physicsB.velocity.dot(_separationDir);
    if (velBTowardA > 0) {
      physicsB.velocity.addScaledVector(_separationDir, velBTowardA);
    }

    // === STEP 3: Separation Velocity ===
    // Add outward velocity proportional to penetration depth.
    // This counteracts the thrust that keeps pushing ships together.
    // Without this, ships would immediately re-collide because thrust
    // is applied every frame in the ship's facing direction.
    const separationSpeed = collision.penetration * SEPARATION_VELOCITY_FACTOR;
    physicsA.velocity.addScaledVector(
      _separationDir,
      -separationSpeed * massRatioA,
    );
    physicsB.velocity.addScaledVector(
      _separationDir,
      separationSpeed * massRatioB,
    );
  }
}
