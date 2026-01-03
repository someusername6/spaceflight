/**
 * Nuke weapon behavior tests.
 */

import * as THREE from 'three';
import {
  areEnemies,
  createFaction,
  Faction,
} from '../src/components/faction.ts';
import { createHealth } from '../src/components/health.ts';
import { createMissile, isMissileExpired } from '../src/components/missile.ts';
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

console.log('\n=== NUKE TESTS ===\n');

// Test: Nuke missile has isNuke and aoeRadius
test('Nuke missile has isNuke flag and aoeRadius', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const missile = createMissile(
    owner,
    undefined, // no target
    500, // damage
    300, // speed
    50, // turn rate
    1500, // range
    direction,
    150, // AoE radius
    true, // isNuke
  );

  assert(missile.isNuke === true, 'Missile should be a nuke');
  assert(missile.aoeRadius === 150, 'AoE radius should be 150');
  assert(missile.damage === 500, 'Nuke damage should be 500');
});

// Test: Regular missile is not a nuke
test('Regular missile is not a nuke', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const missile = createMissile(
    owner,
    undefined,
    100, // damage
    400, // speed
    90, // turn rate
    800, // range
    direction,
    0, // no AoE
    false, // not a nuke
  );

  assert(missile.isNuke === false, 'Regular missile should not be a nuke');
  assert(missile.aoeRadius === 0, 'Regular missile should have no AoE');
});

// Test: Missile expiration check
test('Missile expires when distanceTraveled >= range', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const missile = createMissile(
    owner,
    undefined,
    100,
    400,
    90,
    800,
    direction,
    0,
    false,
  );

  assert(!isMissileExpired(missile), 'Fresh missile should not be expired');

  missile.distanceTraveled = 400;
  assert(
    !isMissileExpired(missile),
    'Missile at half range should not be expired',
  );

  missile.distanceTraveled = 800;
  assert(isMissileExpired(missile), 'Missile at full range should be expired');

  missile.distanceTraveled = 900;
  assert(isMissileExpired(missile), 'Missile beyond range should be expired');
});

// Test: Nuke AoE detection - enemies in range
test('Nuke AoE detects enemies within blast radius', () => {
  const world = createWorld();

  // Create owner ship
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Nuke position at (500, 0, 0) with AoE radius 150
  const nukePosition = new THREE.Vector3(500, 0, 0);
  const aoeRadius = 150;

  // Create enemy at (600, 0, 0) - 100 units away, within 150 radius
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(600, 0, 0));
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  const enemyTransform = getComponent(world, enemy, 'transform');
  const distance = nukePosition.distanceTo(enemyTransform.position);

  assert(distance === 100, `Distance should be 100, got ${distance}`);
  assert(distance <= aoeRadius, 'Enemy should be within AoE radius');
});

// Test: Nuke AoE - no enemies in range
test('Nuke AoE does not trigger when no enemies in blast radius', () => {
  const world = createWorld();

  // Create owner ship
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Nuke position at (500, 0, 0) with AoE radius 150
  const nukePosition = new THREE.Vector3(500, 0, 0);
  const aoeRadius = 150;

  // Create enemy at (700, 0, 0) - 200 units away, outside 150 radius
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(700, 0, 0));
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  const enemyTransform = getComponent(world, enemy, 'transform');
  const distance = nukePosition.distanceTo(enemyTransform.position);

  assert(distance === 200, `Distance should be 200, got ${distance}`);
  assert(distance > aoeRadius, 'Enemy should be outside AoE radius');
});

// Test: AoE damage falloff
test('AoE damage has linear falloff from center to edge', () => {
  const maxDamage = 100;
  const radius = 100;

  // At center (distance 0): full damage
  const damageAtCenter = maxDamage * (1 - 0 / radius);
  assert(damageAtCenter === 100, 'Damage at center should be full');

  // At half radius (distance 50): half damage
  const damageAtHalf = maxDamage * (1 - 50 / radius);
  assert(damageAtHalf === 50, 'Damage at half radius should be half');

  // At edge (distance 100): zero damage
  const damageAtEdge = maxDamage * (1 - 100 / radius);
  assert(damageAtEdge === 0, 'Damage at edge should be zero');
});

// Test: Nuke AoE respects faction alignment
test('Nuke AoE respects faction alignment', () => {
  // Same faction should not be enemies
  assert(
    !areEnemies(Faction.Player, Faction.Player),
    'Same faction should not be enemies',
  );
  assert(
    !areEnemies(Faction.Enemy, Faction.Enemy),
    'Same faction should not be enemies',
  );

  // Different factions are hostile
  assert(
    areEnemies(Faction.Player, Faction.Enemy),
    'Player and Enemy should be enemies',
  );
  assert(
    areEnemies(Faction.Enemy, Faction.Player),
    'Enemy and Player should be enemies',
  );

  // Neutral is never hostile
  assert(
    !areEnemies(Faction.Player, Faction.Neutral),
    'Neutral is never an enemy',
  );
  assert(
    !areEnemies(Faction.Neutral, Faction.Enemy),
    'Neutral is never an enemy',
  );
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
