/**
 * Weapon integration tests - validates full scenarios.
 */

import * as THREE from 'three';
import { createFaction, Faction } from '../src/components/faction.ts';
import { createHealth } from '../src/components/health.ts';
import { createMissile } from '../src/components/missile.ts';
import { createProjectile } from '../src/components/projectile.ts';
import { createTransform } from '../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  queryEntities,
} from '../src/core/ecs.ts';
import { createCollision } from '../src/systems/collision.ts';

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

console.log('\n=== INTEGRATION TESTS ===\n');

// Test: Full flak scenario setup
test('Full flak explosion scenario entities created correctly', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Flak projectile
  const flak = createEntity(world);
  addComponent(world, flak, createTransform(100, 0, 0));
  const flakProj = createProjectile(
    player,
    15,
    350,
    600,
    new THREE.Vector3(1, 0, 0),
    'ballistic',
    'Flak',
    80,
    8,
  );
  addComponent(world, flak, flakProj);
  addComponent(world, flak, createFaction(Faction.Player));
  addComponent(world, flak, createCollision(0.5));

  // Enemy in range
  const enemy1 = createEntity(world);
  addComponent(world, enemy1, createTransform(150, 0, 0));
  addComponent(world, enemy1, createHealth(80));
  addComponent(world, enemy1, createFaction(Faction.Enemy));

  // Enemy out of range
  const enemy2 = createEntity(world);
  addComponent(world, enemy2, createTransform(300, 0, 0));
  addComponent(world, enemy2, createHealth(80));
  addComponent(world, enemy2, createFaction(Faction.Enemy));

  // Verify entities exist
  const projectiles = [...queryEntities(world, ['projectile'])];
  assert(projectiles.length === 1, 'Should have 1 projectile');
  assert(projectiles[0] === flak, 'Projectile should be flak');

  const enemies = [...queryEntities(world, ['health', 'faction'])].filter(
    (e) => {
      const faction = getComponent(world, e, 'faction');
      return faction.faction === Faction.Enemy;
    },
  );
  assert(enemies.length === 2, 'Should have 2 enemies');
});

// Test: Full nuke scenario setup
test('Full nuke explosion scenario entities created correctly', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Nuke missile
  const nuke = createEntity(world);
  addComponent(world, nuke, createTransform(500, 0, 0));
  const nukeMissile = createMissile(
    player,
    undefined,
    500,
    300,
    50,
    1500,
    new THREE.Vector3(1, 0, 0),
    150,
    true,
  );
  addComponent(world, nuke, nukeMissile);
  addComponent(world, nuke, createFaction(Faction.Player));
  addComponent(world, nuke, createCollision(1.0));

  // Enemies at various distances from nuke position (500, 0, 0)
  // Enemy 1: at (600, 0, 0) - 100 units away, inside 150 radius
  const enemy1 = createEntity(world);
  addComponent(world, enemy1, createTransform(600, 0, 0));
  addComponent(world, enemy1, createHealth(100));
  addComponent(world, enemy1, createFaction(Faction.Enemy));

  // Enemy 2: at (650, 0, 0) - 150 units away, at edge of radius
  const enemy2 = createEntity(world);
  addComponent(world, enemy2, createTransform(650, 0, 0));
  addComponent(world, enemy2, createHealth(100));
  addComponent(world, enemy2, createFaction(Faction.Enemy));

  // Enemy 3: at (700, 0, 0) - 200 units away, outside radius
  const enemy3 = createEntity(world);
  addComponent(world, enemy3, createTransform(700, 0, 0));
  addComponent(world, enemy3, createHealth(100));
  addComponent(world, enemy3, createFaction(Faction.Enemy));

  // Verify setup
  const missiles = [...queryEntities(world, ['missile'])];
  assert(missiles.length === 1, 'Should have 1 missile');

  const missile = getComponent(world, missiles[0], 'missile');
  assert(missile.isNuke === true, 'Missile should be a nuke');
  assert(missile.aoeRadius === 150, 'AoE radius should be 150');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
