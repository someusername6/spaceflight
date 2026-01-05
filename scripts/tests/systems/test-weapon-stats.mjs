/**
 * Weapon Stats tests - projectile, beam, missile, and decoy stats tracking
 */

import {
  assert,
  assertApprox,
  createCombatStats,
  createTestEnemy,
  createTestShip,
  createWorld,
  getComponent,
  getOrCreateWeaponStats,
  initMatchStats,
  printSummary,
  recordBeamFired,
  recordBeamHit,
  recordDamage,
  recordMissileHit,
  recordMissileLaunched,
  recordMissileSeduced,
  recordShotFired,
  recordShotHit,
  test,
} from './combat-stats-test-helpers.mjs';

console.log('Weapon Stats Tests\n');

// =============================================================================
// isPulseBeam Flag Tests
// =============================================================================

test('isPulseBeam flag is set at creation time', () => {
  const stats = createCombatStats();

  // Create weapon with isPulseBeam=true at creation
  const pulseWeapon = getOrCreateWeaponStats(stats, 'Lightning', 'beam', true);
  assert(pulseWeapon.isPulseBeam === true, 'Lightning should be pulse beam');

  // Create regular beam (isPulseBeam=false by default)
  const continuousWeapon = getOrCreateWeaponStats(stats, 'Red Laser', 'beam');
  assert(
    continuousWeapon.isPulseBeam === false,
    'Red Laser should not be pulse beam',
  );
});

test('isPulseBeam flag persists even if weapon never fired', () => {
  const stats = createCombatStats();

  // Create pulse beam but never fire it
  const weapon = getOrCreateWeaponStats(stats, 'Lightning', 'beam', true);

  // Verify flag is set even with zero usage
  assert(weapon.isPulseBeam === true, 'Should still be pulse beam');
  assert(weapon.shotsFired === 0, 'Should have 0 shots');
  assert(weapon.timeFired === 0, 'Should have 0 time');
  assert(weapon.damageDealt === 0, 'Should have 0 damage');
});

test('isPulseBeam consistency - getting existing stats returns correct flag', () => {
  const stats = createCombatStats();

  // First call creates with isPulseBeam=true
  const weapon1 = getOrCreateWeaponStats(stats, 'Lightning', 'beam', true);
  assert(weapon1.isPulseBeam === true, 'First call should set isPulseBeam');

  // Second call with isPulseBeam=false should still return true (first-caller-wins)
  const weapon2 = getOrCreateWeaponStats(stats, 'Lightning', 'beam', false);
  assert(weapon1 === weapon2, 'Should return same object');
  assert(weapon2.isPulseBeam === true, 'isPulseBeam should persist as true');
});

test('isPulseBeam inconsistency correction - false then true', () => {
  const stats = createCombatStats();

  // First call creates with isPulseBeam=false (bug: wrong call order)
  const weapon1 = getOrCreateWeaponStats(stats, 'Lightning', 'beam', false);
  assert(weapon1.isPulseBeam === false, 'Initially created as non-pulse');

  // Second call with isPulseBeam=true should fix it (and warn)
  const weapon2 = getOrCreateWeaponStats(stats, 'Lightning', 'beam', true);
  assert(weapon1 === weapon2, 'Should return same object');
  assert(
    weapon2.isPulseBeam === true,
    'isPulseBeam should be corrected to true',
  );
});

// =============================================================================
// Projectile Stats Tests
// =============================================================================

test('recordShotFired increments shot count', () => {
  const world = createWorld(0);
  const ship = createTestShip(world);

  recordShotFired(world, ship, 'Subach HL-7');
  recordShotFired(world, ship, 'Subach HL-7');

  const stats = getComponent(world, ship, 'combatStats');
  const weapon = stats.weaponStats.get('Subach HL-7');
  assert(weapon.shotsFired === 2, 'Should have 2 shots fired');
});

test('recordShotHit increments hit count', () => {
  const world = createWorld(0);
  const ship = createTestShip(world);

  recordShotFired(world, ship, 'Subach HL-7');
  recordShotFired(world, ship, 'Subach HL-7');
  recordShotHit(world, ship, 'Subach HL-7');

  const stats = getComponent(world, ship, 'combatStats');
  const weapon = stats.weaponStats.get('Subach HL-7');
  assert(weapon.shotsFired === 2, 'Should have 2 shots fired');
  assert(weapon.shotsOnTarget === 1, 'Should have 1 hit');
});

// =============================================================================
// Beam Stats Tests
// =============================================================================

test('recordBeamFired tracks firing time', () => {
  const world = createWorld(0);
  const ship = createTestShip(world);

  recordBeamFired(world, ship, 'Red Laser', 0.5);
  recordBeamFired(world, ship, 'Red Laser', 0.3);

  const stats = getComponent(world, ship, 'combatStats');
  const weapon = stats.weaponStats.get('Red Laser');
  assertApprox(weapon.timeFired, 0.8, 0.001, 'Should have 0.8s fired');
});

test('recordBeamHit tracks time on target', () => {
  const world = createWorld(0);
  const ship = createTestShip(world);

  recordBeamFired(world, ship, 'Red Laser', 1.0);
  recordBeamHit(world, ship, 'Red Laser', 0.6);

  const stats = getComponent(world, ship, 'combatStats');
  const weapon = stats.weaponStats.get('Red Laser');
  assertApprox(weapon.timeFired, 1.0, 0.001, 'Should have 1.0s fired');
  assertApprox(weapon.timeOnTarget, 0.6, 0.001, 'Should have 0.6s on target');
});

