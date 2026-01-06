/**
 * Heat System Tests - validates heat locking, hysteresis, and ship heat stats.
 */

import {
  AFTERBURNER_LOCK_THRESHOLD,
  AFTERBURNER_UNLOCK_THRESHOLD,
  addHeat,
  coolDown,
  createHeat,
  getHeatPercent,
  HEAT_WARNING_THRESHOLD,
  isHeatWarning,
  isOverheated,
  WEAPON_LOCK_THRESHOLD,
  WEAPON_UNLOCK_THRESHOLD,
} from '../../../src/components/heat.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship.ts';

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
// Heat Threshold Constants
// ============================================================

test('Heat warning threshold is 90%', () => {
  assert(HEAT_WARNING_THRESHOLD === 0.9, 'Warning should be 90%');
});

test('Afterburner lock threshold is 95%', () => {
  assert(AFTERBURNER_LOCK_THRESHOLD === 0.95, 'AB lock should be 95%');
});

test('Afterburner unlock threshold is 50%', () => {
  assert(AFTERBURNER_UNLOCK_THRESHOLD === 0.5, 'AB unlock should be 50%');
});

test('Weapon lock threshold is 100%', () => {
  assert(WEAPON_LOCK_THRESHOLD === 1.0, 'Weapon lock should be 100%');
});

test('Weapon unlock threshold is 95%', () => {
  assert(WEAPON_UNLOCK_THRESHOLD === 0.95, 'Weapon unlock should be 95%');
});

// ============================================================
// Heat Component Creation
// ============================================================

test('Heat component initializes correctly', () => {
  const heat = createHeat(100, 20);
  assert(heat.current === 0, 'Current heat should start at 0');
  assert(heat.max === 100, 'Max heat should be 100');
  assert(heat.coolingRate === 20, 'Cooling rate should be 20');
  assert(heat.weaponsLocked === false, 'Weapons should start unlocked');
});

test('getHeatPercent returns correct percentage', () => {
  const heat = createHeat(100, 20);
  heat.current = 50;
  assert(getHeatPercent(heat) === 0.5, 'Should be 50%');
  heat.current = 90;
  assert(getHeatPercent(heat) === 0.9, 'Should be 90%');
});

// ============================================================
// Heat Warning
// ============================================================

test('isHeatWarning returns false below 90%', () => {
  const heat = createHeat(100, 20);
  heat.current = 89;
  assert(!isHeatWarning(heat), 'Should not warn at 89%');
});

test('isHeatWarning returns true at 90%', () => {
  const heat = createHeat(100, 20);
  heat.current = 90;
  assert(isHeatWarning(heat), 'Should warn at 90%');
});

test('isHeatWarning returns true above 90%', () => {
  const heat = createHeat(100, 20);
  heat.current = 95;
  assert(isHeatWarning(heat), 'Should warn at 95%');
});

// ============================================================
// Weapon Locking Hysteresis
// ============================================================

test('Weapons lock at 100% heat', () => {
  const heat = createHeat(100, 20);
  heat.current = 95;
  assert(addHeat(heat, 5), 'Should allow adding heat to reach 100%');
  assert(heat.current === 100, 'Heat should be at 100%');
  assert(heat.weaponsLocked === true, 'Weapons should be locked at 100%');
});

test('Weapons stay locked above 95%', () => {
  const heat = createHeat(100, 20);
  heat.current = 100;
  heat.weaponsLocked = true;
  coolDown(heat, 0.2); // Cool down 4 heat (20 * 0.2) = 96%
  assert(heat.current === 96, 'Heat should be at 96%');
  assert(heat.weaponsLocked === true, 'Weapons should still be locked at 96%');
});

test('Weapons unlock at 95% or below', () => {
  const heat = createHeat(100, 20);
  heat.current = 100;
  heat.weaponsLocked = true;
  coolDown(heat, 0.3); // Cool down 6 heat (20 * 0.3) = 94%
  assert(heat.current === 94, 'Heat should be at 94%');
  assert(heat.weaponsLocked === false, 'Weapons should unlock at 94%');
});

test('addHeat returns false when weapons locked', () => {
  const heat = createHeat(100, 20);
  heat.weaponsLocked = true;
  assert(!addHeat(heat, 10), 'Should not allow adding heat when locked');
});

test('isOverheated returns weaponsLocked state', () => {
  const heat = createHeat(100, 20);
  assert(!isOverheated(heat), 'Should not be overheated initially');
  heat.weaponsLocked = true;
  assert(isOverheated(heat), 'Should be overheated when locked');
});

test('Weapon lock hysteresis prevents oscillation', () => {
  const heat = createHeat(100, 20);

  // Heat up to 100% - locks
  heat.current = 100;
  addHeat(heat, 0); // Trigger lock check
  heat.weaponsLocked = true;

  // Cool to 96% - still locked (above 95%)
  coolDown(heat, 0.2); // 4 heat removed
  assert(heat.weaponsLocked === true, 'Should stay locked at 96%');

  // Cool to 94% - unlocks
  coolDown(heat, 0.1); // 2 more heat removed
  assert(heat.weaponsLocked === false, 'Should unlock at 94%');

  // Heat back up to 99% - should NOT lock (below 100%)
  addHeat(heat, 5);
  assert(heat.weaponsLocked === false, 'Should stay unlocked at 99%');

  // Heat to 100% - locks again
  addHeat(heat, 1);
  assert(heat.weaponsLocked === true, 'Should lock at 100%');
});

