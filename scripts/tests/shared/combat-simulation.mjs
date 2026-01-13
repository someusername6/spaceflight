/**
 * Combat Simulation Utilities
 *
 * Provides reusable functions for running combat simulations.
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
import { getWeaponStats } from '../../../src/data/weapons.ts';
import { initWeaponAmmoCounts } from '../../../src/systems/stats.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';

/**
 * Create a test ship with specified weapon and faction.
 */
export function createTestShip(
  world,
  weaponName,
  faction,
  position,
  rotation,
  callsign,
  shipClass = 'fighter',
  skillLevel = 'regular',
) {
  const shipDef = SHIP_CLASSES[shipClass];
  if (!shipDef) throw new Error(`Unknown ship class: ${shipClass}`);

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

  // Weapons - 2 banks of the test weapon
  const weapons = createPrimaryWeapons([
    { name: weaponName, size: 1 },
    { name: weaponName, size: 1 },
  ]);
  addComponent(world, entity, weapons);

  // Initialize ammo counts
  initWeaponAmmoCounts(world, entity);

  // AI control
  const profile = getProfileForPlaystyle('brawler', skillLevel);
  addComponent(world, entity, createAIControlled(profile));
  addComponent(world, entity, createAimError(world.prng, profile));

  // Targeting and identity
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createShipIdentity(shipClass, callsign));
  addComponent(world, entity, createCombatStats());

  return entity;
}

/**
 * Run a single battle between two weapons.
 */
export function runBattle(weaponA, weaponB, seed, config = {}) {
  const {
    maxSimulationTime = 180,
    spawnDistance = 2000,
    shipClass = 'fighter',
    skillLevel = 'regular',
    teamSize = 4,
  } = config;

  const maxTicks = maxSimulationTime * TICK_RATE;
  const world = createWorld(seed);
  initCombatStats(world);

  // Spawn Team A (Player faction) - weapon A
  const rotationA = new Quaternion();
  for (let i = 0; i < teamSize; i++) {
    const x = (i - (teamSize - 1) / 2) * 30;
    const y = (i % 2 === 0 ? 1 : -1) * 10;
    const position = new Vector3(x, y, -spawnDistance / 2);
    createTestShip(
      world,
      weaponA,
      Faction.Player,
      position,
      rotationA,
      `A${i + 1}`,
      shipClass,
      skillLevel,
    );
  }

  // Spawn Team B (Enemy faction) - weapon B
  const rotationB = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  for (let i = 0; i < teamSize; i++) {
    const x = (i - (teamSize - 1) / 2) * 30;
    const y = (i % 2 === 0 ? 1 : -1) * 10;
    const position = new Vector3(x, y, spawnDistance / 2);
    createTestShip(
      world,
      weaponB,
      Faction.Enemy,
      position,
      rotationB,
      `B${i + 1}`,
      shipClass,
      skillLevel,
    );
  }

  const result = {
    winner: null,
    time: 0,
    teamARemaining: teamSize,
    teamBRemaining: teamSize,
    stats: null,
  };

  // Run simulation
  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    // Count survivors
    let teamA = 0,
      teamB = 0;
    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Player) teamA++;
      else if (faction.faction === Faction.Enemy) teamB++;
    }

    result.teamARemaining = teamA;
    result.teamBRemaining = teamB;

    if (teamA === 0) {
      result.winner = 'B';
      result.time = (tick + 1) / TICK_RATE;
      break;
    }
    if (teamB === 0) {
      result.winner = 'A';
      result.time = (tick + 1) / TICK_RATE;
      break;
    }
  }

  // Timeout - whoever has more ships wins
  if (!result.winner) {
    result.time = maxSimulationTime;
    if (result.teamARemaining > result.teamBRemaining) result.winner = 'A';
    else if (result.teamBRemaining > result.teamARemaining) result.winner = 'B';
    else result.winner = 'draw';
  }

  result.stats = world.systemState.combatStats;

  return result;
}

/**
 * Run multiple battles and aggregate results.
 */
