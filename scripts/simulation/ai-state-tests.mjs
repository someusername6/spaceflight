/**
 * AI State Transition Tests
 */

import {
  test, assert, assertEq, tickN, getAI, get,
  createGame, createPlayerShip, createEnemyShip,
  AIState, isDying, Vector3,
} from './ai-test-utils.mjs';

export function runStateTransitionTests() {
  console.log('\n[State Transitions]');

  test('Idle → Pursue when enemy detected', () => {
    const game = createGame(1);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(800, 0, 0));
    assertEq(getAI(game.world, enemy).state, AIState.Idle, 'Should start Idle');
    tickN(game, 5);
    assertEq(getAI(game.world, enemy).state, AIState.Pursue, 'Should transition to Pursue');
  });

  test('Pursue → Engage at close range', () => {
    const game = createGame(2);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(500, 0, 0));
    tickN(game, 5);
    assertEq(getAI(game.world, enemy).state, AIState.Engage, 'Should transition to Engage');
  });

  test('Engage → Pursue when target far', () => {
    const game = createGame(3);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(400, 0, 0));
    tickN(game, 5);
    assertEq(getAI(game.world, enemy).state, AIState.Engage, 'Should be in Engage');
    get(game.world, player, 'transform').position.set(2000, 0, 0);
    tickN(game, 5);
    assertEq(getAI(game.world, enemy).state, AIState.Pursue, 'Should return to Pursue');
  });

  test('Engage → Evade when shields low', () => {
    const game = createGame(4);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(400, 0, 0));
    tickN(game, 5);
    const shields = get(game.world, enemy, 'shields');
    shields.current = shields.max * 0.15;
    tickN(game, 2);
    assertEq(getAI(game.world, enemy).state, AIState.Evade, 'Should transition to Evade');
  });

  test('Engage → Regroup when shields very low', () => {
    const game = createGame(5);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(400, 0, 0));
    tickN(game, 5);
    const shields = get(game.world, enemy, 'shields');
    shields.current = shields.max * 0.05;
    tickN(game, 2);
    assertEq(getAI(game.world, enemy).state, AIState.Regroup, 'Should transition to Regroup');
  });

  test('Engage → Regroup when overheated', () => {
    const game = createGame(6);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(400, 0, 0));
    tickN(game, 5);
    const heat = get(game.world, enemy, 'heat');
    heat.current = heat.max * 0.95;
    tickN(game, 2);
    assertEq(getAI(game.world, enemy).state, AIState.Regroup, 'Should transition to Regroup');
  });

  test('Evade → Pursue after recovery', () => {
    const game = createGame(7);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(400, 0, 0));
    const ai = getAI(game.world, enemy);
    ai.state = AIState.Evade;
    ai.target = player;
    ai.stateTimer = 0;
    const shields = get(game.world, enemy, 'shields');
    shields.current = shields.max * 0.25;
    tickN(game, 310); // 5+ seconds
    assertEq(ai.state, AIState.Pursue, 'Should transition to Pursue after cooldown');
  });

  test('Regroup → Pursue after recovery', () => {
    const game = createGame(8);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(400, 0, 0));
    const ai = getAI(game.world, enemy);
    ai.state = AIState.Regroup;
    ai.target = player;
    ai.stateTimer = 0;
    const shields = get(game.world, enemy, 'shields');
    shields.current = shields.max * 0.6;
    const heat = get(game.world, enemy, 'heat');
    heat.current = heat.max * 0.3;
    tickN(game, 190); // 3+ seconds
    assertEq(ai.state, AIState.Pursue, 'Should transition to Pursue after recovery');
  });

  test('AI does not acquire dying entities as new targets', () => {
    const game = createGame(9);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const playerHealth = get(game.world, player, 'health');
    playerHealth.hull = 0;
    playerHealth.deathDelay = 1.0; // Mark as dying (correct field names)
    assert(isDying(playerHealth), 'Player should be marked as dying');
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(800, 0, 0));
    tickN(game, 10);
    const ai = getAI(game.world, enemy);
    assertEq(ai.state, AIState.Idle, 'Should remain Idle with no valid targets');
  });
}
