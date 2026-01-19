/**
 * Ambush Mission Unit Test
 *
 * Tests the core ambush mission logic:
 * - Setup spawns convoy and escorts
 * - Victory conditions (all convoy destroyed/stopped)
 * - Defeat conditions (convoy escapes, player dies)
 * - Convoy stop behavior
 * - Reward calculation
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { setupAmbushMission } from '../../../src/campaign/mission/ambush-launcher.ts';
import { isDead } from '../../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  checkConvoyStop,
  getAmbushRewardMultiplier,
  processAmbushMissionTick,
} from '../../../src/systems/ambush-mission.ts';
import { initCombatStats } from '../shared/combat-utils.mjs';

// Test mission data
const TEST_AMBUSH_MISSION = {
  id: 'test-ambush',
  name: 'Test Ambush',
  description: 'Test ambush mission',
  difficulty: 'easy',
  sector: 1,
  missionType: 'ambush',
  ambushData: {
    convoySize: 2,
    convoyType: 'freighter',
    convoyStartDistance: 500,
    escapeZoneDistance: 2000,
    escapeZoneRadius: 200,
    convoyStopDistance: 300,
    escorts: [
      { archetype: 'gnat', skill: 'rookie', count: 1, role: 'defensive' },
    ],
  },
  reward: 5000,
};

/** Count entities by type for tests */
function countEntities(world) {
  let playerTeam = 0;
  let enemyConvoy = 0;
  let enemyConvoyDead = 0;
  let enemyConvoyStopped = 0;
  let enemyEscorts = 0;

  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    const convoyShip = getComponent(world, entity, 'convoyShip');
    const shipIdentity = getComponent(world, entity, 'shipIdentity');

    if (!shipIdentity) continue;

    if (convoyShip && faction.faction === Faction.Enemy) {
      if (isDead(health)) {
        enemyConvoyDead++;
      } else {
        enemyConvoy++;
        if (convoyShip.isStopped) enemyConvoyStopped++;
      }
    } else if (faction.faction === Faction.Player) {
      if (!isDead(health)) playerTeam++;
    } else if (faction.faction === Faction.Enemy) {
      if (!isDead(health)) enemyEscorts++;
    }
  }

  return {
    playerTeam,
    enemyConvoy,
    enemyConvoyDead,
    enemyConvoyStopped,
    enemyEscorts,
  };
}

describe('Ambush Mission Setup', () => {
  it('spawns enemy convoy ships', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const state = setupAmbushMission(world, TEST_AMBUSH_MISSION);
    const counts = countEntities(world);

    assert.strictEqual(
      counts.enemyConvoy,
      TEST_AMBUSH_MISSION.ambushData.convoySize,
    );
    assert.strictEqual(
      state.totalConvoy,
      TEST_AMBUSH_MISSION.ambushData.convoySize,
    );
  });

  it('spawns escort fighters with correct behavior modes', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    setupAmbushMission(world, TEST_AMBUSH_MISSION);
    const counts = countEntities(world);
    const totalEscorts = TEST_AMBUSH_MISSION.ambushData.escorts.reduce(
      (sum, e) => sum + e.count,
      0,
    );

    assert.strictEqual(
      counts.enemyEscorts,
      totalEscorts,
      `Expected ${totalEscorts} escorts`,
    );

    for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction !== Faction.Enemy) continue;

      const ai = getComponent(world, entity, 'aiControlled');
      const convoyShip = getComponent(world, entity, 'convoyShip');

      if (!convoyShip && ai) {
        assert.ok(
          ai.behaviorMode === 'convoy-guard-aggressive' ||
            ai.behaviorMode === 'convoy-guard-defensive',
          `Expected convoy-guard behavior, got ${ai.behaviorMode}`,
        );
      }
    }
  });

  it('initializes mission state correctly', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const state = setupAmbushMission(world, TEST_AMBUSH_MISSION);

    assert.strictEqual(state.active, true);
    assert.strictEqual(state.completed, false);
    assert.strictEqual(
      state.totalConvoy,
      TEST_AMBUSH_MISSION.ambushData.convoySize,
    );
    assert.strictEqual(
      state.aliveConvoy,
      TEST_AMBUSH_MISSION.ambushData.convoySize,
    );
    assert.strictEqual(state.destroyedConvoy, 0);
    assert.strictEqual(state.stoppedConvoy, 0);
    assert.strictEqual(state.escapedConvoy, 0);
  });
});

