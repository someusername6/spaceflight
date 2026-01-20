/**
 * Projectile Damage Tests - Verify projectile weapons deal damage to targets.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { addComponent, createEntity } from '../../../src/core/ecs.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createCollision } from '../../../src/systems/collision.ts';
import {
  calculateDamage,
  countProjectiles,
  createEnemyConvoy,
  createEnemyShip,
  createEnemyStation,
  createSimpleTarget,
  createTestWorld,
  getTotalHealth,
  runForTicks,
  TICK_SEC,
} from '../shared/weapon-damage-utils.mjs';

// ============================================================================
// Helper Functions
// ============================================================================

function spawnProjectile(world, weaponKey, startPos, targetPos, owner) {
  const weapon = PRIMARY_WEAPONS[weaponKey];
  if (!weapon || weapon.category === 'beam') {
    throw new Error(`${weaponKey} is not a projectile weapon`);
  }

  const direction = targetPos.clone().sub(startPos).normalize();
  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(startPos.x, startPos.y, startPos.z),
  );
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createCollision(0.5));

  const projectile = createProjectile(
    owner,
    weapon.damage,
    weapon.projectileSpeed,
    weapon.range,
    direction,
    weapon.category,
    weapon.name,
    weapon.flakRadius !== undefined
      ? {
          flakRadius: weapon.flakRadius,
          shrapnelCount: weapon.shrapnelCount,
          shrapnelDamage: weapon.shrapnelDamage,
          shrapnelSpeed: weapon.shrapnelSpeed,
          shrapnelRange: weapon.shrapnelRange,
        }
      : undefined,
  );

  addComponent(world, entity, projectile);
  return entity;
}

function testProjectileDamage(weaponKey, createTarget) {
  const weapon = PRIMARY_WEAPONS[weaponKey];
  if (!weapon || weapon.category === 'beam') {
    return;
  }

  const world = createTestWorld();

  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 200));
  addComponent(world, owner, createFaction(Faction.Player));

  const target = createTarget(world, new Vector3(0, 0, 0));
  const before = getTotalHealth(world, target);

  const speed = weapon.initialSpeed ?? weapon.projectileSpeed;
  const distancePerTick = speed * TICK_SEC;

  let startDistance = 20;
  if (distancePerTick > 10) {
    startDistance = Math.max(8, distancePerTick * 0.3);
  }

  const projectileStart = new Vector3(0, 0, startDistance);
  spawnProjectile(
    world,
    weaponKey,
    projectileStart,
    new Vector3(0, 0, 0),
    owner,
  );

  let hitDetected = false;
  for (let tick = 0; tick < 120; tick++) {
    runForTicks(world, 1);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    if (damage.totalDamage > 0) {
      hitDetected = true;
      break;
    }

    if (countProjectiles(world) === 0 && tick > 10) {
      break;
    }
  }

  return { hitDetected, weapon };
}

// ============================================================================
// Tests: Projectile Weapons vs Simple Targets
// ============================================================================

describe('Primary Projectile Weapons vs Simple Targets', () => {
  const projectileWeapons = [
    'plasma',
    'pulse',
    'ion',
    'autocannon',
    'slugCannon',
    'gyrojet',
    'railgun',
  ];

  for (const weaponKey of projectileWeapons) {
    it(`${weaponKey} damages simple target`, () => {
      const { hitDetected, weapon } = testProjectileDamage(
        weaponKey,
        (world, pos) => createSimpleTarget(world, pos, 100, 50, 15),
      );

      assert.ok(
        hitDetected,
        `${weapon.name} should hit and damage simple target`,
      );
    });
  }
});

// ============================================================================
// Tests: Projectile Weapons vs Ships
// ============================================================================

describe('Primary Projectile Weapons vs Ships', () => {
  const projectileWeapons = [
    'plasma',
    'pulse',
    'ion',
    'autocannon',
    'slugCannon',
    'gyrojet',
    'railgun',
  ];

  for (const weaponKey of projectileWeapons) {
    it(`${weaponKey} damages enemy ship`, () => {
      const { hitDetected, weapon } = testProjectileDamage(
        weaponKey,
        createEnemyShip,
      );

      assert.ok(hitDetected, `${weapon.name} should hit and damage enemy ship`);
    });
  }
});

// ============================================================================
// Tests: Projectile Weapons vs Convoys
// ============================================================================

describe('Primary Projectile Weapons vs Convoys', () => {
  const projectileWeapons = [
    'plasma',
    'pulse',
    'ion',
    'autocannon',
    'slugCannon',
    'railgun',
    'gyrojet',
  ];

  for (const weaponKey of projectileWeapons) {
    it(`${weaponKey} damages enemy convoy`, () => {
      const { hitDetected, weapon } = testProjectileDamage(
        weaponKey,
        createEnemyConvoy,
      );

      assert.ok(
        hitDetected,
        `${weapon.name} should hit and damage enemy convoy`,
      );
    });
  }
});

// ============================================================================
// Tests: Projectile Weapons vs Stations
// ============================================================================

describe('Primary Projectile Weapons vs Stations', () => {
  const projectileWeapons = [
    'plasma',
    'pulse',
    'ion',
    'autocannon',
    'slugCannon',
    'railgun',
    'gyrojet',
  ];

  for (const weaponKey of projectileWeapons) {
    it(`${weaponKey} damages enemy station`, () => {
      const { hitDetected, weapon } = testProjectileDamage(
        weaponKey,
        createEnemyStation,
      );

      assert.ok(
        hitDetected,
        `${weapon.name} should hit and damage enemy station`,
      );
    });
  }
});

// ============================================================================
// Tests: Damage Priority (Shields before Hull)
// ============================================================================

describe('Damage Priority - Shields Before Hull', () => {
  it('plasma damages shields before hull', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createSimpleTarget(world, new Vector3(0, 0, 0), 100, 50);
    const before = getTotalHealth(world, target);

    assert.ok(before.shields > 0, 'Target should have shields');

    spawnProjectile(
      world,
      'plasma',
      new Vector3(0, 0, 50),
      new Vector3(0, 0, 0),
      owner,
    );

    for (let tick = 0; tick < 60; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);

      if (damage.totalDamage > 0) {
        assert.ok(damage.shieldDamage > 0, `Damage should go to shields first`);
        break;
      }
    }
  });

  it('damage overflows from shields to hull', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createSimpleTarget(world, new Vector3(0, 0, 0), 100, 10);
    const before = getTotalHealth(world, target);

    assert.strictEqual(before.shields, 10, 'Target should have 10 shields');
    assert.strictEqual(before.hull, 100, 'Target should have 100 hull');

    spawnProjectile(
      world,
      'railgun',
      new Vector3(0, 0, 50),
      new Vector3(0, 0, 0),
      owner,
    );

    let damageDetected = false;
    for (let tick = 0; tick < 60; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);

      if (damage.totalDamage > 0) {
        damageDetected = true;
      }

      if (damageDetected && countProjectiles(world) === 0) {
        const finalAfter = getTotalHealth(world, target);
        const finalDamage = calculateDamage(before, finalAfter);

        assert.strictEqual(
          finalDamage.shieldDamage,
          10,
          'Should deplete all shields',
        );
        assert.strictEqual(
          finalDamage.hullDamage,
          70,
          'Hull should take overflow damage (80 railgun - 10 shields = 70)',
        );
        break;
      }
    }

    assert.ok(damageDetected, 'Railgun should have hit target');
  });
});
