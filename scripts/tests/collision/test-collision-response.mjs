/**
 * Tests for collision response system.
 *
 * Verifies that:
 * - Ships cannot get stuck inside each other
 * - Mass ratios affect collision response correctly
 * - Ships slide along surfaces instead of stopping
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createCollision } from '../../../src/components/collision.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../src/core/ecs.ts';
import { collisionSystem } from '../../../src/systems/collision.ts';
import { collisionResponseSystem } from '../../../src/systems/collision-response.ts';

/**
 * Create a simple box hull collider for testing.
 * Box is centered at origin with given half-extents.
 */
function createTestBoxHull(halfX, halfY, halfZ, mass = 1000) {
  // Box has 6 faces, each with an outward-pointing normal
  const planes = [
    { nx: 1, ny: 0, nz: 0, d: halfX }, // +X face
    { nx: -1, ny: 0, nz: 0, d: halfX }, // -X face
    { nx: 0, ny: 1, nz: 0, d: halfY }, // +Y face
    { nx: 0, ny: -1, nz: 0, d: halfY }, // -Y face
    { nx: 0, ny: 0, nz: 1, d: halfZ }, // +Z face
    { nx: 0, ny: 0, nz: -1, d: halfZ }, // -Z face
  ];

  const boundingRadius = Math.sqrt(
    halfX * halfX + halfY * halfY + halfZ * halfZ,
  );

  return {
    type: 'hullCollider',
    planes,
    boundingRadius,
    mass,
    useHullForWeapons: false,
  };
}

describe('Collision Response - Ships Cannot Get Stuck', () => {
  it('separates deeply overlapping ships after collision response', () => {
    const world = createWorld(12345);

    // Create two ships with hulls deeply overlapping
    const entityA = createEntity(world);
    const entityB = createEntity(world);

    // Ship A at origin
    addComponent(world, entityA, createTransform(0, 0, 0));
    const physA = createPhysics({ maxSpeed: 100 });
    physA.velocity.set(20, 0, 0); // Moving toward B
    addComponent(world, entityA, physA);
    addComponent(world, entityA, createCollision(10));
    addComponent(world, entityA, createTestBoxHull(10, 5, 20, 1000));

    // Ship B deeply overlapping with A (centers 5 units apart, boxes extend 10 each)
    addComponent(world, entityB, createTransform(5, 0, 0));
    const physB = createPhysics({ maxSpeed: 100 });
    addComponent(world, entityB, physB);
    addComponent(world, entityB, createCollision(10));
    addComponent(world, entityB, createTestBoxHull(10, 5, 20, 1000));

    const transformA = getComponent(world, entityA, 'transform');
    const transformB = getComponent(world, entityB, 'transform');

    const initialDist = transformA.position.distanceTo(transformB.position);

    // Run collision detection and response multiple times
    for (let i = 0; i < 5; i++) {
      collisionSystem(world, 1 / 60);
      collisionResponseSystem(world, 1 / 60);
    }

    const finalDist = transformA.position.distanceTo(transformB.position);
    assert.ok(
      finalDist > initialDist,
      `Ships should be pushed apart (${initialDist} -> ${finalDist})`,
    );
  });

  it('reduces velocity when ships collide', () => {
    const world = createWorld(12345);

    // Create two ships that will collide
    const entityA = createEntity(world);
    const entityB = createEntity(world);

    // Ship A moving toward B at high speed
    addComponent(world, entityA, createTransform(0, 0, 0));
    const physA = createPhysics({ maxSpeed: 150 });
    physA.velocity.set(50, 0, 0); // Moving toward B
    addComponent(world, entityA, physA);
    addComponent(world, entityA, createCollision(10));
    addComponent(world, entityA, createTestBoxHull(10, 5, 20, 1000));

    // Ship B ahead of A, will be hit
    addComponent(world, entityB, createTransform(10, 0, 0)); // Overlapping with A
    const physB = createPhysics({ maxSpeed: 60 });
    physB.velocity.set(0, 0, 0); // Stationary
    addComponent(world, entityB, physB);
    addComponent(world, entityB, createCollision(10));
    addComponent(world, entityB, createTestBoxHull(10, 5, 20, 3000)); // Heavier

    const initialVelA = physA.velocity.x;

    // Run collision system
    collisionSystem(world, 1 / 60);
    collisionResponseSystem(world, 1 / 60);

    // Ship A's velocity toward B should be reduced (bounced back)
    const finalVelA = physA.velocity.x;
    assert.ok(
      finalVelA < initialVelA,
      `Ship A velocity should be reduced after collision (was ${initialVelA}, now ${finalVelA})`,
    );
  });

  it('prevents fast ship from penetrating slow convoy', () => {
    const world = createWorld(12345);

    // Fighter (small, fast) approaching convoy from behind
    const fighter = createEntity(world);
    addComponent(world, fighter, createTransform(0, 0, 50));
    const fighterPhys = createPhysics({ maxSpeed: 125 });
    fighterPhys.velocity.set(0, 0, -100); // Flying toward convoy
    addComponent(world, fighter, fighterPhys);
    addComponent(world, fighter, createCollision(5));
    addComponent(world, fighter, createTestBoxHull(5, 3, 10, 500));

    // Convoy (large, slow) ahead of fighter
    const convoy = createEntity(world);
    addComponent(world, convoy, createTransform(0, 0, 0));
    const convoyPhys = createPhysics({ maxSpeed: 55 });
    convoyPhys.velocity.set(0, 0, -55); // Moving forward slowly
    addComponent(world, convoy, convoyPhys);
    addComponent(world, convoy, createCollision(35));
    addComponent(world, convoy, createTestBoxHull(20, 15, 40, 10000));

    // Simulate multiple frames of approach and collision
    for (let i = 0; i < 20; i++) {
      collisionSystem(world, 1 / 60);
      collisionResponseSystem(world, 1 / 60);
    }

    const fighterTransform = getComponent(world, fighter, 'transform');
    const convoyTransform = getComponent(world, convoy, 'transform');
    const distance = fighterTransform.position.distanceTo(
      convoyTransform.position,
    );

    // Fighter should be pushed back, maintaining separation
    assert.ok(
      distance > 15,
      `Fighter should be separated from convoy (distance: ${distance})`,
    );
  });
});

