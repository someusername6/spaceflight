/**
 * AI Combat Tests - Weapon firing, constraints, movement, determinism.
 */

import {
  test, assert, assertEq, tickN, getAI, get, countInState, countProjectiles,
  createGame, createPlayerShip, createEnemyShip,
  AIState, Vector3,
} from './ai-test-utils.mjs';

export function runWeaponFiringTests() {
  console.log('\n[Weapon Firing]');

  test('AI fires primary weapons in Engage state', () => {
    const game = createGame(20);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(300, 0, 0));
    tickN(game, 10);
    assertEq(getAI(game.world, enemy).state, AIState.Engage, 'Should be in Engage');
    const initialProjectiles = countProjectiles(game.world);
    tickN(game, 60);
    assert(countProjectiles(game.world) > initialProjectiles, 'Should have fired projectiles');
  });

  test('AI does not fire in Pursue state', () => {
    const game = createGame(21);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(900, 0, 0));
    tickN(game, 5);
    assertEq(getAI(game.world, enemy).state, AIState.Pursue, 'Should be in Pursue');
    get(game.world, enemy, 'physics').currentSpeed = 0;
    const initialProjectiles = countProjectiles(game.world);
    tickN(game, 60);
    assertEq(countProjectiles(game.world), initialProjectiles, 'Should not fire in Pursue');
  });

  test('AI does not fire in Evade state', () => {
    const game = createGame(22);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(300, 0, 0));
    const ai = getAI(game.world, enemy);
    ai.state = AIState.Evade;
    ai.target = player;
    const initialProjectiles = countProjectiles(game.world);
    tickN(game, 60);
    assertEq(countProjectiles(game.world), initialProjectiles, 'Should not fire in Evade');
  });
}

export function runConstraintTests() {
  console.log('\n[Constraints]');

  test('Max 3 AI can engage player simultaneously', () => {
    const game = createGame(30);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    for (let i = 0; i < 6; i++) {
      createEnemyShip(game.world, 'scout', new Vector3(300 + i * 50, 0, 0));
    }
    tickN(game, 30);
    const engageCount = countInState(game.world, AIState.Engage);
    assert(engageCount <= 3, `Max 3 should engage, got ${engageCount}`);
    assert(engageCount >= 1, 'At least 1 should engage');
  });

  test('AI in Pursue when engage slots full', () => {
    const game = createGame(31);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    for (let i = 0; i < 5; i++) {
      createEnemyShip(game.world, 'scout', new Vector3(300 + i * 30, 0, 0));
    }
    tickN(game, 30);
    assertEq(countInState(game.world, AIState.Engage), 3, 'Exactly 3 should engage');
    assert(countInState(game.world, AIState.Pursue) >= 2, 'Others should pursue');
  });
}

export function runMovementTests() {
  console.log('\n[Movement]');

  test('AI in Pursue moves toward target', () => {
    const game = createGame(40);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(1000, 0, 0));
    const initialDist = get(game.world, enemy, 'transform').position.distanceTo(
      get(game.world, player, 'transform').position
    );
    get(game.world, player, 'physics').currentSpeed = 0;
    tickN(game, 60);
    const finalDist = get(game.world, enemy, 'transform').position.distanceTo(
      get(game.world, player, 'transform').position
    );
    assert(finalDist < initialDist, 'Should move closer to target');
  });

  test('AI in Evade moves away from target', () => {
    const game = createGame(41);
    const player = createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(300, 0, 0));
    const ai = getAI(game.world, enemy);
    ai.state = AIState.Evade;
    ai.target = player;
    ai.stateTimer = 0;
    const initialDist = get(game.world, enemy, 'transform').position.distanceTo(
      get(game.world, player, 'transform').position
    );
    get(game.world, player, 'physics').currentSpeed = 0;
    tickN(game, 60);
    const finalDist = get(game.world, enemy, 'transform').position.distanceTo(
      get(game.world, player, 'transform').position
    );
    assert(finalDist > initialDist, 'Should move away from target in Evade');
  });

  test('AI accelerates to max speed in Pursue', () => {
    const game = createGame(42);
    createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
    const enemy = createEnemyShip(game.world, 'scout', new Vector3(1000, 0, 0));
    const physics = get(game.world, enemy, 'physics');
    physics.currentSpeed = 0;
    tickN(game, 120);
    assert(physics.currentSpeed > physics.maxSpeed * 0.9,
      `Should reach near max speed, got ${physics.currentSpeed}/${physics.maxSpeed}`);
  });
}

export function runDeterminismTests() {
  console.log('\n[Determinism]');

  test('Same seed produces identical AI behavior', () => {
    function runScenario(seed) {
      const game = createGame(seed);
      createPlayerShip(game.world, 'interceptor', new Vector3(0, 0, 0));
      const enemy = createEnemyShip(game.world, 'scout', new Vector3(500, 0, 0));
      tickN(game, 100);
      const ai = getAI(game.world, enemy);
      const pos = get(game.world, enemy, 'transform').position;
      return { state: ai.state, stateTimer: ai.stateTimer, x: pos.x, y: pos.y, z: pos.z };
    }
    const r1 = runScenario(12345);
    const r2 = runScenario(12345);
    assertEq(r1.state, r2.state, 'State should match');
    assertEq(r1.x, r2.x, 'X position should match');
  });
}
