/**
 * Unit tests for convoy-interceptor AI behavior.
 * Verifies wingmen correctly prioritize escorts, then approach convoy.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { createConvoyShipEntity } from '../../../src/factories/convoy-ship.ts';
import { createAIShip, createEnemyShip } from '../../../src/factories/ship.ts';
import { aiSystem } from '../../../src/systems/ai/ai.ts';
import {
  findNearestEnemyConvoyShip,
  findNearestEnemyEscort,
  getEnemyConvoyCentroid,
} from '../../../src/systems/ai/ai-utils.ts';
import { initCombatStats, TICK_SEC } from '../shared/combat-utils.mjs';

describe('convoy-interceptor behavior', () => {
  describe('utility functions', () => {
    it('findNearestEnemyEscort finds enemy fighters but not convoy ships', () => {
      const world = createWorld(12345);
      initCombatStats(world);

      // Create a wingman
      const wingman = createAIShip(
        world,
        'fighter',
        Faction.Player,
        new Vector3(0, 0, 0),
        new Quaternion(),
        'regular',
      );

      // Create enemy convoy ship
      createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(100, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      // Create enemy escort fighter
      const escort = createEnemyShip(
        world,
        'gnat',
        new Vector3(150, 0, 0),
        new Quaternion(),
        'rookie',
      );

      // Find nearest escort - should find the fighter, not convoy
      const result = findNearestEnemyEscort(world, wingman, Faction.Player);
      assert.strictEqual(result, escort, 'Should find enemy escort fighter');
    });

    it('findNearestEnemyConvoyShip finds enemy convoy ships', () => {
      const world = createWorld(12345);
      initCombatStats(world);

      // Create a wingman
      const wingman = createAIShip(
        world,
        'fighter',
        Faction.Player,
        new Vector3(0, 0, 0),
        new Quaternion(),
        'regular',
      );

      // Create enemy convoy ship
      const convoy = createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(100, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      // No enemy escort fighters

      // Find nearest convoy - should find it
      const result = findNearestEnemyConvoyShip(world, wingman, Faction.Player);
      assert.strictEqual(result, convoy, 'Should find enemy convoy ship');
    });

    it('getEnemyConvoyCentroid returns centroid of enemy convoy', () => {
      const world = createWorld(12345);
      initCombatStats(world);

      // Create two enemy convoy ships
      createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(100, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(200, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        1,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      const centroid = getEnemyConvoyCentroid(world, Faction.Player);
      assert.ok(centroid, 'Should return centroid');
      assert.strictEqual(centroid.x, 150, 'Centroid X should be average');
    });
  });

  describe('AI targeting', () => {
    it('wingman in convoy-interceptor mode targets escort first', () => {
      const world = createWorld(12345);
      initCombatStats(world);
      world.systemState.mission = {
        missionType: 'ambush',
        result: MissionResult.InProgress,
      };

      // Create a wingman with convoy-interceptor mode
      const wingman = createAIShip(
        world,
        'fighter',
        Faction.Player,
        new Vector3(0, 0, 0),
        new Quaternion(),
        'regular',
      );
      const ai = getComponent(world, wingman, 'aiControlled');
      ai.behaviorMode = 'convoy-interceptor';
      ai.state = AIState.Idle;
      ai.target = null;

      // Create enemy convoy ship (far)
      createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(500, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      // Create enemy escort fighter (closer)
      const escort = createEnemyShip(
        world,
        'gnat',
        new Vector3(200, 0, 0),
        new Quaternion(),
        'rookie',
      );

      // Run AI system once
      aiSystem(world, TICK_SEC);

      // Wingman should target escort, not convoy
      assert.strictEqual(ai.target, escort, 'Should target escort fighter');
      assert.strictEqual(ai.state, AIState.Pursue, 'Should be in Pursue state');
    });

    it('wingman in convoy-interceptor mode targets convoy when no escorts', () => {
      const world = createWorld(12345);
      initCombatStats(world);
      world.systemState.mission = {
        missionType: 'ambush',
        result: MissionResult.InProgress,
      };

      // Create a wingman with convoy-interceptor mode
      const wingman = createAIShip(
        world,
        'fighter',
        Faction.Player,
        new Vector3(0, 0, 0),
        new Quaternion(),
        'regular',
      );
      const ai = getComponent(world, wingman, 'aiControlled');
      ai.behaviorMode = 'convoy-interceptor';
      ai.state = AIState.Idle;
      ai.target = null;

      // Create enemy convoy ship only (no escorts)
      const convoy = createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(500, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      // Run AI system once
      aiSystem(world, TICK_SEC);

      // Wingman should target convoy
      assert.strictEqual(ai.target, convoy, 'Should target convoy ship');
      assert.strictEqual(ai.state, AIState.Pursue, 'Should be in Pursue state');
    });
  });

  describe('convoy approach behavior', () => {
    it('wingman in idle approaches convoy centroid when beyond approach distance', () => {
      const world = createWorld(12345);
      initCombatStats(world);
      world.systemState.mission = {
        missionType: 'ambush',
        result: MissionResult.InProgress,
      };

      // Create a wingman with convoy-interceptor mode, far from convoy
      const wingman = createAIShip(
        world,
        'fighter',
        Faction.Player,
        new Vector3(0, 0, 0), // Origin
        new Quaternion(),
        'regular',
      );
      const ai = getComponent(world, wingman, 'aiControlled');
      ai.behaviorMode = 'convoy-interceptor';
      // Force idle state with no target to simulate "patrol" toward convoy
      ai.state = AIState.Idle;
      ai.target = null;

      // Create convoy ship that's still moving (not stopped)
      createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(1000, 0, 0), // Far (beyond CONVOY_INTERCEPT_APPROACH_DISTANCE=300)
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );

      // Run AI system - should target convoy, transition to Pursue
      aiSystem(world, TICK_SEC);

      // Wingman should target the convoy ship and pursue it
      assert.ok(ai.target !== null, 'Should have a target');
      assert.strictEqual(ai.state, AIState.Pursue, 'Should be in Pursue state');
    });

    it('getEnemyConvoyCentroid returns null when all convoy stopped', () => {
      const world = createWorld(12345);
      initCombatStats(world);

      // Create a stopped convoy ship
      const convoy = createConvoyShipEntity(
        world,
        'freighter',
        new Vector3(500, 0, 0),
        new Vector3(0, 0, -1000),
        300,
        0,
        8,
        { faction: Faction.Enemy, stopDistance: 400 },
      );
      const convoyShip = getComponent(world, convoy, 'convoyShip');
      convoyShip.isStopped = true;

      // Should return null (no active convoy)
      const centroid = getEnemyConvoyCentroid(world, Faction.Player);
      assert.strictEqual(
        centroid,
        null,
        'Should return null for all-stopped convoy',
      );
    });
  });
});