describe('Mass Ratio Effects', () => {
  it('light ship bounces off heavy ship more', () => {
    const world = createWorld(12345);

    // Light fighter
    const fighter = createEntity(world);
    addComponent(world, fighter, createTransform(0, 0, 0));
    const fighterPhys = createPhysics({ maxSpeed: 125 });
    fighterPhys.velocity.set(50, 0, 0);
    addComponent(world, fighter, fighterPhys);
    addComponent(world, fighter, createCollision(5));
    addComponent(world, fighter, createTestBoxHull(5, 3, 10, 500)); // Light: 500

    // Heavy transport (overlapping)
    const transport = createEntity(world);
    addComponent(world, transport, createTransform(8, 0, 0));
    const transportPhys = createPhysics({ maxSpeed: 55 });
    transportPhys.velocity.set(0, 0, 0);
    addComponent(world, transport, transportPhys);
    addComponent(world, transport, createCollision(20));
    addComponent(world, transport, createTestBoxHull(20, 15, 40, 10000)); // Heavy: 10000

    const fighterPosBefore = getComponent(world, fighter, 'transform').position
      .x;
    const transportPosBefore = getComponent(world, transport, 'transform')
      .position.x;

    collisionSystem(world, 1 / 60);
    collisionResponseSystem(world, 1 / 60);

    const fighterPosAfter = getComponent(world, fighter, 'transform').position
      .x;
    const transportPosAfter = getComponent(world, transport, 'transform')
      .position.x;

    const fighterMove = Math.abs(fighterPosAfter - fighterPosBefore);
    const transportMove = Math.abs(transportPosAfter - transportPosBefore);

    // Fighter should move much more than transport (mass ratio ~20:1)
    assert.ok(
      fighterMove > transportMove * 5,
      `Light ship should move more (fighter: ${fighterMove.toFixed(2)}, transport: ${transportMove.toFixed(2)})`,
    );
  });

  it('equal mass ships move equally', () => {
    const world = createWorld(12345);

    // Ship A
    const shipA = createEntity(world);
    addComponent(world, shipA, createTransform(0, 0, 0));
    const physA = createPhysics({ maxSpeed: 100 });
    physA.velocity.set(30, 0, 0);
    addComponent(world, shipA, physA);
    addComponent(world, shipA, createCollision(10));
    addComponent(world, shipA, createTestBoxHull(10, 5, 15, 1000));

    // Ship B (same mass, overlapping)
    const shipB = createEntity(world);
    addComponent(world, shipB, createTransform(12, 0, 0));
    const physB = createPhysics({ maxSpeed: 100 });
    physB.velocity.set(-30, 0, 0);
    addComponent(world, shipB, physB);
    addComponent(world, shipB, createCollision(10));
    addComponent(world, shipB, createTestBoxHull(10, 5, 15, 1000));

    const posABefore = getComponent(world, shipA, 'transform').position.x;
    const posBBefore = getComponent(world, shipB, 'transform').position.x;

    collisionSystem(world, 1 / 60);
    collisionResponseSystem(world, 1 / 60);

    const posAAfter = getComponent(world, shipA, 'transform').position.x;
    const posBAfter = getComponent(world, shipB, 'transform').position.x;

    const moveA = Math.abs(posAAfter - posABefore);
    const moveB = Math.abs(posBAfter - posBBefore);

    // Should move roughly equally (within 20%)
    const ratio = moveA / moveB;
    assert.ok(
      ratio > 0.8 && ratio < 1.2,
      `Equal mass ships should move equally (ratio: ${ratio.toFixed(2)})`,
    );
  });
});

