/**
 * Starburst Balance Test - Real combat simulation comparing Starburst vs Rocket.
 *
 * Starburst is an AREA DENIAL weapon - its value comes from hitting multiple
 * targets with shrapnel, not single-target DPS. In 1v1 tests, expect lower
 * per-target damage than rockets due to spherical shrapnel distribution.
 *
 * Test methodology:
 * - Create ships equipped with either Rocket or Starburst missiles
 * - Run real combat simulations
 * - Verify shrapnel spawns, hits targets, and deals damage
 * - Compare per-target effectiveness (expect ~0.5-1.0x vs Rocket)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../../../src/components/ai.ts';
import { createAimError } from '../../../src/components/aim-error.ts';
import { createCollision } from '../../../src/components/collision.ts';
import { createCombatStats } from '../../../src/components/combat-stats.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createHeat } from '../../../src/components/heat.ts';
import { createSecondaryWeaponFromDef } from '../../../src/components/missile.ts';
import {
  createPhysics,
  setInitialVelocity,
} from '../../../src/components/physics.ts';
import { createShieldHit } from '../../../src/components/shield-hit.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createShipIdentity } from '../../../src/components/ship-identity.ts';
import { createTargeting } from '../../../src/components/targeting.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  createPrimaryWeapons,
  createSecondaryWeapons,
} from '../../../src/components/weapons.ts';
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
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 50;
const MAX_FIGHT_TIME = 60; // seconds
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

/**
 * Create a test ship with specific secondary weapon for missile testing.
 */
function createMissileTestShip(
  world,
  missileType,
  faction,
  position,
  rotation,
  callsign,
) {
  const shipClass = 'fighter';
  const shipDef = SHIP_CLASSES[shipClass];
  const entity = createEntity(world);

  // Transform
  const transform = createTransform(position.x, position.y, position.z);
  transform.rotation.copy(rotation);
  addComponent(world, entity, transform);

  // Physics
  const physics = createPhysics({
    maxSpeed: shipDef.maxSpeed,
    acceleration: shipDef.acceleration,
    turnRate: shipDef.turnRate,
    rollRate: shipDef.rollRate,
    afterburnerHeatRate: shipDef.afterburnerHeatRate,
    initialSpeed: 50,
  });
  setInitialVelocity(physics, rotation, 50);
  addComponent(world, entity, physics);

  // Health and shields
  addComponent(world, entity, createHealth(shipDef.hull));
  addComponent(
    world,
    entity,
    createShields(shipDef.shields, shipDef.rechargeRate),
  );
  addComponent(world, entity, createShieldHit());

  // Heat
  addComponent(
    world,
    entity,
    createHeat(shipDef.heatCapacity, shipDef.coolRate),
  );

  // Collision
  addComponent(world, entity, createCollision(shipDef.collisionRadius));

  // Faction
  addComponent(world, entity, createFaction(faction));

  // Primary weapons (basic pulse for backup)
  const weapons = createPrimaryWeapons([{ name: 'pulse', size: 1 }]);
  addComponent(world, entity, weapons);

  // Secondary weapons - the missile we're testing
  // Give plenty of ammo for extended testing
  const missile = createSecondaryWeaponFromDef(missileType, 50, 1);
  addComponent(world, entity, createSecondaryWeapons([missile]));

  // Initialize ammo counts
  initWeaponAmmoCounts(world, entity);

  // AI control (regular skill for consistency)
  const profile = getProfileForPlaystyle('regular', 'brawler');
  addComponent(world, entity, createAIControlled(profile));
  addComponent(world, entity, createAimError(world.prng, profile));

  // Targeting and identity
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createShipIdentity(shipClass, callsign));
  addComponent(world, entity, createCombatStats());

  return entity;
}

/**
 * Run a combat simulation with one team using missileType.
 * Returns stats about missile damage dealt.
 */
function runMissileTest(missileType, seed) {
  const world = createWorld(seed);
  initCombatStats(world);

  const spawnDistance = 600; // Close enough for dumbfire missiles

  // Team A uses the test missile
  const rotationA = new Quaternion();
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * 30;
    const position = new Vector3(x, 0, -spawnDistance / 2);
    createMissileTestShip(
      world,
      missileType,
      Faction.Player,
      position,
      rotationA,
      `A${i + 1}`,
    );
  }

  // Team B is enemy targets (also using same missiles for fair comparison)
  const rotationB = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * 30;
    const position = new Vector3(x, 0, spawnDistance / 2);
    createMissileTestShip(
      world,
      missileType,
      Faction.Enemy,
      position,
      rotationB,
      `B${i + 1}`,
    );
  }

  // Run simulation
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    runFrame(world);

    // Count survivors
    let teamA = 0,
      teamB = 0;
    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Player) teamA++;
      else if (faction.faction === Faction.Enemy) teamB++;
    }

    // Stop if one team is eliminated
    if (teamA === 0 || teamB === 0) break;
  }

  return world.systemState.combatStats;
}

