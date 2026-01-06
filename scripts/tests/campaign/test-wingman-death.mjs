/**
 * Wingman Death Persistence Tests - verifies ships and pilots are removed on death.
 */

import {
  applyMissionResults,
  createNewCampaign,
  getCommanderShip,
  getPilotById,
  getWingmanShips,
  isGameOver,
} from '../../../src/campaign/state.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================
// Initial State Tests
// ============================================================

test('New campaign has 4 ships (commander + 3 wingmen)', () => {
  const state = createNewCampaign();
  assert(
    state.ships.length === 4,
    `Expected 4 ships, got ${state.ships.length}`,
  );
});

test('New campaign has 4 pilots', () => {
  const state = createNewCampaign();
  assert(
    state.pilots.length === 4,
    `Expected 4 pilots, got ${state.pilots.length}`,
  );
});

test('Commander ship exists', () => {
  const state = createNewCampaign();
  const commanderShip = getCommanderShip(state);
  assert(commanderShip !== undefined, 'Commander ship should exist');
});

test('Three wingmen exist', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  assert(wingmen.length === 3, `Expected 3 wingmen, got ${wingmen.length}`);
});

// ============================================================
// Wingman Death Tests
// ============================================================

test('Wingman death removes ship from fleet', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const deadWingmanId = wingmen[0].id;

  const newState = applyMissionResults(
    state,
    true, // victory
    100, // credits
    [deadWingmanId], // ships lost
    new Map(),
  );

  assert(
    newState.ships.length === 3,
    `Expected 3 ships, got ${newState.ships.length}`,
  );
  assert(
    !newState.ships.find((s) => s.id === deadWingmanId),
    'Dead wingman should be removed from ships',
  );
});

test('Wingman death removes pilot from roster', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const deadWingman = wingmen[0];
  const deadPilotId = deadWingman.pilot?.id;

  const newState = applyMissionResults(
    state,
    true,
    100,
    [deadWingman.id],
    new Map(),
  );

  assert(
    newState.pilots.length === 3,
    `Expected 3 pilots, got ${newState.pilots.length}`,
  );
  assert(
    !newState.pilots.find((p) => p.id === deadPilotId),
    'Dead pilot should be removed from roster',
  );
});

test('Multiple wingman deaths removes all ships and pilots', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const deadShipIds = [wingmen[0].id, wingmen[1].id];

  const newState = applyMissionResults(
    state,
    true,
    100,
    deadShipIds,
    new Map(),
  );

  assert(
    newState.ships.length === 2,
    `Expected 2 ships, got ${newState.ships.length}`,
  );
  assert(
    newState.pilots.length === 2,
    `Expected 2 pilots, got ${newState.pilots.length}`,
  );
});

test('All wingmen dead leaves only commander', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const allWingmenIds = wingmen.map((w) => w.id);

  const newState = applyMissionResults(
    state,
    true,
    100,
    allWingmenIds,
    new Map(),
  );

  assert(
    newState.ships.length === 1,
    `Expected 1 ship, got ${newState.ships.length}`,
  );
  assert(
    newState.pilots.length === 1,
    `Expected 1 pilot, got ${newState.pilots.length}`,
  );
  assert(
    getCommanderShip(newState) !== undefined,
    'Commander should still exist',
  );
});

// ============================================================
// Game Over Tests
// ============================================================

test('Game over when commander dies', () => {
  const state = createNewCampaign();
  const commanderShip = getCommanderShip(state);

  const newState = applyMissionResults(
    state,
    false, // defeat
    0,
    [commanderShip.id], // commander lost
    new Map(),
  );

  assert(isGameOver(newState), 'Game should be over when commander dies');
});

test('Not game over when wingmen die but commander lives', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);

  const newState = applyMissionResults(
    state,
    true,
    100,
    [wingmen[0].id],
    new Map(),
  );

  assert(
    !isGameOver(newState),
    'Game should not be over when only wingmen die',
  );
});

// ============================================================
// Surviving Pilot Stats Tests
// ============================================================

test('Surviving pilots get mission stats updated', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const survivor = wingmen[1];
  const deadWingmanId = wingmen[0].id;

  const newState = applyMissionResults(
    state,
    true,
    100,
    [deadWingmanId],
    new Map(),
  );

  const survivorPilot = getPilotById(newState, survivor.pilot.id);
  assert(survivorPilot !== undefined, 'Survivor should exist');
  assert(
    survivorPilot.missionsFlown === 1,
    `Expected 1 mission flown, got ${survivorPilot.missionsFlown}`,
  );
  assert(
    survivorPilot.missionsWon === 1,
    `Expected 1 mission won, got ${survivorPilot.missionsWon}`,
  );
});

test('Dead pilot does not get mission stats updated', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const deadWingman = wingmen[0];
  const deadPilotId = deadWingman.pilot?.id;

  const newState = applyMissionResults(
    state,
    true,
    100,
    [deadWingman.id],
    new Map(),
  );

  const deadPilot = getPilotById(newState, deadPilotId);
  assert(deadPilot === undefined, 'Dead pilot should not exist in roster');
});

// ============================================================
// Credits Tests
// ============================================================

test('Credits awarded on victory even with deaths', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const initialCredits = state.credits;

  const newState = applyMissionResults(
    state,
    true,
    200,
    [wingmen[0].id],
    new Map(),
  );

  assert(
    newState.credits === initialCredits + 200,
    `Expected ${initialCredits + 200} credits, got ${newState.credits}`,
  );
});

test('No credits awarded on defeat', () => {
  const state = createNewCampaign();
  const wingmen = getWingmanShips(state);
  const initialCredits = state.credits;

  const newState = applyMissionResults(
    state,
    false,
    200,
    [wingmen[0].id],
    new Map(),
  );

  assert(
    newState.credits === initialCredits,
    `Expected ${initialCredits} credits, got ${newState.credits}`,
  );
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