test('Pulse beam tracks shots via recordShotFired', () => {
  const world = createWorld(0);
  initMatchStats(world);
  const ship = createTestShip(world);
  const target = createTestEnemy(world);

  // Pulse beam uses shots, not time
  recordShotFired(world, ship, 'Lightning', 'beam', true);
  recordShotFired(world, ship, 'Lightning', 'beam', true);
  recordShotHit(world, ship, 'Lightning', 'beam', true);
  recordDamage(world, ship, target, 'Lightning', 'beam', 100, true);

  const stats = getComponent(world, ship, 'combatStats');
  const weapon = stats.weaponStats.get('Lightning');
  assert(weapon.isPulseBeam === true, 'Should be marked as pulse beam');
  assert(weapon.shotsFired === 2, 'Should have 2 pulses fired');
  assert(weapon.shotsOnTarget === 1, 'Should have 1 pulse hit');
  assert(weapon.damageDealt === 100, 'Should have 100 damage');
  assertApprox(weapon.timeFired, 0, 0.001, 'Should have 0 time fired');
});

// =============================================================================
// Missile Stats Tests
// =============================================================================

test('recordMissileLaunched tracks launches', () => {
  const world = createWorld(0);
  const ship = createTestShip(world);

  recordMissileLaunched(world, ship, 'Seeker');
  recordMissileLaunched(world, ship, 'Seeker');
  recordMissileLaunched(world, ship, 'Torpedo');

  const stats = getComponent(world, ship, 'combatStats');
  const seekerStats = stats.weaponStats.get('Seeker');
  const torpedoStats = stats.weaponStats.get('Torpedo');
  assert(seekerStats.missilesLaunched === 2, 'Should have 2 seekers launched');
  assert(torpedoStats.missilesLaunched === 1, 'Should have 1 torpedo launched');
});

test('recordMissileHit tracks hits', () => {
  const world = createWorld(0);
  const ship = createTestShip(world);

  recordMissileLaunched(world, ship, 'Seeker');
  recordMissileLaunched(world, ship, 'Seeker');
  recordMissileHit(world, ship, 'Seeker');

  const stats = getComponent(world, ship, 'combatStats');
  const weapon = stats.weaponStats.get('Seeker');
  assert(weapon.missilesLaunched === 2, 'Should have 2 launched');
  assert(weapon.missilesHit === 1, 'Should have 1 hit');
});

test('recordMissileSeduced tracks seductions on both sides', () => {
  const world = createWorld(0);
  const missileOwner = createTestEnemy(world);
  const decoyOwner = createTestShip(world);

  recordMissileSeduced(world, missileOwner, 'Seeker', decoyOwner);

  const missileStats = getComponent(world, missileOwner, 'combatStats');
  const seekerStats = missileStats.weaponStats.get('Seeker');
  assert(
    seekerStats.missilesSeduced === 1,
    'Missile owner should track seduction',
  );

  const decoyStats = getComponent(world, decoyOwner, 'combatStats');
  const decoyWeapon = decoyStats.weaponStats.get('Decoy');
  assert(
    decoyWeapon.missilesSeducedByDecoy === 1,
    'Decoy owner should track seduction',
  );
});

// =============================================================================
// Multiple Weapons Tests
// =============================================================================

test('Stats track multiple weapons independently', () => {
  const world = createWorld(0);
  initMatchStats(world);
  const ship = createTestShip(world);
  const target = createTestEnemy(world);

  // Fire different weapons
  recordShotFired(world, ship, 'Subach HL-7');
  recordShotFired(world, ship, 'Subach HL-7');
  recordShotHit(world, ship, 'Subach HL-7');
  recordDamage(world, ship, target, 'Subach HL-7', 'projectile', 20);

  recordBeamFired(world, ship, 'Red Laser', 1.0);
  recordBeamHit(world, ship, 'Red Laser', 0.5);
  recordDamage(world, ship, target, 'Red Laser', 'beam', 50);

  recordMissileLaunched(world, ship, 'Seeker');
  recordMissileHit(world, ship, 'Seeker');
  recordDamage(world, ship, target, 'Seeker', 'missile', 80);

  const stats = getComponent(world, ship, 'combatStats');

  // Check projectile
  const projectile = stats.weaponStats.get('Subach HL-7');
  assert(projectile.shotsFired === 2, 'Subach should have 2 shots');
  assert(projectile.shotsOnTarget === 1, 'Subach should have 1 hit');
  assert(projectile.damageDealt === 20, 'Subach damage should be 20');

  // Check beam
  const beam = stats.weaponStats.get('Red Laser');
  assertApprox(beam.timeFired, 1.0, 0.001, 'Beam should have 1s fired');
  assertApprox(
    beam.timeOnTarget,
    0.5,
    0.001,
    'Beam should have 0.5s on target',
  );
  assert(beam.damageDealt === 50, 'Beam damage should be 50');

  // Check missile
  const missile = stats.weaponStats.get('Seeker');
  assert(missile.missilesLaunched === 1, 'Should have 1 missile launched');
  assert(missile.missilesHit === 1, 'Should have 1 missile hit');
  assert(missile.damageDealt === 80, 'Missile damage should be 80');

  // Check total damage
  assert(stats.damageDealt === 150, 'Total damage should be 150');
});

// =============================================================================
// Summary
// =============================================================================

process.exit(printSummary());