describe('Ambush Mission Victory', () => {
  it('triggers victory when all convoy destroyed', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const player = createAIShip(
      world,
      'fighter',
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    addComponent(world, player, { type: 'playerControlled', input: {} });

    const state = setupAmbushMission(world, TEST_AMBUSH_MISSION);

    for (const entity of queryEntities(world, ['convoyShip', 'health'])) {
      const health = getComponent(world, entity, 'health');
      health.hull = 0;
    }

    processAmbushMissionTick(world, state);

    assert.strictEqual(state.completed, true);
    assert.strictEqual(world.systemState.mission.result, MissionResult.Victory);
  });

  it('triggers victory when all convoy stopped', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const player = createAIShip(
      world,
      'fighter',
      Faction.Player,
      new Vector3(0, 0, TEST_AMBUSH_MISSION.ambushData.convoyStartDistance),
      new Quaternion(),
      'regular',
    );
    addComponent(world, player, { type: 'playerControlled', input: {} });

    const state = setupAmbushMission(world, TEST_AMBUSH_MISSION);

    for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
      const faction = getComponent(world, entity, 'faction');
      const convoyShip = getComponent(world, entity, 'convoyShip');
      if (faction.faction === Faction.Enemy && !convoyShip) {
        const health = getComponent(world, entity, 'health');
        health.hull = 0;
      }
    }

    for (let i = 0; i < 100; i++) {
      processAmbushMissionTick(world, state);
      if (state.completed) break;
    }

    assert.strictEqual(state.completed, true);
    assert.strictEqual(world.systemState.mission.result, MissionResult.Victory);
    assert.ok(state.stoppedConvoy > 0, 'Expected some stopped convoy');
  });
});

describe('Ambush Mission Defeat', () => {
  it('triggers defeat when player dies', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const player = createAIShip(
      world,
      'fighter',
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    addComponent(world, player, { type: 'playerControlled', input: {} });

    const state = setupAmbushMission(world, TEST_AMBUSH_MISSION);

    const health = getComponent(world, player, 'health');
    health.hull = 0;

    processAmbushMissionTick(world, state);

    assert.strictEqual(state.completed, true);
    assert.strictEqual(world.systemState.mission.result, MissionResult.Defeat);
  });
});

describe('Convoy Stop Behavior', () => {
  it('convoy stops when no escorts nearby and player nearby', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const player = createAIShip(
      world,
      'fighter',
      Faction.Player,
      new Vector3(0, 0, TEST_AMBUSH_MISSION.ambushData.convoyStartDistance),
      new Quaternion(),
      'regular',
    );
    addComponent(world, player, { type: 'playerControlled', input: {} });

    setupAmbushMission(world, TEST_AMBUSH_MISSION);

    for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
      const faction = getComponent(world, entity, 'faction');
      const convoyShip = getComponent(world, entity, 'convoyShip');
      if (faction.faction === Faction.Enemy && !convoyShip) {
        const health = getComponent(world, entity, 'health');
        health.hull = 0;
      }
    }

    for (const entity of queryEntities(world, ['convoyShip', 'faction'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Enemy) {
        const stopped = checkConvoyStop(world, entity);
        assert.strictEqual(stopped, true, 'Convoy should stop');
      }
    }
  });

  it('convoy does not stop when escorts nearby', () => {
    const world = createWorld(12345);
    initCombatStats(world);
    world.systemState.mission = {
      missionType: 'ambush',
      result: MissionResult.InProgress,
    };

    const player = createAIShip(
      world,
      'fighter',
      Faction.Player,
      new Vector3(5000, 0, 0),
      new Quaternion(),
      'regular',
    );
    addComponent(world, player, { type: 'playerControlled', input: {} });

    setupAmbushMission(world, TEST_AMBUSH_MISSION);

    for (const entity of queryEntities(world, ['convoyShip', 'faction'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Enemy) {
        const stopped = checkConvoyStop(world, entity);
        assert.strictEqual(
          stopped,
          false,
          'Convoy should not stop when escorts nearby',
        );
      }
    }
  });
});

describe('Reward Calculation', () => {
  it('returns 1.0 for all stopped', () => {
    const state = {
      totalConvoy: 3,
      stoppedConvoy: 3,
      destroyedConvoy: 0,
      escapedConvoy: 0,
    };
    assert.strictEqual(getAmbushRewardMultiplier(state), 1.0);
  });

  it('returns 0.5 for all destroyed', () => {
    const state = {
      totalConvoy: 3,
      stoppedConvoy: 0,
      destroyedConvoy: 3,
      escapedConvoy: 0,
    };
    assert.strictEqual(getAmbushRewardMultiplier(state), 0.5);
  });

  it('returns mixed value for combination', () => {
    const state = {
      totalConvoy: 4,
      stoppedConvoy: 2,
      destroyedConvoy: 2,
      escapedConvoy: 0,
    };
    const multiplier = getAmbushRewardMultiplier(state);
    assert.ok(
      Math.abs(multiplier - 0.75) < 0.01,
      `Expected ~0.75, got ${multiplier}`,
    );
  });

  it('returns 0 for empty convoy', () => {
    const state = {
      totalConvoy: 0,
      stoppedConvoy: 0,
      destroyedConvoy: 0,
      escapedConvoy: 0,
    };
    assert.strictEqual(getAmbushRewardMultiplier(state), 0);
  });
});