export function runWeaponComparison(weaponA, weaponB, runs, config = {}) {
  const statsA = getWeaponStats(weaponA);
  const statsB = getWeaponStats(weaponB);
  const nameA = statsA?.name || weaponA;
  const nameB = statsB?.name || weaponB;

  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919;
    results.push(runBattle(weaponA, weaponB, seed, config));
  }

  const winsA = results.filter((r) => r.winner === 'A').length;
  const winsB = results.filter((r) => r.winner === 'B').length;
  const draws = results.filter((r) => r.winner === 'draw').length;

  const avgTime = results.reduce((s, r) => s + r.time, 0) / runs;
  const avgSurvivorsA =
    results.reduce((s, r) => s + r.teamARemaining, 0) / runs;
  const avgSurvivorsB =
    results.reduce((s, r) => s + r.teamBRemaining, 0) / runs;

  // Aggregate damage stats
  let damageA = 0,
    damageB = 0;
  let shotsA = 0,
    shotsB = 0;
  let hitsA = 0,
    hitsB = 0;
  let shrapnelHitsA = 0,
    shrapnelHitsB = 0;

  for (const r of results) {
    if (r.stats) {
      damageA += r.stats.damageDealt[nameA] || 0;
      damageB += r.stats.damageDealt[nameB] || 0;
      shotsA += r.stats.shotsFired[nameA] || 0;
      shotsB += r.stats.shotsFired[nameB] || 0;
      hitsA += r.stats.shotsHit?.[nameA] || 0;
      hitsB += r.stats.shotsHit?.[nameB] || 0;
      shrapnelHitsA += r.stats.shrapnelHit?.[nameA] || 0;
      shrapnelHitsB += r.stats.shrapnelHit?.[nameB] || 0;
    }
  }

  // Detect shrapnel-based weapons
  const shrapnelCountA = statsA?.shrapnelCount ?? 0;
  const shrapnelCountB = statsB?.shrapnelCount ?? 0;
  const hasShrapnelA = shrapnelCountA > 0;
  const hasShrapnelB = shrapnelCountB > 0;

  // Shrapnel accuracy
  const shrapnelRateA =
    hasShrapnelA && shotsA > 0
      ? ((shrapnelHitsA / (shotsA * shrapnelCountA)) * 100).toFixed(1)
      : null;
  const shrapnelRateB =
    hasShrapnelB && shotsB > 0
      ? ((shrapnelHitsB / (shotsB * shrapnelCountB)) * 100).toFixed(1)
      : null;

  // For shrapnel weapons, use shrapnel hits as the hit count
  if (hasShrapnelA) hitsA = shrapnelHitsA;
  if (hasShrapnelB) hitsB = shrapnelHitsB;

  // Calculate ammo usage
  const ammoPerBankA = statsA?.ammo;
  const ammoPerBankB = statsB?.ammo;
  const teamSize = config.teamSize || 4;
  const capacityA = ammoPerBankA ? teamSize * 2 * ammoPerBankA * runs : 0;
  const capacityB = ammoPerBankB ? teamSize * 2 * ammoPerBankB * runs : 0;

  const ammoUsedA =
    capacityA > 0 ? ((shotsA / capacityA) * 100).toFixed(0) : 'inf';
  const ammoUsedB =
    capacityB > 0 ? ((shotsB / capacityB) * 100).toFixed(0) : 'inf';

  // Calculate hit rates
  const hitRateA = hasShrapnelA
    ? shrapnelRateA
    : shotsA > 0
      ? ((hitsA / shotsA) * 100).toFixed(0)
      : '0';
  const hitRateB = hasShrapnelB
    ? shrapnelRateB
    : shotsB > 0
      ? ((hitsB / shotsB) * 100).toFixed(0)
      : '0';

  return {
    weaponA,
    weaponB,
    runs,
    winsA,
    winsB,
    draws,
    winRateA: (winsA / runs) * 100,
    winRateB: (winsB / runs) * 100,
    avgTime,
    avgSurvivorsA,
    avgSurvivorsB,
    totalDamageA: damageA,
    totalDamageB: damageB,
    totalShotsA: shotsA,
    totalShotsB: shotsB,
    totalHitsA: hitsA,
    totalHitsB: hitsB,
    hitRateA,
    hitRateB,
    hasShrapnelA,
    hasShrapnelB,
    dpsA: damageA / (avgTime * runs),
    dpsB: damageB / (avgTime * runs),
    ammoUsedA,
    ammoUsedB,
    shrapnelRateA,
    shrapnelRateB,
  };
}
