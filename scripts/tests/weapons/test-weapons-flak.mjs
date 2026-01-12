/**
 * Flak weapon behavior tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import {
  areEnemies,
  createFaction,
  Faction,
} from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { spawnShrapnel } from '../../../src/systems/weapons/shrapnel.ts';

describe('Flak Cannon Tests', () => {
  it('Flak projectile has flakRadius and shrapnelCount', () => {
    const owner = 1;
    const direction = new THREE.Vector3(0, 0, -1);
    const flakRadius = 50;
    const shrapnelCount = 10;

    const projectile = createProjectile(
      owner,
      0, // damage (shell does no damage)
      400, // speed
      600, // range
      direction,
      'ballistic',
      'Flak',
      { flakRadius, shrapnelCount },
    );

    assert.ok(projectile.flakRadius === 50, 'Flak radius should be 50');
    assert.ok(projectile.shrapnelCount === 10, 'Shrapnel count should be 10');
    assert.ok(projectile.weaponName === 'Flak', 'Weapon name should be Flak');
    assert.ok(
      projectile.category === 'ballistic',
      'Category should be ballistic',
    );
  });

  it('Regular projectile does not have flak properties', () => {
    const owner = 1;
    const direction = new THREE.Vector3(0, 0, -1);

    const projectile = createProjectile(
      owner,
      25, // damage
      400, // speed
      800, // range
      direction,
      'energy',
      'Plasma',
    );

    assert.ok(
      projectile.flakRadius === undefined,
      'Regular projectile should not have flakRadius',
    );
    assert.ok(
      projectile.shrapnelCount === undefined,
      'Regular projectile should not have shrapnelCount',
    );
  });

  it('Shrapnel projectile inherits parent weapon name for stats', () => {
    const owner = 1;
    const direction = new THREE.Vector3(1, 0, 0).normalize();

    // Shrapnel should be attributed to parent weapon (e.g., "Flak")
    const shrapnel = createProjectile(
      owner,
      50, // shrapnel damage
      450, // shrapnel speed
      120, // shrapnel range
      direction,
      'ballistic',
      'Flak', // Parent weapon name for stats attribution
    );

    assert.ok(
      shrapnel.weaponName === 'Flak',
      'Shrapnel should be attributed to parent weapon (Flak)',
    );
    assert.ok(
      shrapnel.category === 'ballistic',
      'Category should be ballistic',
    );
    assert.ok(shrapnel.damage === 50, 'Shrapnel damage should be 50');
    assert.ok(shrapnel.speed === 450, 'Shrapnel speed should be 450');
    assert.ok(shrapnel.range === 120, 'Shrapnel range should be 120');
  });

  it('Flak explosion detects enemies within radius', () => {
    const world = createWorld();

    // Create owner ship (player)
    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create flak projectile at position (100, 0, 0)
    const flakEntity = createEntity(world);
    addComponent(world, flakEntity, createTransform(100, 0, 0));
    addComponent(
      world,
      flakEntity,
      createProjectile(
        owner,
        15,
        350,
        600,
        new THREE.Vector3(1, 0, 0),
        'ballistic',
        'Flak',
        80,
        8,
      ),
    );
    addComponent(world, flakEntity, createFaction(Faction.Player));

    // Create enemy at (150, 0, 0) - 50 units away, within 80 unit radius
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(150, 0, 0));
    addComponent(world, enemy, createHealth(100));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    // Check distance - should be within flak radius
    const flakTransform = getComponent(world, flakEntity, 'transform');
    const enemyTransform = getComponent(world, enemy, 'transform');
    const distance = flakTransform.position.distanceTo(enemyTransform.position);

    assert.ok(distance === 50, `Distance should be 50, got ${distance}`);
    assert.ok(distance <= 80, 'Enemy should be within flak radius of 80');
  });

  it('Flak does not detect same faction entities within radius', () => {
    const world = createWorld();

    // Create owner ship (player)
    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create friendly ship (same faction) at (50, 0, 0) - within flak radius
    const friendly = createEntity(world);
    addComponent(world, friendly, createTransform(50, 0, 0));
    addComponent(world, friendly, createHealth(100));
    addComponent(world, friendly, createFaction(Faction.Player));

    // Same faction should not be enemies
    const ownerFaction = getComponent(world, owner, 'faction');
    const friendlyFaction = getComponent(world, friendly, 'faction');

    assert.ok(
      !areEnemies(ownerFaction.faction, friendlyFaction.faction),
      'Same faction should not be enemies',
    );
  });

  it('Flak does not detect enemies outside radius', () => {
    const world = createWorld();

    // Create owner ship (player)
    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    // Create flak projectile at (100, 0, 0)
    const flakEntity = createEntity(world);
    addComponent(world, flakEntity, createTransform(100, 0, 0));

    // Create enemy at (200, 0, 0) - 100 units away, outside 80 unit radius
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(200, 0, 0));
    addComponent(world, enemy, createHealth(100));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    const flakTransform = getComponent(world, flakEntity, 'transform');
    const enemyTransform = getComponent(world, enemy, 'transform');
    const distance = flakTransform.position.distanceTo(enemyTransform.position);

    assert.ok(distance === 100, `Distance should be 100, got ${distance}`);
    assert.ok(distance > 80, 'Enemy should be outside flak radius of 80');
  });

  it('spawnShrapnel creates projectiles with parent weapon name', () => {
    const world = createWorld();

    // Create owner ship
    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const ownerFaction = getComponent(world, owner, 'faction');
    const position = new THREE.Vector3(100, 0, 0);

    // Spawn shrapnel with parent weapon name "Flak"
    spawnShrapnel(world, position, 8, owner, ownerFaction, 'Flak');

    // Verify shrapnel projectiles were created with correct weapon name
    const projectiles = [...queryEntities(world, ['projectile'])];
    assert.ok(
      projectiles.length === 8,
      `Should spawn 8 shrapnel, got ${projectiles.length}`,
    );

    for (const entity of projectiles) {
      const proj = getComponent(world, entity, 'projectile');
      assert.ok(
        proj.weaponName === 'Flak',
        `Shrapnel should have weaponName "Flak", got "${proj.weaponName}"`,
      );
      assert.ok(proj.category === 'ballistic', 'Shrapnel should be ballistic');
    }
  });

  it('spawnShrapnel attributes damage to any parent weapon', () => {
    const world = createWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));

    const position = new THREE.Vector3(0, 0, 0);

    // Test with a hypothetical different weapon name
    spawnShrapnel(world, position, 3, owner, undefined, 'CustomFlakGun');

    const projectiles = [...queryEntities(world, ['projectile'])];
    assert.ok(
      projectiles.length === 3,
      `Should spawn 3 shrapnel, got ${projectiles.length}`,
    );

    for (const entity of projectiles) {
      const proj = getComponent(world, entity, 'projectile');
      assert.ok(
        proj.weaponName === 'CustomFlakGun',
        `Shrapnel should inherit parent name "CustomFlakGun", got "${proj.weaponName}"`,
      );
    }
  });
});
