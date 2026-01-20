/**
 * Tracking Missile Tests - Verify tracking missiles damage all target types.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createEnemyConvoy,
  createEnemyShip,
  createEnemyStation,
} from '../shared/weapon-damage-utils.mjs';
import { testMissileDamage } from './missile-test-helpers.mjs';

// ============================================================================
// Tests: Tracking Missiles vs Ships
// ============================================================================

describe('Tracking Missiles vs Ships', () => {
  const trackingMissiles = ['seeker', 'dart', 'torpedo'];

  for (const missileKey of trackingMissiles) {
    it(`${missileKey} damages enemy ship`, () => {
      const { hitDetected, stats } = testMissileDamage(
        missileKey,
        createEnemyShip,
        true,
      );

      assert.ok(hitDetected, `${stats.name} should hit and damage enemy ship`);
    });
  }
});

// ============================================================================
// Tests: Tracking Missiles vs Convoys
// ============================================================================

describe('Tracking Missiles vs Convoys', () => {
  const trackingMissiles = ['seeker', 'dart', 'torpedo'];

  for (const missileKey of trackingMissiles) {
    it(`${missileKey} damages enemy convoy`, () => {
      const { hitDetected, stats } = testMissileDamage(
        missileKey,
        createEnemyConvoy,
        true,
      );

      assert.ok(
        hitDetected,
        `${stats.name} should hit and damage enemy convoy`,
      );
    });
  }
});

// ============================================================================
// Tests: Tracking Missiles vs Stations
// ============================================================================

describe('Tracking Missiles vs Stations', () => {
  const trackingMissiles = ['seeker', 'dart', 'torpedo'];

  for (const missileKey of trackingMissiles) {
    it(`${missileKey} damages enemy station`, () => {
      const { hitDetected, stats } = testMissileDamage(
        missileKey,
        createEnemyStation,
        true,
      );

      assert.ok(
        hitDetected,
        `${stats.name} should hit and damage enemy station`,
      );
    });
  }
});

// ============================================================================
// Tests: Cluster Missiles vs All Targets
// ============================================================================

describe('Cluster Missiles vs All Targets', () => {
  it('cluster damages enemy ship', () => {
    const { hitDetected, stats } = testMissileDamage(
      'cluster',
      createEnemyShip,
      true,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy ship`);
  });

  it('cluster damages enemy convoy', () => {
    const { hitDetected, stats } = testMissileDamage(
      'cluster',
      createEnemyConvoy,
      true,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy convoy`);
  });

  it('cluster damages enemy station', () => {
    const { hitDetected, stats } = testMissileDamage(
      'cluster',
      createEnemyStation,
      true,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy station`);
  });
});

// ============================================================================
// Tests: Swarm Missiles vs All Targets
// ============================================================================

describe('Swarm Missiles vs All Targets', () => {
  it('swarm damages enemy ship', () => {
    const { hitDetected, stats } = testMissileDamage(
      'swarm',
      createEnemyShip,
      true,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy ship`);
  });

  it('swarm damages enemy convoy', () => {
    const { hitDetected, stats } = testMissileDamage(
      'swarm',
      createEnemyConvoy,
      true,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy convoy`);
  });

  it('swarm damages enemy station', () => {
    const { hitDetected, stats } = testMissileDamage(
      'swarm',
      createEnemyStation,
      true,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy station`);
  });
});

// ============================================================================
// Tests: Dumbfire Missiles vs All Targets
// ============================================================================

describe('Dumbfire Missiles (Rocket) vs All Targets', () => {
  it('rocket damages enemy ship', () => {
    const { hitDetected, stats } = testMissileDamage(
      'rocket',
      createEnemyShip,
      false,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy ship`);
  });

  it('rocket damages enemy convoy', () => {
    const { hitDetected, stats } = testMissileDamage(
      'rocket',
      createEnemyConvoy,
      false,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy convoy`);
  });

  it('rocket damages enemy station', () => {
    const { hitDetected, stats } = testMissileDamage(
      'rocket',
      createEnemyStation,
      false,
    );

    assert.ok(hitDetected, `${stats.name} should hit and damage enemy station`);
  });
});
