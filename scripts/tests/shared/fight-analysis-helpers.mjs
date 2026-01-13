/**
 * Shared helpers for fight analysis tests.
 *
 * Contains functions for running detailed fights and analyzing engagement patterns.
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';

/**
 * Map AIState enum to state name string
 */
export function getStateName(state) {
  switch (state) {
    case AIState.Idle:
      return 'idle';
    case AIState.Pursue:
      return 'pursue';
    case AIState.Engage:
      return 'engage';
    case AIState.Evade:
      return 'evade';
    case AIState.Protect:
      return 'protect';
    case AIState.Regroup:
      return 'regroup';
    case AIState.Reposition:
      return 'reposition';
    default:
      return null;
  }
}

/**
 * Run a fight and collect detailed metrics for long-range archetype analysis.
 */
export function runDetailedFight(
  archetypeA,
  archetypeB,
  profileA,
  profileB,
  seed,
  maxTicks,
) {
  const world = createWorld(seed);
  initCombatStats(world);

  const shipA = createAIShip(
    world,
    archetypeA,
    Faction.Player,
    new Vector3(jitter(), jitter(), jitter()),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    profileA,
  );

  const shipB = createAIShip(
    world,
    archetypeB,
    Faction.Enemy,
    new Vector3(jitter(), jitter(), 800 + jitter()),
    new Quaternion(),
    profileB,
  );

  // Metrics
  const metrics = {
    winner: null,
    duration: 0,
    repositionCountA: 0,
    repositionCountB: 0,
    avgDistanceA: 0,
    avgDistanceB: 0,
    engageTimeA: 0,
    repositionTimeA: 0,
    distanceSamples: [],
  };

  let lastStateA = null;
  let distanceSum = 0;
  let distanceCount = 0;

  for (let tick = 0; tick < maxTicks; tick++) {
    runFrame(world);

    const aiA = getComponent(world, shipA, 'aiControlled');
    const aiB = getComponent(world, shipB, 'aiControlled');
    const transformA = getComponent(world, shipA, 'transform');
    const transformB = getComponent(world, shipB, 'transform');

    // Check for fight end
    if (!aiA || !aiB || !transformA || !transformB) {
      metrics.duration = (tick + 1) / TICK_RATE;
      if (!aiA && aiB) metrics.winner = 'B';
      else if (aiA && !aiB) metrics.winner = 'A';
      else metrics.winner = 'draw';
      break;
    }

    const distance = transformA.position.distanceTo(transformB.position);
    distanceSum += distance;
    distanceCount++;

    // Track state transitions for ship A
    if (aiA.state !== lastStateA) {
      if (aiA.state === AIState.Reposition) {
        metrics.repositionCountA++;
      }
      if (aiB.state === AIState.Reposition) {
        metrics.repositionCountB++;
      }
      lastStateA = aiA.state;
    }

    // Track time in states
    if (aiA.state === AIState.Engage) {
      metrics.engageTimeA += 1 / TICK_RATE;
    } else if (aiA.state === AIState.Reposition) {
      metrics.repositionTimeA += 1 / TICK_RATE;
    }

    // Sample distance periodically
    if (tick % 60 === 0) {
      metrics.distanceSamples.push(distance);
    }
  }

  if (!metrics.winner) {
    metrics.winner = 'timeout';
    metrics.duration = maxTicks / TICK_RATE;
  }

  metrics.avgDistanceA = distanceCount > 0 ? distanceSum / distanceCount : 0;

  return metrics;
}

/**
 * Run matchup and calculate aggregate stats.
 */
export function runMatchup(
  archetypeA,
  archetypeB,
  profileA = 'regular',
  profileB = 'regular',
  runsPerMatchup = 30,
  maxTicks = 5400,
) {
  const results = [];
  for (let i = 0; i < runsPerMatchup; i++) {
    results.push(
      runDetailedFight(
        archetypeA,
        archetypeB,
        profileA,
        profileB,
        i * 1000,
        maxTicks,
      ),
    );
  }

  const aWins = results.filter((r) => r.winner === 'A').length;
  const bWins = results.filter((r) => r.winner === 'B').length;
  const draws = results.filter(
    (r) => r.winner === 'draw' || r.winner === 'timeout',
  ).length;
  const avgDuration =
    results.reduce((s, r) => s + r.duration, 0) / runsPerMatchup;
  const avgReposA =
    results.reduce((s, r) => s + r.repositionCountA, 0) / runsPerMatchup;
  const avgDistance =
    results.reduce((s, r) => s + r.avgDistanceA, 0) / runsPerMatchup;
  const avgEngageTime =
    results.reduce((s, r) => s + r.engageTimeA, 0) / runsPerMatchup;
  const avgReposTime =
    results.reduce((s, r) => s + r.repositionTimeA, 0) / runsPerMatchup;

  return {
    aWins,
    bWins,
    draws,
    winRate: (aWins / runsPerMatchup) * 100,
    avgDuration,
    avgReposA,
    avgDistance,
    avgEngageTime,
    avgReposTime,
  };
}

