/**
 * Headless game test - validates core ECS and systems work.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import {
  createDecoy,
  DECOY_LIFETIME,
  DECOY_SEDUCE_CHANCE,
  DECOY_SEDUCE_RANGE,
  isDecoyExpired,
} from '../../../src/components/decoy.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createHeat } from '../../../src/components/heat.ts';
import {
  createMissile,
  createSecondaryWeaponFromDef,
  isMissileExpired,
} from '../../../src/components/missile.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createPlayerControlled } from '../../../src/components/player.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createTargeting } from '../../../src/components/targeting.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  createDecoyWeapon,
  createPrimaryWeapons,
  createSecondaryWeapons,
  findDecoyWeapon,
} from '../../../src/components/weapons.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  findEntity,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createCollision } from '../../../src/systems/collision.ts';

describe('Game', () => {
  it('World creation', () => {
    const world = createWorld();
    assert.strictEqual(world.entities.size, 0, 'World should start empty');
    assert.strictEqual(world.nextEntityId, 1, 'Next entity ID should be 1');
  });

  it('Entity creation', () => {
    const world = createWorld();
    const entity = createEntity(world);
    assert.strictEqual(entity, 1, 'First entity should be ID 1');
    assert.ok(world.entities.has(entity), 'World should contain entity');
  });

  it('Component addition and retrieval', () => {
    const world = createWorld();
    const entity = createEntity(world);
    const transform = createTransform(10, 20, 30);
    addComponent(world, entity, transform);

    const retrieved = getComponent(world, entity, 'transform');
    assert.ok(retrieved !== undefined, 'Should retrieve transform');
    assert.strictEqual(retrieved.position.x, 10, 'X should be 10');
    assert.strictEqual(retrieved.position.y, 20, 'Y should be 20');
    assert.strictEqual(retrieved.position.z, 30, 'Z should be 30');
  });

  it('Query entities', () => {
    const world = createWorld();
    const e1 = createEntity(world);
    const e2 = createEntity(world);

    addComponent(world, e1, createTransform(0, 0, 0));
    addComponent(world, e1, createHealth(100));
    addComponent(world, e2, createTransform(0, 0, 0));

    const withBoth = [...queryEntities(world, ['transform', 'health'])];
    assert.strictEqual(
      withBoth.length,
      1,
      'Should find 1 entity with both components',
    );
    assert.strictEqual(withBoth[0], e1, 'Should be entity 1');
  });

  it('Player ship has all required components', () => {
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
    assert.ok(
      getComponent(world, entity, 'transform'),
      'Should have transform',
    );
    assert.ok(getComponent(world, entity, 'physics'), 'Should have physics');
    assert.ok(getComponent(world, entity, 'health'), 'Should have health');
    assert.ok(getComponent(world, entity, 'shields'), 'Should have shields');
    assert.ok(getComponent(world, entity, 'faction'), 'Should have faction');
    assert.ok(
      getComponent(world, entity, 'playerControlled'),
      'Should have playerControlled',
    );
    assert.ok(
      getComponent(world, entity, 'targeting'),
      'Should have targeting',
    );
    assert.ok(getComponent(world, entity, 'heat'), 'Should have heat');
    assert.ok(
      getComponent(world, entity, 'primaryWeapons'),
      'Should have primaryWeapons',
    );
    assert.ok(
      getComponent(world, entity, 'collision'),
      'Should have collision',
    );
  });

  it('Find player entity', () => {
    const world = createWorld();
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createPlayerControlled());

    const found = findEntity(world, ['playerControlled', 'transform']);
    assert.strictEqual(found, player, 'Should find player entity');
  });

  it('Weapons component creates correctly', () => {
    const weapons = createPrimaryWeapons(['plasma']);
    assert.strictEqual(weapons.weapons.length, 1, 'Should have 1 weapon');
    assert.strictEqual(weapons.weapons[0].name, 'Plasma', 'Should be Plasma');
    assert.strictEqual(
      weapons.weapons[0].damage,
      16,
      'Plasma damage should be 16',
    );
    assert.strictEqual(
      weapons.weapons[0].heatPerShot,
      5,
      'Plasma heat should be 5',
    );
  });

  it('Shields component creates correctly', () => {
    const shields = createShields(60, 10, 3);
    assert.strictEqual(shields.current, 60, 'Current should equal max');
    assert.strictEqual(shields.max, 60, 'Max should be 60');
    assert.strictEqual(shields.regenRate, 10, 'Regen rate should be 10');
    assert.strictEqual(shields.regenDelay, 3, 'Regen delay should be 3');
  });

  it('Heat component creates correctly', () => {
    const heat = createHeat(100, 20);
    assert.strictEqual(heat.current, 0, 'Heat should start at 0');
    assert.strictEqual(heat.max, 100, 'Max heat should be 100');
    assert.strictEqual(heat.coolingRate, 20, 'Cooling rate should be 20');
  });

  it('Missile component creates correctly', () => {
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
    assert.strictEqual(missile.type, 'missile', 'Should be missile type');
    assert.strictEqual(missile.owner, 1, 'Owner should be 1');
    assert.strictEqual(missile.target, 2, 'Target should be 2');
    assert.strictEqual(missile.damage, 60, 'Damage should be 60');
    assert.strictEqual(
      missile.distanceTraveled,
      0,
      'Distance should start at 0',
    );
  });

  it('Missile expires when range exceeded', () => {
    const direction = new THREE.Vector3(0, 0, -1);
    const missile = createMissile(1, undefined, 60, 400, 90, 1000, direction);
    assert.ok(
      !isMissileExpired(missile),
      'Missile should not be expired initially',
    );
    missile.distanceTraveled = 1001;
    assert.ok(
      isMissileExpired(missile),
      'Missile should be expired after range exceeded',
    );
  });

  it('Missiles can be destroyed by damage', () => {
    const world = createWorld();
    const missile = createEntity(world);
    addComponent(world, missile, createTransform(0, 0, 0));
    addComponent(world, missile, createHealth(1)); // 1 HP = destroyed by any hit

    const health = getComponent(world, missile, 'health');
    assert.strictEqual(health.hull, 1, 'Missile should have 1 HP');

    // Simulate damage
    health.hull -= 1;
    assert.ok(health.hull <= 0, 'Missile should be destroyed after 1 damage');
  });

  it('Decoy component creates correctly', () => {
    const direction = new THREE.Vector3(0, -1, 0);
    const decoy = createDecoy(1, direction);
    assert.strictEqual(decoy.type, 'decoy', 'Should be decoy type');
    assert.strictEqual(decoy.owner, 1, 'Owner should be 1');
    assert.strictEqual(
      decoy.timeRemaining,
      DECOY_LIFETIME,
      'Should have full lifetime',
    );
    assert.ok(!isDecoyExpired(decoy), 'Should not be expired initially');
  });

  it('Decoy expires after lifetime', () => {
    const direction = new THREE.Vector3(0, -1, 0);
    const decoy = createDecoy(1, direction);
    decoy.timeRemaining = 0;
    assert.ok(isDecoyExpired(decoy), 'Should be expired when time runs out');
  });

  it('Decoy seduce range is configured', () => {
    assert.strictEqual(
      DECOY_SEDUCE_RANGE,
      200,
      'Seduce range should be 200 units',
    );
    assert.strictEqual(DECOY_SEDUCE_CHANCE, 0.5, 'Seduce chance should be 50%');
  });

  it('Decoy weapon creates correctly', () => {
    const decoyWeapon = createDecoyWeapon(4);
    assert.strictEqual(decoyWeapon.name, 'Decoy', 'Should be named Decoy');
    assert.strictEqual(decoyWeapon.count, 4, 'Should have 4 decoys');
    assert.strictEqual(decoyWeapon.isDecoy, true, 'Should be marked as decoy');
    assert.strictEqual(
      decoyWeapon.requiresLock,
      false,
      'Should not require lock',
    );
    assert.strictEqual(decoyWeapon.damage, 0, 'Should do no damage');
  });

  it('Find decoy weapon in secondary weapons', () => {
    const seekerWeapon = createSecondaryWeaponFromDef('seeker', 4);
    const decoyWeapon = createDecoyWeapon(2);
    const weapons = createSecondaryWeapons([seekerWeapon, decoyWeapon]);
    const found = findDecoyWeapon(weapons);
    assert.ok(found !== undefined, 'Should find decoy weapon');
    assert.strictEqual(found.weapon.name, 'Decoy', 'Should be Decoy');
    assert.strictEqual(found.weapon.count, 2, 'Should have 2 decoys');
  });

  it('Find decoy returns undefined when no decoys', () => {
    const seekerWeapon = createSecondaryWeaponFromDef('seeker', 4);
    const rocketWeapon = createSecondaryWeaponFromDef('rocket', 2);
    const weapons = createSecondaryWeapons([seekerWeapon, rocketWeapon]);
    const found = findDecoyWeapon(weapons);
    assert.strictEqual(
      found,
      undefined,
      'Should return undefined when no decoys',
    );
  });

  it('Missile resistedDecoys tracks resisted decoys', () => {
    const direction = new THREE.Vector3(0, 0, -1);
    const missile = createMissile(1, 2, 60, 400, 90, 2000, direction);

    // Decoy entity IDs (simulated)
    const decoy1 = 10;
    const decoy2 = 20;

    // Initially no decoys resisted
    assert.strictEqual(
      missile.resistedDecoys.size,
      0,
      'Should start with no resisted decoys',
    );
    assert.ok(
      !missile.resistedDecoys.has(decoy1),
      'Decoy 1 not resisted initially',
    );

    // Add a resisted decoy
    missile.resistedDecoys.add(decoy1);
    assert.ok(missile.resistedDecoys.has(decoy1), 'Decoy 1 should be tracked');
    assert.ok(!missile.resistedDecoys.has(decoy2), 'Decoy 2 not yet resisted');

    // Add another resisted decoy
    missile.resistedDecoys.add(decoy2);
    assert.strictEqual(
      missile.resistedDecoys.size,
      2,
      'Should have 2 resisted decoys',
    );
    assert.ok(missile.resistedDecoys.has(decoy1), 'Decoy 1 still tracked');
    assert.ok(missile.resistedDecoys.has(decoy2), 'Decoy 2 now tracked');
  });
});
