#!/usr/bin/env node
/**
 * Flak Stress Test - Measures performance with many shrapnel entities.
 */

import { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../../../src/components/ai.ts';
import { createAimError } from '../../../src/components/aim-error.ts';
import { createCollision } from '../../../src/components/collision.ts';
import { createCombatStats } from '../../../src/components/combat-stats.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createHeat } from '../../../src/components/heat.ts';
import {
  createPhysics,
  setInitialVelocity,
} from '../../../src/components/physics.ts';
import { createShieldHit } from '../../../src/components/shield-hit.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createShipIdentity } from '../../../src/components/ship-identity.ts';
import { createTargeting } from '../../../src/components/targeting.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { createPrimaryWeapons } from '../../../src/components/weapons.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { getProfileForPlaystyle } from '../../../src/data/ai-profiles.ts';
import { SHIP_CLASSES } from '../../../src/data/ships.ts';
import { initWeaponAmmoCounts } from '../../../src/systems/stats.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';

const SPAWN_DISTANCE = 800; // Close range for flak effectiveness
const SHIP_CLASS = 'fighter';
const SKILL_LEVEL = 'veteran';
const TEAM_SIZE = 8; // 8v8 for stress test

function createTestShip(
  world,
  weaponName,
  faction,
  position,
  rotation,
  callsign,
) {
  const shipClass = SHIP_CLASSES[SHIP_CLASS];
  const entity = createEntity(world);

  const transform = createTransform(position.x, position.y, position.z);
  transform.rotation.copy(rotation);
  addComponent(world, entity, transform);

  const physics = createPhysics({
    maxSpeed: shipClass.maxSpeed,
    acceleration: shipClass.acceleration,
    turnRate: shipClass.turnRate,
    rollRate: shipClass.rollRate,
    afterburnerHeatRate: shipClass.afterburnerHeatRate,
    initialSpeed: 50,
  });
  setInitialVelocity(physics, rotation, 50);
  addComponent(world, entity, physics);

  addComponent(world, entity, createHealth(shipClass.hull));
  addComponent(
    world,
    entity,
    createShields(shipClass.shields, shipClass.rechargeRate),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(
    world,
    entity,
    createHeat(shipClass.heatCapacity, shipClass.coolRate),
  );
  addComponent(world, entity, createCollision(shipClass.collisionRadius));
  addComponent(world, entity, createFaction(faction));

  const weapons = createPrimaryWeapons([
    { name: weaponName, size: 1 },
    { name: weaponName, size: 1 },
  ]);
  addComponent(world, entity, weapons);
  initWeaponAmmoCounts(world, entity);

  const profile = getProfileForPlaystyle('brawler', SKILL_LEVEL);
  addComponent(world, entity, createAIControlled(profile));
  addComponent(world, entity, createAimError(world.prng, profile));
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createShipIdentity('fighter', callsign));
  addComponent(world, entity, createCombatStats());

  return entity;
}

function runStressTest() {
  const world = createWorld(12345);
  initCombatStats(world);

  // Spawn teams
  const rotationA = new Quaternion();
  const rotationB = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );

  for (let i = 0; i < TEAM_SIZE; i++) {
    const x = (i - (TEAM_SIZE - 1) / 2) * 40;
    const y = (i % 2 === 0 ? 1 : -1) * 15;
    createTestShip(
      world,
      'flak',
      Faction.Player,
      new Vector3(x, y, -SPAWN_DISTANCE / 2),
      rotationA,
      `A${i + 1}`,
    );
    createTestShip(
      world,
      'flak',
      Faction.Enemy,
      new Vector3(x, y, SPAWN_DISTANCE / 2),
      rotationB,
      `B${i + 1}`,
    );
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('FLAK STRESS TEST - 8v8 All Flak Battle');
  console.log(`Spawn distance: ${SPAWN_DISTANCE}m | Shrapnel per shell: 25`);
  console.log(`${'='.repeat(70)}\n`);

  const frameTimes = [];
  const entityCounts = [];
  const projectileCounts = [];
  let maxEntities = 0;
  let maxProjectiles = 0;

  const MAX_TICKS = 30 * TICK_RATE; // 30 seconds

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const start = performance.now();

    world.systemState.gameTime += TICK_SEC;
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    const elapsed = performance.now() - start;
    frameTimes.push(elapsed);

    // Count entities
    const allEntities = [...queryEntities(world, ['transform'])];
    const projectiles = [...queryEntities(world, ['projectile'])];
    entityCounts.push(allEntities.length);
    projectileCounts.push(projectiles.length);

    if (allEntities.length > maxEntities) maxEntities = allEntities.length;
    if (projectiles.length > maxProjectiles)
      maxProjectiles = projectiles.length;

    // Check if battle ended
    let teamA = 0,
      teamB = 0;
    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Player) teamA++;
      else if (faction.faction === Faction.Enemy) teamB++;
    }
    if (teamA === 0 || teamB === 0) {
      console.log(
        `Battle ended at tick ${tick} (${(tick / TICK_RATE).toFixed(1)}s)`,
      );
      break;
    }

    // Progress report every 5 seconds
    if (tick > 0 && tick % (5 * TICK_RATE) === 0) {
      const sec = tick / TICK_RATE;
      const recentFrames = frameTimes.slice(-TICK_RATE);
      const avgMs =
        recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length;
      const maxMs = Math.max(...recentFrames);
      console.log(
        `${sec}s: Entities=${allEntities.length} Projectiles=${projectiles.length} AvgFrame=${avgMs.toFixed(2)}ms MaxFrame=${maxMs.toFixed(2)}ms Ships=${teamA}v${teamB}`,
      );
    }
  }

  // Calculate statistics
  const avgFrameTime =
    frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const maxFrameTime = Math.max(...frameTimes);
  const minFrameTime = Math.min(...frameTimes);
  const avgEntities =
    entityCounts.reduce((a, b) => a + b, 0) / entityCounts.length;
  const avgProjectiles =
    projectileCounts.reduce((a, b) => a + b, 0) / projectileCounts.length;

  // Sort for percentiles
  const sortedFrames = [...frameTimes].sort((a, b) => a - b);
  const p50 = sortedFrames[Math.floor(sortedFrames.length * 0.5)];
  const p95 = sortedFrames[Math.floor(sortedFrames.length * 0.95)];
  const p99 = sortedFrames[Math.floor(sortedFrames.length * 0.99)];

  console.log(`\n${'='.repeat(70)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(70)}`);
  console.log(`\nFrame Time (ms):`);
  console.log(`  Average: ${avgFrameTime.toFixed(2)}ms`);
  console.log(`  Min:     ${minFrameTime.toFixed(2)}ms`);
  console.log(`  Max:     ${maxFrameTime.toFixed(2)}ms`);
  console.log(`  P50:     ${p50.toFixed(2)}ms`);
  console.log(`  P95:     ${p95.toFixed(2)}ms`);
  console.log(`  P99:     ${p99.toFixed(2)}ms`);

  console.log(`\nEntity Counts:`);
  console.log(`  Avg Entities:    ${avgEntities.toFixed(0)}`);
  console.log(`  Max Entities:    ${maxEntities}`);
  console.log(`  Avg Projectiles: ${avgProjectiles.toFixed(0)}`);
  console.log(`  Max Projectiles: ${maxProjectiles}`);

  const targetFrameMs = 1000 / 60; // 16.67ms for 60fps
  const framesOver = frameTimes.filter((t) => t > targetFrameMs).length;
  const pctOver = ((framesOver / frameTimes.length) * 100).toFixed(1);
  console.log(`\nPerformance:`);
  console.log(`  Target frame time: ${targetFrameMs.toFixed(2)}ms (60fps)`);
  console.log(`  Frames over budget: ${framesOver} (${pctOver}%)`);
  console.log(`  Effective FPS: ${(1000 / avgFrameTime).toFixed(0)}`);
  console.log(`${'='.repeat(70)}\n`);
}

runStressTest();
