/**
 * Headless game test - validates core ECS and systems work.
 */

import { createWorld, createEntity, addComponent, getComponent, queryEntities, findEntity } from '../src/core/ecs.ts';
import { createTransform } from '../src/components/transform.ts';
import { createPhysics } from '../src/components/physics.ts';
import { createHealth } from '../src/components/health.ts';
import { createFaction } from '../src/components/faction.ts';
import { createPlayerControlled } from '../src/components/player.ts';
import { createHeat } from '../src/components/heat.ts';
import { createPrimaryWeapons } from '../src/components/weapons.ts';
import { createShields } from '../src/components/shields.ts';
import { createTargeting } from '../src/components/targeting.ts';
import { createCollision } from '../src/systems/collision.ts';
import { Faction } from '../src/core/types.ts';
import { Vector3 } from 'three';

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

// Test: World creation
test('World creation', () => {
  const world = createWorld();
  assert(world.entities.size === 0, 'World should start empty');
  assert(world.nextEntityId === 1, 'Next entity ID should be 1');
});

// Test: Entity creation
test('Entity creation', () => {
  const world = createWorld();
  const entity = createEntity(world);
  assert(entity === 1, 'First entity should be ID 1');
  assert(world.entities.has(entity), 'World should contain entity');
});

// Test: Component addition and retrieval
test('Component addition and retrieval', () => {
  const world = createWorld();
  const entity = createEntity(world);
  const transform = createTransform(10, 20, 30);
  addComponent(world, entity, transform);

  const retrieved = getComponent(world, entity, 'transform');
  assert(retrieved !== undefined, 'Should retrieve transform');
  assert(retrieved.position.x === 10, 'X should be 10');
  assert(retrieved.position.y === 20, 'Y should be 20');
  assert(retrieved.position.z === 30, 'Z should be 30');
});

// Test: Query entities
test('Query entities', () => {
  const world = createWorld();
  const e1 = createEntity(world);
  const e2 = createEntity(world);

  addComponent(world, e1, createTransform(0, 0, 0));
  addComponent(world, e1, createHealth(100));
  addComponent(world, e2, createTransform(0, 0, 0));

  const withBoth = [...queryEntities(world, ['transform', 'health'])];
  assert(withBoth.length === 1, 'Should find 1 entity with both components');
  assert(withBoth[0] === e1, 'Should be entity 1');
});

// Test: Player ship creation with all components
test('Player ship has all required components', () => {
  const world = createWorld();
  const entity = createEntity(world);

  // Add all components a player ship should have
  addComponent(world, entity, createTransform(0, 0, 0));
  addComponent(world, entity, createPhysics({ maxSpeed: 250, acceleration: 100, turnRate: 100, rollRate: 150 }));
  addComponent(world, entity, createHealth(80));
  addComponent(world, entity, createShields(60, 10, 3));
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled());
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(100, 20));
  addComponent(world, entity, createPrimaryWeapons(['plasma']));
  addComponent(world, entity, createCollision(5));

  // Verify all components exist
  assert(getComponent(world, entity, 'transform'), 'Should have transform');
  assert(getComponent(world, entity, 'physics'), 'Should have physics');
  assert(getComponent(world, entity, 'health'), 'Should have health');
  assert(getComponent(world, entity, 'shields'), 'Should have shields');
  assert(getComponent(world, entity, 'faction'), 'Should have faction');
  assert(getComponent(world, entity, 'playerControlled'), 'Should have playerControlled');
  assert(getComponent(world, entity, 'targeting'), 'Should have targeting');
  assert(getComponent(world, entity, 'heat'), 'Should have heat');
  assert(getComponent(world, entity, 'primaryWeapons'), 'Should have primaryWeapons');
  assert(getComponent(world, entity, 'collision'), 'Should have collision');
});

// Test: Find player entity
test('Find player entity', () => {
  const world = createWorld();
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createPlayerControlled());

  const found = findEntity(world, ['playerControlled', 'transform']);
  assert(found === player, 'Should find player entity');
});

// Test: Weapons component
test('Weapons component creates correctly', () => {
  const weapons = createPrimaryWeapons(['plasma']);
  assert(weapons.weapons.length === 1, 'Should have 1 weapon');
  assert(weapons.weapons[0].name === 'Plasma', 'Should be Plasma');
  assert(weapons.weapons[0].damage === 25, 'Plasma damage should be 25');
  assert(weapons.weapons[0].heatPerShot === 8, 'Plasma heat should be 8');
});

// Test: Shields component
test('Shields component creates correctly', () => {
  const shields = createShields(60, 10, 3);
  assert(shields.current === 60, 'Current should equal max');
  assert(shields.max === 60, 'Max should be 60');
  assert(shields.regenRate === 10, 'Regen rate should be 10');
  assert(shields.regenDelay === 3, 'Regen delay should be 3');
});

// Test: Heat component
test('Heat component creates correctly', () => {
  const heat = createHeat(100, 20);
  assert(heat.current === 0, 'Heat should start at 0');
  assert(heat.max === 100, 'Max heat should be 100');
  assert(heat.coolingRate === 20, 'Cooling rate should be 20');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
