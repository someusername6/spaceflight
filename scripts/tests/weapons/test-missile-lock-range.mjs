/**
 * Missile Lock Range Tests
 *
 * Tests that missile locks:
 * - Don't start when target is outside missile range
 * - Break immediately when target moves out of range
 * - Work normally when target is in range
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import {
  addComponent,
  createEntity,
  createWorld,
} from '../../../src/core/ecs.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { weaponSystem } from '../../../src/systems/weapons/weapons.ts';

// Create a mock world with player and target at specified distance
function createTestSetup(distance) {
  const world = createWorld(12345);

  // Create player entity
  const player = createEntity(world);

  // Create target entity
  const target = createEntity(world);

  // Player transform at origin
  const playerTransform = {
    type: 'transform',
    position: new Vector3(0, 0, 0),
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  };
  addComponent(world, player, playerTransform);

  // Target transform at specified distance
  const targetTransform = {
    type: 'transform',
    position: new Vector3(0, 0, -distance),
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  };
  addComponent(world, target, targetTransform);

  // Player health (not dead)
  addComponent(world, player, { type: 'health', hull: 100, maxHull: 100 });

  // Player targeting with target selected
  addComponent(world, player, {
    type: 'targeting',
    currentTarget: target,
    validTargets: [target],
    targetIndex: 0,
  });

  // Player controls (needed for weapon system)
  addComponent(world, player, {
    type: 'playerControlled',
    input: {
      thrust: 0,
      strafe: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      afterburner: false,
      brake: false,
      firePrimary: false,
      fireSecondary: false,
      cycleWeaponNext: false,
      cycleWeaponPrev: false,
      cycleTargetNext: false,
      cycleTargetPrev: false,
      targetNearest: false,
      toggleLink: false,
      launchDecoy: false,
    },
  });

  // Seeker missile has range 1200m
  const seekerDef = MISSILES.seeker;

  // Player secondary weapons with seeker missiles
  const secondaryWeapons = {
    type: 'secondaryWeapons',
    weapons: [
      {
        ...seekerDef,
        count: 8,
        maxCount: 8,
        bankSize: 1,
      },
    ],
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: undefined,
    lockProgress: 0,
    lockWeaponIndex: -1,
  };
  addComponent(world, player, secondaryWeapons);

  return {
    world,
    player,
    target,
    playerTransform,
    targetTransform,
    secondaryWeapons,
  };
}

// ============================================================
// Lock Range Tests
// ============================================================

describe('Missile Lock Range Tests', () => {
  it('Lock does not accumulate when target is outside missile range', () => {
    // Seeker range is 2000m, place target at 2500m
    const { world, secondaryWeapons } = createTestSetup(2500);

    // Run weapon system for 2 seconds (lockSpeed is 0.25, so ~0.5 if in range)
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should not accumulate when out of range, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock accumulates when target is inside missile range', () => {
    // Seeker range is 2000m, place target at 1000m
    const { world, secondaryWeapons } = createTestSetup(1000);

    // Run weapon system for 2 seconds (lockSpeed is 0.25, so ~0.5 progress)
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should accumulate when in range, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock is lost immediately when target moves out of range', () => {
    // Start with target in range
    const { world, targetTransform, secondaryWeapons } = createTestSetup(1000);

    // Build up a partial lock (2 seconds at lockSpeed 0.25 = 50%)
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    const lockBeforeMove = secondaryWeapons.lockProgress;
    assert.ok(
      lockBeforeMove > 0.4,
      `Should have partial lock before move, got ${lockBeforeMove}`,
    );

    // Move target out of range (2500m > 2000m seeker range)
    targetTransform.position.z = -2500;

    // Run one more tick
    weaponSystem(world, 1 / 60);

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should be lost when target moves out of range, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Full lock is lost immediately when target moves out of range', () => {
    // Start with target in range
    const { world, targetTransform, secondaryWeapons } = createTestSetup(1000);

    // Build up full lock (4+ seconds at lockSpeed 0.25)
    for (let i = 0; i < 300; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 1,
      `Should have full lock before move, got ${secondaryWeapons.lockProgress}`,
    );

    // Move target out of range
    targetTransform.position.z = -2500;

    // Run one more tick
    weaponSystem(world, 1 / 60);

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Full lock should be lost when target moves out of range, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock resumes when target moves back in range', () => {
    // Start with target out of range
    const { world, targetTransform, secondaryWeapons } = createTestSetup(2500);

    // Try to lock - should fail
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Should have no lock when out of range, got ${secondaryWeapons.lockProgress}`,
    );

    // Move target in range
    targetTransform.position.z = -1000;

    // Now lock should accumulate (2 seconds at lockSpeed 0.25 = 50%)
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should accumulate when target moves in range, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock works at exact missile range boundary', () => {
    // Seeker range is 2000m, place target at exactly 2000m
    const { world, secondaryWeapons } = createTestSetup(2000);

    // Run weapon system
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should work at exact range boundary, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock is lost just outside missile range boundary', () => {
    // Seeker range is 2000m, place target at 2001m
    const { world, secondaryWeapons } = createTestSetup(2001);

    // Run weapon system
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should not work just outside range, got ${secondaryWeapons.lockProgress}`,
    );
  });
});
