/**
 * Kill/Assist Attribution tests - death handling and posthumous kills
 */

import {
  assert,
  createTestShip,
  createWorld,
  getComponent,
  handleShipDeath,
  initMatchStats,
  printSummary,
  processRemovals,
  recordDamage,
  recordShotFired,
  recordShotHit,
  removeEntity,
  test,
} from './combat-stats-test-helpers.mjs';

console.log('Kill/Assist Attribution Tests\n');

// =============================================================================
// Kill/Assist Attribution Tests
// =============================================================================

test('handleShipDeath awards kill to last damage source', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 10;

  const attacker = createTestShip(world);
  const victim = createTestShip(world);

  // Record damage to set up kill attribution
  recordDamage(world, attacker, victim, 'Red Laser', 'beam', 100);

  // Handle death
  handleShipDeath(world, victim);

  const stats = getComponent(world, attacker, 'combatStats');
  assert(stats.kills === 1, 'Killer should have 1 kill');
});

test('handleShipDeath awards assists to other damage sources', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 10;

  const attacker1 = createTestShip(world);
  const attacker2 = createTestShip(world);
  const victim = createTestShip(world);

  // Both attackers damage the victim
  recordDamage(world, attacker1, victim, 'Red Laser', 'beam', 30);
  recordDamage(world, attacker2, victim, 'Green Laser', 'beam', 70); // Killing blow

  handleShipDeath(world, victim);

  const stats1 = getComponent(world, attacker1, 'combatStats');
  const stats2 = getComponent(world, attacker2, 'combatStats');
  assert(stats1.assists === 1, 'First attacker should have 1 assist');
  assert(stats2.kills === 1, 'Second attacker should have 1 kill');
  assert(stats2.assists === 0, 'Killer should not also get assist');
});

test('handleShipDeath snapshots player faction ships', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 15;
  world.systemState.matchStats.missionStartTime = 5;

  const victim = createTestShip(world);

  // Add some stats
  recordShotFired(world, victim, 'Red Laser');
  recordShotHit(world, victim, 'Red Laser');

  handleShipDeath(world, victim);

  const records = world.systemState.matchStats.destroyedShips;
  assert(records.length === 1, 'Should have 1 destroyed ship record');
  assert(records[0].timeOfDeath === 10, 'Time of death should be 10s');
  assert(records[0].stats.weaponStats.length > 0, 'Should have weapon stats');
});

test('handleShipDeath awards posthumous kills when killer died first', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 10;
  world.systemState.matchStats.missionStartTime = 0;

  const attacker = createTestShip(world);
  const victim = createTestShip(world);

  // Attacker damages victim
  recordDamage(world, attacker, victim, 'Red Laser', 'beam', 50);

  // Attacker dies first (gets snapshotted with 0 kills)
  handleShipDeath(world, attacker);
  // Entity is removed after death delay in real game
  removeEntity(world, attacker);
  processRemovals(world);

  // Verify attacker's record has 0 kills initially
  const attackerRecord = world.systemState.matchStats.destroyedShips.find(
    (r) => r.entityId === attacker,
  );
  assert(attackerRecord !== undefined, 'Attacker should be in destroyed ships');
  assert(
    attackerRecord.stats.kills === 0,
    'Attacker should have 0 kills before victim dies',
  );

  // Victim dies - attacker should get posthumous kill
  handleShipDeath(world, victim);

  // Verify attacker's record now has 1 kill
  assert(
    attackerRecord.stats.kills === 1,
    'Attacker should have 1 posthumous kill',
  );
});

test('handleShipDeath awards posthumous assists when assister died first', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 10;
  world.systemState.matchStats.missionStartTime = 0;

  const assister = createTestShip(world);
  const killer = createTestShip(world);
  const victim = createTestShip(world);

  // Both damage victim
  recordDamage(world, assister, victim, 'Red Laser', 'beam', 30);
  recordDamage(world, killer, victim, 'Green Laser', 'beam', 70); // Killing blow

  // Assister dies first
  handleShipDeath(world, assister);
  // Entity is removed after death delay in real game
  removeEntity(world, assister);
  processRemovals(world);

  // Verify assister's record has 0 assists initially
  const assisterRecord = world.systemState.matchStats.destroyedShips.find(
    (r) => r.entityId === assister,
  );
  assert(assisterRecord !== undefined, 'Assister should be in destroyed ships');
  assert(
    assisterRecord.stats.assists === 0,
    'Assister should have 0 assists before victim dies',
  );

  // Victim dies - assister should get posthumous assist
  handleShipDeath(world, victim);

  // Verify assister's record now has 1 assist
  assert(
    assisterRecord.stats.assists === 1,
    'Assister should have 1 posthumous assist',
  );

  // Killer (still alive) should have 1 kill
  const killerStats = getComponent(world, killer, 'combatStats');
  assert(killerStats.kills === 1, 'Killer should have 1 kill');
});

test('handleShipDeath handles multiple posthumous assists', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 10;
  world.systemState.matchStats.missionStartTime = 0;

  const assister1 = createTestShip(world);
  const assister2 = createTestShip(world);
  const killer = createTestShip(world);
  const victim = createTestShip(world);

  // All three damage victim
  recordDamage(world, assister1, victim, 'Red Laser', 'beam', 20);
  recordDamage(world, assister2, victim, 'Blue Laser', 'beam', 30);
  recordDamage(world, killer, victim, 'Green Laser', 'beam', 50); // Killing blow

  // Both assisters die first
  handleShipDeath(world, assister1);
  removeEntity(world, assister1);
  handleShipDeath(world, assister2);
  removeEntity(world, assister2);
  processRemovals(world);

  // Victim dies
  handleShipDeath(world, victim);

  // Both assisters should get posthumous assists
  const record1 = world.systemState.matchStats.destroyedShips.find(
    (r) => r.entityId === assister1,
  );
  const record2 = world.systemState.matchStats.destroyedShips.find(
    (r) => r.entityId === assister2,
  );

  assert(
    record1.stats.assists === 1,
    'Assister 1 should have posthumous assist',
  );
  assert(
    record2.stats.assists === 1,
    'Assister 2 should have posthumous assist',
  );
});

test('handleShipDeath no kill awarded when victim had no attackers', () => {
  const world = createWorld(0);
  initMatchStats(world);
  world.systemState.gameTime = 10;

  const victim = createTestShip(world);

  // Victim dies without being attacked (e.g., environmental damage)
  handleShipDeath(world, victim);

  // Should still create a record
  const records = world.systemState.matchStats.destroyedShips;
  assert(records.length === 1, 'Should have 1 destroyed ship record');
});

// =============================================================================
// Summary
// =============================================================================

process.exit(printSummary());
