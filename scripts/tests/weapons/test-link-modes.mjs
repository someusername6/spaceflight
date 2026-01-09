/**
 * Link Mode Tests - validates buildLinkModes and getWeaponIndicesForCurrentMode.
 */

import {
  buildLinkModes,
  createPrimaryWeapons,
  getWeaponIndicesForCurrentMode,
} from '../../../src/components/weapons.ts';

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

function assertArrayEquals(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: expected ${expectedStr}, got ${actualStr}`);
  }
}

// Helper to create mock weapons for testing
function mockWeapon(name, isInstantBeam = false) {
  return {
    name,
    category: 'energy',
    heatPerShot: 5,
    projectileSpeed: 600,
    fireRate: 0.1,
    range: 500,
    damage: 10,
    bankSize: 1,
    isInstantBeam,
  };
}

// ============================================================
// buildLinkModes Tests
// ============================================================

console.log('\n=== BUILD LINK MODES TESTS ===\n');

test('Single weapon: no "all" mode', () => {
  const weapons = [mockWeapon('Plasma')];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(linkModes, ['0'], 'linkModes should be ["0"]');
  assert(defaultLinkMode === 0, 'defaultLinkMode should be 0');
});

test('Two same-type weapons: has "all" mode, defaults to "all"', () => {
  const weapons = [mockWeapon('Plasma'), mockWeapon('Plasma')];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(
    linkModes,
    ['0', '1', 'all'],
    'linkModes should include "all"',
  );
  assert(defaultLinkMode === 2, 'defaultLinkMode should be 2 (all)');
});

test('Two different weapons: has "all" mode, defaults to "all"', () => {
  const weapons = [mockWeapon('Plasma'), mockWeapon('Pulse')];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(
    linkModes,
    ['0', '1', 'all'],
    'linkModes should include "all"',
  );
  assert(defaultLinkMode === 2, 'defaultLinkMode should be 2 (all)');
});

test('One regular + one instant beam: no "all" mode', () => {
  const weapons = [mockWeapon('Plasma'), mockWeapon('Nuclear Lance', true)];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(
    linkModes,
    ['0', '1'],
    'linkModes should NOT include "all"',
  );
  assert(
    defaultLinkMode === 0,
    'defaultLinkMode should be 0 (first non-instant)',
  );
});

test('Two instant beams: no "all" mode, defaults to first', () => {
  const weapons = [
    mockWeapon('Nuclear Lance', true),
    mockWeapon('Nuclear Lance', true),
  ];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(
    linkModes,
    ['0', '1'],
    'linkModes should NOT include "all"',
  );
  assert(defaultLinkMode === 0, 'defaultLinkMode should be 0');
});

test('Mixed loadout with instant beam: "all" excludes instant beam', () => {
  const weapons = [
    mockWeapon('Plasma'),
    mockWeapon('Pulse'),
    mockWeapon('Nuclear Lance', true),
  ];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(
    linkModes,
    ['0', '1', '2', 'all'],
    'linkModes should include all banks and "all"',
  );
  assert(defaultLinkMode === 3, 'defaultLinkMode should be 3 (all)');
});

test('Instant beam first, then regular: defaults to first non-instant', () => {
  const weapons = [
    mockWeapon('Nuclear Lance', true),
    mockWeapon('Plasma'),
    mockWeapon('Pulse'),
  ];
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
  assertArrayEquals(linkModes, ['0', '1', '2', 'all'], 'linkModes correct');
  assert(defaultLinkMode === 3, 'defaultLinkMode should be 3 (all)');
});

// ============================================================
// getWeaponIndicesForCurrentMode Tests
// ============================================================

console.log('\n=== GET WEAPON INDICES TESTS ===\n');

test('Individual bank mode returns single index', () => {
  const weapons = createPrimaryWeapons(['plasma', 'pulse']);
  weapons.linkMode = 0; // Bank 0
  const indices = getWeaponIndicesForCurrentMode(weapons);
  assertArrayEquals(indices, [0], 'Should return [0] for bank 0');
});

test('Individual bank mode returns correct index for bank 1', () => {
  const weapons = createPrimaryWeapons(['plasma', 'pulse']);
  weapons.linkMode = 1; // Bank 1
  const indices = getWeaponIndicesForCurrentMode(weapons);
  assertArrayEquals(indices, [1], 'Should return [1] for bank 1');
});

test('"all" mode returns all indices for regular weapons', () => {
  const weapons = createPrimaryWeapons(['plasma', 'pulse']);
  weapons.linkMode = 2; // "all"
  const indices = getWeaponIndicesForCurrentMode(weapons);
  assertArrayEquals(indices, [0, 1], 'Should return [0, 1] for "all"');
});

test('"all" mode excludes instant beams', () => {
  const weapons = createPrimaryWeapons(['plasma', 'pulse', 'nuclearLance']);
  // Find the "all" mode index
  const allIndex = weapons.linkModes.indexOf('all');
  weapons.linkMode = allIndex;
  const indices = getWeaponIndicesForCurrentMode(weapons);
  assertArrayEquals(
    indices,
    [0, 1],
    'Should return [0, 1] excluding nuclear lance at index 2',
  );
});

test('Instant beam can still fire individually', () => {
  const weapons = createPrimaryWeapons(['plasma', 'nuclearLance']);
  weapons.linkMode = 1; // Bank 1 (nuclear lance)
  const indices = getWeaponIndicesForCurrentMode(weapons);
  assertArrayEquals(indices, [1], 'Should return [1] for nuclear lance bank');
});

// ============================================================
// Integration: createPrimaryWeapons uses buildLinkModes correctly
// ============================================================

console.log('\n=== INTEGRATION TESTS ===\n');

test('createPrimaryWeapons sets correct default for mixed loadout', () => {
  const weapons = createPrimaryWeapons(['plasma', 'pulse']);
  assert(
    weapons.linkModes[weapons.linkMode] === 'all',
    'Default should be "all" mode',
  );
});

test('createPrimaryWeapons sets correct default when instant beam present', () => {
  const weapons = createPrimaryWeapons(['plasma', 'nuclearLance']);
  assert(
    weapons.linkModes[weapons.linkMode] === '0',
    'Default should be bank 0 (plasma)',
  );
});

test('createPrimaryWeapons with only instant beams defaults to first', () => {
  const weapons = createPrimaryWeapons(['nuclearLance', 'nuclearLance']);
  assert(weapons.linkMode === 0, 'Default should be 0');
  assert(weapons.linkModes[0] === '0', 'First mode should be "0"');
});

// ============================================================
// Summary
// ============================================================

console.log(`\nTests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
