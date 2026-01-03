/**
 * Headless game test - validates core ECS and systems work.
 */

import * as THREE from 'three';
import {
  createDecoy,
  DECOY_LIFETIME,
  DECOY_SEDUCE_CHANCE,
  DECOY_SEDUCE_RANGE,
  isDecoyExpired,
} from '../src/components/decoy.ts';
import { createFaction } from '../src/components/faction.ts';
import { createHealth } from '../src/components/health.ts';
import { createHeat } from '../src/components/heat.ts';
import {
  createMissile,
  createSecondaryWeaponFromDef,
  isMissileExpired,
} from '../src/components/missile.ts';
import { createPhysics } from '../src/components/physics.ts';
import { createPlayerControlled } from '../src/components/player.ts';
import { createShields } from '../src/components/shields.ts';
import { createTargeting } from '../src/components/targeting.ts';
import { createTransform } from '../src/components/transform.ts';
import {
  createDecoyWeapon,
  createPrimaryWeapons,
  createSecondaryWeapons,
  findDecoyWeapon,
} from '../src/components/weapons.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  findEntity,
  getComponent,
  queryEntities,
} from '../src/core/ecs.ts';
import { Faction } from '../src/core/types.ts';
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
  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: 250,
      acceleration: 100,
      turnRate: 100,
      rollRate: 150,
    }),
  );
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
  assert(
    getComponent(world, entity, 'playerControlled'),
    'Should have playerControlled',
  );
  assert(getComponent(world, entity, 'targeting'), 'Should have targeting');
  assert(getComponent(world, entity, 'heat'), 'Should have heat');
  assert(
    getComponent(world, entity, 'primaryWeapons'),
    'Should have primaryWeapons',
  );
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

// Test: Missile component
test('Missile component creates correctly', () => {
  const direction = new THREE.Vector3(0, 0, -1);
  const missile = createMissile(
    1, // owner
    2, // target
    60, // damage
    400, // speed
    90, // turnRate (degrees)
    2000, // range
    direction,
  );
  assert(missile.type === 'missile', 'Should be missile type');
  assert(missile.owner === 1, 'Owner should be 1');
  assert(missile.target === 2, 'Target should be 2');
  assert(missile.damage === 60, 'Damage should be 60');
  assert(missile.distanceTraveled === 0, 'Distance should start at 0');
});

// Test: Missile expiration
test('Missile expires when range exceeded', () => {
  const direction = new THREE.Vector3(0, 0, -1);
  const missile = createMissile(1, undefined, 60, 400, 90, 1000, direction);
  assert(!isMissileExpired(missile), 'Missile should not be expired initially');
  missile.distanceTraveled = 1001;
  assert(
    isMissileExpired(missile),
    'Missile should be expired after range exceeded',
  );
});

// Test: Missile has health for destructibility (missiles have 1 HP)
test('Missiles can be destroyed by damage', () => {
  const world = createWorld();
  const missile = createEntity(world);
  addComponent(world, missile, createTransform(0, 0, 0));
  addComponent(world, missile, createHealth(1)); // 1 HP = destroyed by any hit

  const health = getComponent(world, missile, 'health');
  assert(health.hull === 1, 'Missile should have 1 HP');

  // Simulate damage
  health.hull -= 1;
  assert(health.hull <= 0, 'Missile should be destroyed after 1 damage');
});

// Test: Decoy component
test('Decoy component creates correctly', () => {
  const direction = new THREE.Vector3(0, -1, 0);
  const decoy = createDecoy(1, direction);
  assert(decoy.type === 'decoy', 'Should be decoy type');
  assert(decoy.owner === 1, 'Owner should be 1');
  assert(decoy.timeRemaining === DECOY_LIFETIME, 'Should have full lifetime');
  assert(!isDecoyExpired(decoy), 'Should not be expired initially');
});

// Test: Decoy expiration
test('Decoy expires after lifetime', () => {
  const direction = new THREE.Vector3(0, -1, 0);
  const decoy = createDecoy(1, direction);
  decoy.timeRemaining = 0;
  assert(isDecoyExpired(decoy), 'Should be expired when time runs out');
});

// Test: Decoy seduce range constant
test('Decoy seduce range is configured', () => {
  assert(DECOY_SEDUCE_RANGE === 200, 'Seduce range should be 200 units');
  assert(DECOY_SEDUCE_CHANCE === 0.5, 'Seduce chance should be 50%');
});

// Test: Decoy weapon creation
test('Decoy weapon creates correctly', () => {
  const decoyWeapon = createDecoyWeapon(4);
  assert(decoyWeapon.name === 'Decoy', 'Should be named Decoy');
  assert(decoyWeapon.count === 4, 'Should have 4 decoys');
  assert(decoyWeapon.isDecoy === true, 'Should be marked as decoy');
  assert(decoyWeapon.requiresLock === false, 'Should not require lock');
  assert(decoyWeapon.damage === 0, 'Should do no damage');
});

// Test: Find decoy weapon in secondary weapons
test('Find decoy weapon in secondary weapons', () => {
  const seekerWeapon = createSecondaryWeaponFromDef('seeker', 4);
  const decoyWeapon = createDecoyWeapon(2);
  const weapons = createSecondaryWeapons([seekerWeapon, decoyWeapon]);
  const found = findDecoyWeapon(weapons);
  assert(found !== undefined, 'Should find decoy weapon');
  assert(found.weapon.name === 'Decoy', 'Should be Decoy');
  assert(found.weapon.count === 2, 'Should have 2 decoys');
});

// Test: No decoy weapon returns undefined
test('Find decoy returns undefined when no decoys', () => {
  const seekerWeapon = createSecondaryWeaponFromDef('seeker', 4);
  const rocketWeapon = createSecondaryWeaponFromDef('rocket', 2);
  const weapons = createSecondaryWeapons([seekerWeapon, rocketWeapon]);
  const found = findDecoyWeapon(weapons);
  assert(found === undefined, 'Should return undefined when no decoys');
});

// Test: Missile resistedDecoys prevents re-roll
test('Missile resistedDecoys tracks resisted decoys', () => {
  const direction = new THREE.Vector3(0, 0, -1);
  const missile = createMissile(1, 2, 60, 400, 90, 2000, direction);

  // Decoy entity IDs (simulated)
  const decoy1 = 10;
  const decoy2 = 20;

  // Initially no decoys resisted
  assert(
    missile.resistedDecoys.size === 0,
    'Should start with no resisted decoys',
  );
  assert(!missile.resistedDecoys.has(decoy1), 'Decoy 1 not resisted initially');

  // Add a resisted decoy
  missile.resistedDecoys.add(decoy1);
  assert(missile.resistedDecoys.has(decoy1), 'Decoy 1 should be tracked');
  assert(!missile.resistedDecoys.has(decoy2), 'Decoy 2 not yet resisted');

  // Add another resisted decoy
  missile.resistedDecoys.add(decoy2);
  assert(missile.resistedDecoys.size === 2, 'Should have 2 resisted decoys');
  assert(missile.resistedDecoys.has(decoy1), 'Decoy 1 still tracked');
  assert(missile.resistedDecoys.has(decoy2), 'Decoy 2 now tracked');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
