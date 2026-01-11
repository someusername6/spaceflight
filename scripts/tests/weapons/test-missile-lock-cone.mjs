/**
 * Missile Lock Cone Tests
 *
 * Tests that missile locks:
 * - Don't start when target is outside lock cone (ship not facing target)
 * - Break immediately when ship turns away from target
 * - Work normally when target is inside cone
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  addComponent,
  createEntity,
  createWorld,
} from '../../../src/core/ecs.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { weaponSystem } from '../../../src/systems/weapons/weapons.ts';

/**
 * Create a mock world with player and target.
 * @param {Vector3} targetPos - Target position
 * @param {Quaternion} playerRotation - Player rotation (default: identity = facing -Z)
 */
function createTestSetup(targetPos, playerRotation = new Quaternion()) {
  const world = createWorld(12345);

  const player = createEntity(world);
  const target = createEntity(world);

  // Player transform at origin with specified rotation
  const playerTransform = {
    type: 'transform',
    position: new Vector3(0, 0, 0),
    rotation: playerRotation.clone(),
  };
  addComponent(world, player, playerTransform);

  // Target transform at specified position
  const targetTransform = {
    type: 'transform',
    position: targetPos.clone(),
    rotation: new Quaternion(),
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

  // Player controls
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

  // Seeker missile has lockConeAngle: 60 degrees
  const seekerDef = MISSILES.seeker;

  // Player secondary weapons
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
// Lock Cone Tests
// ============================================================

describe('Missile Lock Cone Tests', () => {
  it('Lock accumulates when target is inside cone (directly ahead)', () => {
    // Target directly in front of player (0 degrees from forward)
    // Player faces -Z (identity quaternion), target at (0, 0, -1000)
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(0, 0, -1000),
    );

    // Run weapon system for 2 seconds (lockSpeed is 0.25, so ~0.5 progress)
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should accumulate when target in cone, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock accumulates when target is at 30 degrees (inside 60 degree cone)', () => {
    // Target at 30 degrees off-axis (inside 60 degree cone)
    // At 30 degrees: x = distance * sin(30) = 1000 * 0.5 = 500
    //                z = distance * -cos(30) = 1000 * -0.866 = -866
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(500, 0, -866),
    );

    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should accumulate at 30 degrees (inside cone), got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock does not accumulate when target is outside cone (90 degrees)', () => {
    // Target directly to the side (90 degrees from forward)
    // Player faces -Z, target at (1000, 0, 0) - perpendicular
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(1000, 0, 0),
    );

    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should not accumulate at 90 degrees (outside cone), got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock does not accumulate when target is behind (180 degrees)', () => {
    // Target behind player
    // Player faces -Z, target at (0, 0, 1000)
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(0, 0, 1000),
    );

    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should not accumulate when target behind, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock is lost when player turns away from target', () => {
    // Start with target in cone
    const { world, playerTransform, secondaryWeapons } = createTestSetup(
      new Vector3(0, 0, -1000),
    );

    // Build partial lock
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    const lockBefore = secondaryWeapons.lockProgress;
    assert.ok(lockBefore > 0.4, `Should have partial lock, got ${lockBefore}`);

    // Turn player 90 degrees - now facing +X instead of -Z
    playerTransform.rotation.setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 2,
    );

    // Run one more tick
    weaponSystem(world, 1 / 60);

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should be lost when turning away, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock resumes when player turns back toward target', () => {
    // Start with target outside cone (to the side)
    const { world, playerTransform, secondaryWeapons } = createTestSetup(
      new Vector3(1000, 0, 0),
    );

    // Try to lock - should fail (target at 90 degrees)
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Should have no lock when target outside cone, got ${secondaryWeapons.lockProgress}`,
    );

    // Turn player to face +X (target is now directly ahead)
    playerTransform.rotation.setFromAxisAngle(
      new Vector3(0, 1, 0),
      -Math.PI / 2,
    );

    // Now lock should accumulate
    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should accumulate when turning toward target, got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock works at exact cone boundary (60 degrees)', () => {
    // Target at exactly 60 degrees
    // At 60 degrees: x = distance * sin(60) = 1000 * 0.866 = 866
    //                z = distance * -cos(60) = 1000 * -0.5 = -500
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(866, 0, -500),
    );

    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should work at exact cone boundary (60 deg), got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock is lost just outside cone boundary (61 degrees)', () => {
    // Target at 61 degrees (just outside 60 degree cone)
    // At 61 degrees: x = distance * sin(61) = 1000 * 0.8746 = 875
    //                z = distance * -cos(61) = 1000 * -0.4848 = -485
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(875, 0, -485),
    );

    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Lock should not work outside cone (61 deg), got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Lock works when target is above (inside vertical cone)', () => {
    // Target above player at 45 degrees (inside 60 degree cone)
    // At 45 degrees up: y = distance * sin(45) = 1000 * 0.707 = 707
    //                   z = distance * -cos(45) = 1000 * -0.707 = -707
    const { world, secondaryWeapons } = createTestSetup(
      new Vector3(0, 707, -707),
    );

    for (let i = 0; i < 120; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 0.4,
      `Lock should work when target above (inside cone), got ${secondaryWeapons.lockProgress}`,
    );
  });

  it('Full lock is lost when player turns away', () => {
    // Start with target in cone, get full lock
    const { world, playerTransform, secondaryWeapons } = createTestSetup(
      new Vector3(0, 0, -1000),
    );

    // Build full lock (4+ seconds at lockSpeed 0.25)
    for (let i = 0; i < 300; i++) {
      weaponSystem(world, 1 / 60);
    }

    assert.ok(
      secondaryWeapons.lockProgress >= 1,
      `Should have full lock, got ${secondaryWeapons.lockProgress}`,
    );

    // Turn player away
    playerTransform.rotation.setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 2,
    );

    // Run one more tick
    weaponSystem(world, 1 / 60);

    assert.ok(
      secondaryWeapons.lockProgress === 0,
      `Full lock should be lost when turning away, got ${secondaryWeapons.lockProgress}`,
    );
  });
});
