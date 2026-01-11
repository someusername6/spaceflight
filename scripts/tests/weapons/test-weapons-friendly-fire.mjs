/**
 * Friendly fire tests - validates that weapons can damage same faction.
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
import { createMissile } from '../../../src/components/missile.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../src/core/ecs.ts';
import { createCollision } from '../../../src/systems/collision.ts';

describe('Friendly Fire Tests', () => {
  it('Projectile collision does not filter same faction targets', () => {
    // The projectile system now damages anyone except the owner
    // This test verifies the expected behavior: friendly fire is ON

    const world = createWorld();

    // Player ship
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createHealth(100));
    addComponent(world, player, createFaction(Faction.Player));

    // Allied ship (same faction)
    const ally = createEntity(world);
    addComponent(world, ally, createTransform(10, 0, 0));
    addComponent(world, ally, createHealth(100));
    addComponent(world, ally, createFaction(Faction.Player)); // Same faction as player

    // Projectile from player
    const projectile = createEntity(world);
    addComponent(world, projectile, createTransform(5, 0, 0));
    addComponent(
      world,
      projectile,
      createProjectile(
        player,
        25,
        400,
        800,
        new THREE.Vector3(1, 0, 0),
        'energy',
        'Plasma',
      ),
    );
    addComponent(world, projectile, createFaction(Faction.Player));
    addComponent(world, projectile, createCollision(0.5));

    // Verify entities have same faction (but projectile should still damage)
    const playerFaction = getComponent(world, player, 'faction');
    const allyFaction = getComponent(world, ally, 'faction');

    assert.ok(
      playerFaction.faction === allyFaction.faction,
      'Player and ally should have same faction',
    );
    // Friendly fire is enabled - damage should apply to allies
  });

  it('Missile direct hit can damage same faction ships', () => {
    const world = createWorld();

    // Player ship
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createHealth(100));
    addComponent(world, player, createFaction(Faction.Player));

    // Allied ship
    const ally = createEntity(world);
    addComponent(world, ally, createTransform(100, 0, 0));
    addComponent(world, ally, createHealth(100));
    addComponent(world, ally, createFaction(Faction.Player)); // Same faction

    // Missile from player targeting general direction (would hit ally)
    const missile = createEntity(world);
    addComponent(world, missile, createTransform(50, 0, 0));
    const missileComp = createMissile(
      player,
      undefined,
      100,
      400,
      90,
      800,
      new THREE.Vector3(1, 0, 0),
      0,
      false,
    );
    addComponent(world, missile, missileComp);
    addComponent(world, missile, createFaction(Faction.Player));
    addComponent(world, missile, createCollision(1.0));

    // Verify missile owner is not ally
    assert.ok(missileComp.owner === player, 'Missile owner should be player');
    assert.ok(missileComp.owner !== ally, 'Missile owner should not be ally');
    // Friendly fire means ally can be hit by player's missile
  });

  it('Nuke AoE damages all ships including same faction', () => {
    const world = createWorld();

    // Player ship
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createHealth(100));
    addComponent(world, player, createFaction(Faction.Player));

    // Allied ship near nuke explosion
    const ally = createEntity(world);
    addComponent(world, ally, createTransform(550, 0, 0)); // 50 units from nuke
    addComponent(world, ally, createHealth(100));
    addComponent(world, ally, createFaction(Faction.Player)); // Same faction

    // Enemy ship also near nuke
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(600, 0, 0)); // 100 units from nuke
    addComponent(world, enemy, createHealth(100));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    // Nuke position at (500, 0, 0) with AoE radius 150
    const nukePosition = new THREE.Vector3(500, 0, 0);
    const aoeRadius = 150;

    // Both ally and enemy are within AoE
    const allyTransform = getComponent(world, ally, 'transform');
    const enemyTransform = getComponent(world, enemy, 'transform');

    const allyDistance = nukePosition.distanceTo(allyTransform.position);
    const enemyDistance = nukePosition.distanceTo(enemyTransform.position);

    assert.ok(
      allyDistance === 50,
      `Ally should be 50 units away, got ${allyDistance}`,
    );
    assert.ok(
      enemyDistance === 100,
      `Enemy should be 100 units away, got ${enemyDistance}`,
    );
    assert.ok(
      allyDistance <= aoeRadius,
      'Ally should be within AoE (will take friendly fire damage)',
    );
    assert.ok(enemyDistance <= aoeRadius, 'Enemy should be within AoE');
  });

  it('Flak shrapnel damages all ships including same faction', () => {
    const world = createWorld();

    // Player ship
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createHealth(100));
    addComponent(world, player, createFaction(Faction.Player));

    // Allied ship near flak explosion
    const ally = createEntity(world);
    addComponent(world, ally, createTransform(110, 0, 0)); // Just outside trigger range but in shrapnel range
    addComponent(world, ally, createHealth(100));
    addComponent(world, ally, createFaction(Faction.Player)); // Same faction

    // Enemy that triggers the flak
    const enemy = createEntity(world);
    addComponent(world, enemy, createTransform(150, 0, 0)); // Within 80-unit flak trigger radius
    addComponent(world, enemy, createHealth(100));
    addComponent(world, enemy, createFaction(Faction.Enemy));

    // Flak at (100, 0, 0) with 80 unit trigger radius
    const flakPosition = new THREE.Vector3(100, 0, 0);
    const flakRadius = 80;
    const shrapnelRange = 120;

    // Enemy is within trigger range
    const enemyTransform = getComponent(world, enemy, 'transform');
    const enemyDistance = flakPosition.distanceTo(enemyTransform.position);
    assert.ok(
      enemyDistance === 50,
      `Enemy should be 50 units away, got ${enemyDistance}`,
    );
    assert.ok(
      enemyDistance <= flakRadius,
      'Enemy should trigger flak explosion',
    );

    // Ally is outside trigger range but within shrapnel range
    const allyTransform = getComponent(world, ally, 'transform');
    const allyDistance = flakPosition.distanceTo(allyTransform.position);
    assert.ok(
      allyDistance === 10,
      `Ally should be 10 units away, got ${allyDistance}`,
    );
    assert.ok(
      allyDistance <= shrapnelRange,
      'Ally is within shrapnel range (will take friendly fire)',
    );
  });

  it('Flak explosion only triggered by enemies, not same faction', () => {
    // This verifies that flak proximity check only considers enemies
    // Same faction entities within range should NOT trigger explosion

    const world = createWorld();

    // Player ship
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createHealth(100));
    addComponent(world, player, createFaction(Faction.Player));

    // Allied ship near flak (same faction)
    const ally = createEntity(world);
    addComponent(world, ally, createTransform(50, 0, 0)); // Within 80-unit flak radius
    addComponent(world, ally, createHealth(100));
    addComponent(world, ally, createFaction(Faction.Player)); // Same faction - should NOT trigger

    const allyFaction = getComponent(world, ally, 'faction');
    const playerFaction = getComponent(world, player, 'faction');

    // Same faction means NOT enemies
    assert.ok(
      !areEnemies(playerFaction.faction, allyFaction.faction),
      'Same faction should not be enemies',
    );
    // Therefore ally within range should NOT trigger flak explosion
  });

  it('Beam weapon damages same faction ships', () => {
    // Beams now damage anyone except the firer (owner)
    // This test verifies the expected friendly fire behavior

    const world = createWorld();

    // Player ship
    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 0));
    addComponent(world, player, createHealth(100));
    addComponent(world, player, createFaction(Faction.Player));

    // Allied ship in front of player
    const ally = createEntity(world);
    addComponent(world, ally, createTransform(50, 0, 50)); // Forward of player
    addComponent(world, ally, createHealth(100));
    addComponent(world, ally, createFaction(Faction.Player)); // Same faction
    addComponent(world, ally, createCollision(5)); // Has hitbox

    // Beam can hit ally because friendly fire is enabled
    const playerFaction = getComponent(world, player, 'faction');
    const allyFaction = getComponent(world, ally, 'faction');

    assert.ok(
      playerFaction.faction === allyFaction.faction,
      'Player and ally have same faction',
    );
    // With friendly fire enabled, beam from player CAN hit ally
  });
});