// ============================================================
// Ship Archetype Heat Stats
// ============================================================

test('Base ship archetypes exist', () => {
  const archetypes = Object.keys(SHIP_ARCHETYPES);
  assert(archetypes.length >= 7, 'Should have at least 7 ship archetypes');
  assert(archetypes.includes('scout'), 'Should have scout');
  assert(archetypes.includes('interceptor'), 'Should have interceptor');
  assert(archetypes.includes('striker'), 'Should have striker');
  assert(archetypes.includes('bomber'), 'Should have bomber');
  assert(archetypes.includes('defender'), 'Should have defender');
  assert(archetypes.includes('raider'), 'Should have raider');
  assert(archetypes.includes('sentinel'), 'Should have sentinel');
});

test('Scout has low afterburner heat rate (mobility focused)', () => {
  const scout = SHIP_ARCHETYPES.scout;
  assert(scout.afterburnerHeatRate === 25, 'Scout AB heat should be 25');
  assert(scout.maxHeat === 80, 'Scout max heat should be 80');
  assert(scout.coolingRate === 15, 'Scout cooling should be 15');
});

test('Interceptor has heat stats between scout and fighter', () => {
  const interceptor = SHIP_ARCHETYPES.interceptor;
  assert(
    interceptor.afterburnerHeatRate === 32,
    'Interceptor AB heat should be 32',
  );
  assert(interceptor.maxHeat === 90, 'Interceptor max heat should be 90');
  assert(interceptor.coolingRate === 16, 'Interceptor cooling should be 16');
});

test('Striker has high capacity but expensive afterburner', () => {
  const striker = SHIP_ARCHETYPES.striker;
  assert(striker.afterburnerHeatRate === 60, 'Striker AB heat should be 60');
  assert(striker.maxHeat === 150, 'Striker max heat should be 150');
  assert(striker.coolingRate === 25, 'Striker cooling should be 25');
});

test('Bomber has expensive afterburner (slow by design)', () => {
  const bomber = SHIP_ARCHETYPES.bomber;
  assert(bomber.afterburnerHeatRate === 55, 'Bomber AB heat should be 55');
  assert(bomber.maxHeat === 80, 'Bomber max heat should be 80');
  assert(bomber.coolingRate === 12, 'Bomber cooling should be 12');
});

test('Defender has standard afterburner cost', () => {
  const defender = SHIP_ARCHETYPES.defender;
  assert(defender.afterburnerHeatRate === 50, 'Defender AB heat should be 50');
  assert(defender.maxHeat === 100, 'Defender max heat should be 100');
  assert(defender.coolingRate === 18, 'Defender cooling should be 18');
});

test('Raider has cheap afterburner (speed focused)', () => {
  const raider = SHIP_ARCHETYPES.raider;
  assert(raider.afterburnerHeatRate === 35, 'Raider AB heat should be 35');
  assert(raider.maxHeat === 140, 'Raider max heat should be 140');
  assert(raider.coolingRate === 22, 'Raider cooling should be 22');
});

test('Sentinel has moderate afterburner cost', () => {
  const sentinel = SHIP_ARCHETYPES.sentinel;
  assert(sentinel.afterburnerHeatRate === 45, 'Sentinel AB heat should be 45');
  assert(sentinel.maxHeat === 130, 'Sentinel max heat should be 130');
  assert(sentinel.coolingRate === 22, 'Sentinel cooling should be 22');
});

// ============================================================
// Afterburner Sustain Time (maxHeat / afterburnerHeatRate)
// ============================================================

test('Scout can afterburn longest (3.2 seconds)', () => {
  const scout = SHIP_ARCHETYPES.scout;
  const sustainTime = scout.maxHeat / scout.afterburnerHeatRate;
  assert(
    sustainTime === 3.2,
    `Scout sustain should be 3.2s, got ${sustainTime}`,
  );
});

test('Bomber has shortest afterburn time (1.45 seconds)', () => {
  const bomber = SHIP_ARCHETYPES.bomber;
  const sustainTime = bomber.maxHeat / bomber.afterburnerHeatRate;
  assert(
    Math.abs(sustainTime - 1.45) < 0.01,
    `Bomber sustain should be ~1.45s, got ${sustainTime}`,
  );
});

test('Striker sustain time balances capacity vs cost', () => {
  const striker = SHIP_ARCHETYPES.striker;
  const sustainTime = striker.maxHeat / striker.afterburnerHeatRate;
  assert(
    sustainTime === 2.5,
    `Striker sustain should be 2.5s, got ${sustainTime}`,
  );
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