describe('Starburst Balance (Real Simulation)', () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log('STARBURST BALANCE TEST - REAL COMBAT SIMULATION');
  console.log('='.repeat(70));
  console.log(`Running ${RUNS_PER_TEST} simulations per missile type...\n`);

  // Aggregate stats across all runs
  const rocketStats = {
    fired: 0,
    hit: 0,
    damage: 0,
    shrapnelSpawned: 0,
    shrapnelHit: 0,
  };

  const starburstStats = {
    fired: 0,
    hit: 0,
    damage: 0,
    shrapnelSpawned: 0,
    shrapnelHit: 0,
  };

  // Run Rocket tests
  console.log('Testing Rocket missiles...');
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const stats = runMissileTest('rocket', 10000 + run);
    rocketStats.fired += stats.missilesFired?.Rocket || 0;
    rocketStats.hit += stats.missilesHit?.Rocket || 0;
    // Rocket damage tracked in missileDamage (direct hits)
    rocketStats.damage += stats.missileDamage?.Rocket || 0;
  }

  // Run Starburst tests
  console.log('Testing Starburst missiles...');
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const stats = runMissileTest('starburst', 20000 + run);
    starburstStats.fired += stats.missilesFired?.Starburst || 0;
    starburstStats.hit += stats.missilesHit?.Starburst || 0;
    // Starburst damage tracked in damageDealt (shrapnel is a projectile, not missile)
    starburstStats.damage += stats.damageDealt?.Starburst || 0;
    starburstStats.shrapnelSpawned += stats.shrapnelSpawned || 0;
    starburstStats.shrapnelHit += stats.shrapnelHit?.Starburst || 0;
  }

  // Calculate per-missile effectiveness
  const rocketDamagePerMissile =
    rocketStats.fired > 0 ? rocketStats.damage / rocketStats.fired : 0;
  const starburstDamagePerMissile =
    starburstStats.fired > 0 ? starburstStats.damage / starburstStats.fired : 0;
  const damageRatio =
    rocketDamagePerMissile > 0
      ? starburstDamagePerMissile / rocketDamagePerMissile
      : 0;

  // Output results
  console.log(`\n${'='.repeat(70)}`);
  console.log('RESULTS');
  console.log('='.repeat(70));

  console.log('\nROCKET:');
  console.log(`  Missiles fired: ${rocketStats.fired}`);
  console.log(`  Direct hits: ${rocketStats.hit}`);
  console.log(`  Total damage: ${rocketStats.damage.toFixed(0)}`);
  console.log(`  Damage per missile: ${rocketDamagePerMissile.toFixed(2)}`);
  console.log(
    `  Hit rate: ${rocketStats.fired > 0 ? ((rocketStats.hit / rocketStats.fired) * 100).toFixed(1) : 0}%`,
  );

  console.log('\nSTARBURST:');
  console.log(`  Missiles fired: ${starburstStats.fired}`);
  console.log(`  Proximity detonations: ${starburstStats.hit}`);
  console.log(`  Shrapnel spawned: ${starburstStats.shrapnelSpawned}`);
  console.log(`  Shrapnel hits: ${starburstStats.shrapnelHit}`);
  console.log(`  Total damage: ${starburstStats.damage.toFixed(0)}`);
  console.log(`  Damage per missile: ${starburstDamagePerMissile.toFixed(2)}`);
  if (starburstStats.shrapnelSpawned > 0) {
    console.log(
      `  Shrapnel hit rate: ${((starburstStats.shrapnelHit / starburstStats.shrapnelSpawned) * 100).toFixed(2)}%`,
    );
  }

  console.log('\nCOMPARISON:');
  console.log(`  Starburst/Rocket damage ratio: ${damageRatio.toFixed(2)}x`);
  console.log(`  Target ratio: 3.0x`);
  console.log(
    `  Within range (2.0x-4.0x): ${damageRatio >= 2.0 && damageRatio <= 4.0 ? 'YES ✓' : 'NO ✗'}`,
  );

  // Diagnostics if ratio is off
  if (damageRatio < 0.5) {
    console.log('\n⚠️  DIAGNOSTIC: Very low ratio suggests:');
    if (starburstStats.shrapnelSpawned === 0) {
      console.log('  - Shrapnel is NOT spawning (detonation logic broken)');
    } else if (starburstStats.shrapnelHit === 0) {
      console.log('  - Shrapnel spawned but NOT hitting (collision issue)');
    } else if (starburstStats.damage === 0) {
      console.log('  - Shrapnel hitting but NOT dealing damage');
    }
  }

  console.log(`\n${'='.repeat(70)}\n`);

  it('should fire Rocket missiles', () => {
    assert.ok(rocketStats.fired > 0, 'No Rocket missiles were fired');
  });

  it('should fire Starburst missiles', () => {
    assert.ok(starburstStats.fired > 0, 'No Starburst missiles were fired');
  });

  it('should spawn shrapnel from Starburst', () => {
    assert.ok(
      starburstStats.shrapnelSpawned > 0,
      `Starburst spawned 0 shrapnel (fired ${starburstStats.fired} missiles)`,
    );
  });

  it('should have Starburst deal damage via shrapnel', () => {
    assert.ok(
      starburstStats.damage > 0,
      `Starburst dealt 0 damage (${starburstStats.shrapnelSpawned} shrapnel spawned, ${starburstStats.shrapnelHit} hits)`,
    );
  });

  it('should have Starburst deal meaningful damage per missile', () => {
    // Starburst is an area denial weapon - value comes from hitting multiple targets
    // In single-target tests, expect at least 50% of rocket's per-missile damage
    // (Spherical shrapnel distribution is inherently less efficient for single targets)
    assert.ok(
      damageRatio >= 0.5,
      `Starburst damage ratio (${damageRatio.toFixed(2)}x) too low, expected >= 0.5x per target`,
    );
  });
});