/**
 * Analyze a single fight's engagement patterns.
 */
export function analyzeFight(archetype, seed, maxTicks) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Spawn with jitter to prevent perfect alignment
  const shipA = createAIShip(
    world,
    archetype,
    Faction.Player,
    new Vector3(jitter(), jitter(), jitter()),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  const shipB = createAIShip(
    world,
    archetype,
    Faction.Enemy,
    new Vector3(jitter(), jitter(), 500 + jitter()),
    new Quaternion(),
    'regular',
  );

  // Tracking data
  const stateTimeA = {
    idle: 0,
    pursue: 0,
    engage: 0,
    evade: 0,
    protect: 0,
    regroup: 0,
    reposition: 0,
  };
  const stateTimeB = {
    idle: 0,
    pursue: 0,
    engage: 0,
    evade: 0,
    protect: 0,
    regroup: 0,
    reposition: 0,
  };

  let breakOffsA = 0;
  let breakOffsB = 0;
  let lastStateA = null;
  let lastStateB = null;

  // Shield tracking for recovery analysis
  let maxShieldsA = 0;
  let maxShieldsB = 0;
  let regroupStartShieldsA = 0;
  let regroupEndShieldsA = 0;
  let regroupStartShieldsB = 0;
  let regroupEndShieldsB = 0;
  let inRegroupA = false;
  let inRegroupB = false;

  let ticksRun = 0;
  let aAlive = true;
  let bAlive = true;

  for (let tick = 0; tick < maxTicks; tick++) {
    runFrame(world);
    ticksRun++;

    const aiA = getComponent(world, shipA, 'aiControlled');
    const aiB = getComponent(world, shipB, 'aiControlled');
    const shieldsA = getComponent(world, shipA, 'shields');
    const shieldsB = getComponent(world, shipB, 'shields');

    if (!aiA || !aiB) {
      aAlive = !!aiA;
      bAlive = !!aiB;
      break;
    }

    // Track initial max shields
    if (tick === 0) {
      maxShieldsA = shieldsA?.max || 0;
      maxShieldsB = shieldsB?.max || 0;
    }

    // Track state time
    const stateNameA = getStateName(aiA.state);
    const stateNameB = getStateName(aiB.state);

    if (stateNameA) stateTimeA[stateNameA] += TICK_SEC;
    if (stateNameB) stateTimeB[stateNameB] += TICK_SEC;

    // Track break-offs (transition to evade or regroup from combat states)
    if (lastStateA !== null) {
      if (
        (stateNameA === 'evade' || stateNameA === 'regroup') &&
        (lastStateA === 'engage' || lastStateA === 'pursue')
      ) {
        breakOffsA++;
      }
    }
    if (lastStateB !== null) {
      if (
        (stateNameB === 'evade' || stateNameB === 'regroup') &&
        (lastStateB === 'engage' || lastStateB === 'pursue')
      ) {
        breakOffsB++;
      }
    }

    // Track shield recovery during regroup
    if (stateNameA === 'regroup' && !inRegroupA) {
      inRegroupA = true;
      regroupStartShieldsA = shieldsA?.current || 0;
    } else if (stateNameA !== 'regroup' && inRegroupA) {
      inRegroupA = false;
      regroupEndShieldsA = shieldsA?.current || 0;
    }

    if (stateNameB === 'regroup' && !inRegroupB) {
      inRegroupB = true;
      regroupStartShieldsB = shieldsB?.current || 0;
    } else if (stateNameB !== 'regroup' && inRegroupB) {
      inRegroupB = false;
      regroupEndShieldsB = shieldsB?.current || 0;
    }

    lastStateA = stateNameA;
    lastStateB = stateNameB;
  }

  const fightDuration = ticksRun / TICK_RATE;

  // Calculate shield recovery
  const shieldRecoveryA =
    maxShieldsA > 0
      ? ((regroupEndShieldsA - regroupStartShieldsA) / maxShieldsA) * 100
      : 0;
  const shieldRecoveryB =
    maxShieldsB > 0
      ? ((regroupEndShieldsB - regroupStartShieldsB) / maxShieldsB) * 100
      : 0;

  return {
    archetype,
    duration: fightDuration,
    stateTimeA,
    stateTimeB,
    breakOffsA,
    breakOffsB,
    shieldRecoveryA,
    shieldRecoveryB,
    maxShieldsA,
    maxShieldsB,
    aAlive,
    bAlive,
  };
}