describe('Sliding Collision Behavior', () => {
  it('ship slides along surface instead of stopping', () => {
    const world = createWorld(12345);

    // Ship approaching at an angle
    const ship = createEntity(world);
    addComponent(world, ship, createTransform(0, 0, 0));
    const shipPhys = createPhysics({ maxSpeed: 100 });
    // Moving diagonally: toward +X and +Z
    shipPhys.velocity.set(30, 0, 30);
    addComponent(world, ship, shipPhys);
    addComponent(world, ship, createCollision(5));
    addComponent(world, ship, createTestBoxHull(5, 5, 5, 1000));

    // Wall-like obstacle (wide in Z, blocking X movement)
    const wall = createEntity(world);
    addComponent(world, wall, createTransform(8, 0, 0));
    const wallPhys = createPhysics({ maxSpeed: 0 });
    addComponent(world, wall, wallPhys);
    addComponent(world, wall, createCollision(20));
    addComponent(world, wall, createTestBoxHull(3, 10, 50, 100000)); // Very heavy, won't move

    collisionSystem(world, 1 / 60);
    collisionResponseSystem(world, 1 / 60);

    const velocity = getComponent(world, ship, 'physics').velocity;

    // X velocity should be reduced/eliminated (blocked by wall)
    // Z velocity should be preserved (sliding along wall)
    assert.ok(
      velocity.x < 15,
      `X velocity should be reduced after hitting wall (got ${velocity.x.toFixed(1)})`,
    );
    assert.ok(
      velocity.z > 15,
      `Z velocity should be preserved for sliding (got ${velocity.z.toFixed(1)})`,
    );
  });

  it('ship maintains speed when sliding at glancing angle', () => {
    const world = createWorld(12345);

    // Ship approaching at glancing angle (mostly parallel to surface)
    const ship = createEntity(world);
    addComponent(world, ship, createTransform(0, 0, 0));
    const shipPhys = createPhysics({ maxSpeed: 100 });
    // Moving mostly along Z, slightly toward X
    shipPhys.velocity.set(5, 0, 50);
    const initialSpeed = shipPhys.velocity.length();
    addComponent(world, ship, shipPhys);
    addComponent(world, ship, createCollision(5));
    addComponent(world, ship, createTestBoxHull(5, 5, 5, 1000));

    // Obstacle blocking X
    const obstacle = createEntity(world);
    addComponent(world, obstacle, createTransform(8, 0, 0));
    const obstaclePhys = createPhysics({ maxSpeed: 0 });
    addComponent(world, obstacle, obstaclePhys);
    addComponent(world, obstacle, createCollision(20));
    addComponent(world, obstacle, createTestBoxHull(3, 10, 50, 100000));

    collisionSystem(world, 1 / 60);
    collisionResponseSystem(world, 1 / 60);

    const finalSpeed = getComponent(world, ship, 'physics').velocity.length();

    // Speed should be mostly preserved at glancing angle
    // (only the small X component is removed)
    assert.ok(
      finalSpeed > initialSpeed * 0.8,
      `Speed should be mostly preserved at glancing angle (was ${initialSpeed.toFixed(1)}, now ${finalSpeed.toFixed(1)})`,
    );
  });

  it('head-on collision stops approach velocity', () => {
    const world = createWorld(12345);

    // Ship approaching head-on
    const ship = createEntity(world);
    addComponent(world, ship, createTransform(0, 0, 0));
    const shipPhys = createPhysics({ maxSpeed: 100 });
    shipPhys.velocity.set(50, 0, 0); // Directly toward obstacle
    addComponent(world, ship, shipPhys);
    addComponent(world, ship, createCollision(5));
    addComponent(world, ship, createTestBoxHull(5, 5, 5, 1000));

    // Obstacle directly ahead
    const obstacle = createEntity(world);
    addComponent(world, obstacle, createTransform(8, 0, 0));
    const obstaclePhys = createPhysics({ maxSpeed: 0 });
    addComponent(world, obstacle, obstaclePhys);
    addComponent(world, obstacle, createCollision(20));
    addComponent(world, obstacle, createTestBoxHull(5, 5, 5, 100000));

    collisionSystem(world, 1 / 60);
    collisionResponseSystem(world, 1 / 60);

    const velocityX = getComponent(world, ship, 'physics').velocity.x;

    // Head-on collision should eliminate or reverse X velocity
    assert.ok(
      velocityX < 10,
      `Head-on collision should stop/reverse approach (velocityX: ${velocityX.toFixed(1)})`,
    );
  });
});
