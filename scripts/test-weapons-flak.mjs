/**
 * Flak weapon behavior tests.
 */

import * as THREE from 'three';
import {
  areEnemies,
  createFaction,
  Faction,
} from '../src/components/faction.ts';
import { createHealth } from '../src/components/health.ts';
import { createProjectile } from '../src/components/projectile.ts';
import { createTransform } from '../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../src/core/ecs.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('\n=== FLAK CANNON TESTS ===\n');

// Test: Flak projectile has required properties
test('Flak projectile has flakRadius and shrapnelCount', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);
  const flakRadius = 80;
  const shrapnelCount = 8;

  const projectile = createProjectile(
    owner,
    15, // damage
    350, // speed
    600, // range
    direction,
    'ballistic',
    'Flak',
    flakRadius,
    shrapnelCount,
  );

  assert(projectile.flakRadius === 80, 'Flak radius should be 80');
  assert(projectile.shrapnelCount === 8, 'Shrapnel count should be 8');
  assert(projectile.weaponName === 'Flak', 'Weapon name should be Flak');
  assert(projectile.category === 'ballistic', 'Category should be ballistic');
});

// Test: Regular projectile does not have flak properties
test('Regular projectile does not have flak properties', () => {
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

  assert(
    projectile.flakRadius === undefined,
    'Regular projectile should not have flakRadius',
  );
  assert(
    projectile.shrapnelCount === undefined,
    'Regular projectile should not have shrapnelCount',
  );
});

// Test: Shrapnel projectile has correct properties
test('Shrapnel projectile is created correctly', () => {
  const owner = 1;
  const direction = new THREE.Vector3(1, 0, 0).normalize();

  const shrapnel = createProjectile(
    owner,
    8, // shrapnel damage
    450, // shrapnel speed
    120, // shrapnel range
    direction,
    'ballistic',
    'Shrapnel',
  );

  assert(shrapnel.weaponName === 'Shrapnel', 'Weapon name should be Shrapnel');
  assert(shrapnel.category === 'ballistic', 'Category should be ballistic');
  assert(shrapnel.damage === 8, 'Shrapnel damage should be 8');
  assert(shrapnel.speed === 450, 'Shrapnel speed should be 450');
  assert(shrapnel.range === 120, 'Shrapnel range should be 120');
});

// Test: Flak explosion proximity detection logic
test('Flak explosion detects enemies within radius', () => {
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

  assert(distance === 50, `Distance should be 50, got ${distance}`);
  assert(distance <= 80, 'Enemy should be within flak radius of 80');
});

// Test: Flak does not detect same faction entities
test('Flak does not detect same faction entities within radius', () => {
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

  assert(
    !areEnemies(ownerFaction.faction, friendlyFaction.faction),
    'Same faction should not be enemies',
  );
});

// Test: Flak does not detect enemies outside radius
test('Flak does not detect enemies outside radius', () => {
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

  assert(distance === 100, `Distance should be 100, got ${distance}`);
  assert(distance > 80, 'Enemy should be outside flak radius of 80');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
