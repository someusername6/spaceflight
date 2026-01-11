/**
 * Link Mode Tests - validates buildLinkModes and getWeaponIndicesForCurrentMode.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildLinkModes,
  createPrimaryWeapons,
  getWeaponIndicesForCurrentMode,
} from '../../../src/components/weapons.ts';

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

describe('Build Link Modes Tests', () => {
  it('Single weapon: no "all" mode', () => {
    const weapons = [mockWeapon('Plasma')];
    const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
    assertArrayEquals(linkModes, ['0'], 'linkModes should be ["0"]');
    assert.ok(defaultLinkMode === 0, 'defaultLinkMode should be 0');
  });

  it('Two same-type weapons: has "all" mode, defaults to "all"', () => {
    const weapons = [mockWeapon('Plasma'), mockWeapon('Plasma')];
    const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
    assertArrayEquals(
      linkModes,
      ['0', '1', 'all'],
      'linkModes should include "all"',
    );
    assert.ok(defaultLinkMode === 2, 'defaultLinkMode should be 2 (all)');
  });

  it('Two different weapons: has "all" mode, defaults to "all"', () => {
    const weapons = [mockWeapon('Plasma'), mockWeapon('Pulse')];
    const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
    assertArrayEquals(
      linkModes,
      ['0', '1', 'all'],
      'linkModes should include "all"',
    );
    assert.ok(defaultLinkMode === 2, 'defaultLinkMode should be 2 (all)');
  });

  it('One regular + one instant beam: no "all" mode', () => {
    const weapons = [mockWeapon('Plasma'), mockWeapon('Nuclear Lance', true)];
    const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
    assertArrayEquals(
      linkModes,
      ['0', '1'],
      'linkModes should NOT include "all"',
    );
    assert.ok(
      defaultLinkMode === 0,
      'defaultLinkMode should be 0 (first non-instant)',
    );
  });

  it('Two instant beams: no "all" mode, defaults to first', () => {
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
    assert.ok(defaultLinkMode === 0, 'defaultLinkMode should be 0');
  });

  it('Mixed loadout with instant beam: "all" excludes instant beam', () => {
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
    assert.ok(defaultLinkMode === 3, 'defaultLinkMode should be 3 (all)');
  });

  it('Instant beam first, then regular: defaults to first non-instant', () => {
    const weapons = [
      mockWeapon('Nuclear Lance', true),
      mockWeapon('Plasma'),
      mockWeapon('Pulse'),
    ];
    const { linkModes, defaultLinkMode } = buildLinkModes(weapons);
    assertArrayEquals(linkModes, ['0', '1', '2', 'all'], 'linkModes correct');
    assert.ok(defaultLinkMode === 3, 'defaultLinkMode should be 3 (all)');
  });
});

// ============================================================
// getWeaponIndicesForCurrentMode Tests
// ============================================================

describe('Get Weapon Indices Tests', () => {
  it('Individual bank mode returns single index', () => {
    const weapons = createPrimaryWeapons(['plasma', 'pulse']);
    weapons.linkMode = 0; // Bank 0
    const indices = getWeaponIndicesForCurrentMode(weapons);
    assertArrayEquals(indices, [0], 'Should return [0] for bank 0');
  });

  it('Individual bank mode returns correct index for bank 1', () => {
    const weapons = createPrimaryWeapons(['plasma', 'pulse']);
    weapons.linkMode = 1; // Bank 1
    const indices = getWeaponIndicesForCurrentMode(weapons);
    assertArrayEquals(indices, [1], 'Should return [1] for bank 1');
  });

  it('"all" mode returns all indices for regular weapons', () => {
    const weapons = createPrimaryWeapons(['plasma', 'pulse']);
    weapons.linkMode = 2; // "all"
    const indices = getWeaponIndicesForCurrentMode(weapons);
    assertArrayEquals(indices, [0, 1], 'Should return [0, 1] for "all"');
  });

  it('"all" mode excludes instant beams', () => {
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

  it('Instant beam can still fire individually', () => {
    const weapons = createPrimaryWeapons(['plasma', 'nuclearLance']);
    weapons.linkMode = 1; // Bank 1 (nuclear lance)
    const indices = getWeaponIndicesForCurrentMode(weapons);
    assertArrayEquals(indices, [1], 'Should return [1] for nuclear lance bank');
  });
});

// ============================================================
// Integration: createPrimaryWeapons uses buildLinkModes correctly
// ============================================================

describe('Integration Tests', () => {
  it('createPrimaryWeapons sets correct default for mixed loadout', () => {
    const weapons = createPrimaryWeapons(['plasma', 'pulse']);
    assert.ok(
      weapons.linkModes[weapons.linkMode] === 'all',
      'Default should be "all" mode',
    );
  });

  it('createPrimaryWeapons sets correct default when instant beam present', () => {
    const weapons = createPrimaryWeapons(['plasma', 'nuclearLance']);
    assert.ok(
      weapons.linkModes[weapons.linkMode] === '0',
      'Default should be bank 0 (plasma)',
    );
  });

  it('createPrimaryWeapons with only instant beams defaults to first', () => {
    const weapons = createPrimaryWeapons(['nuclearLance', 'nuclearLance']);
    assert.ok(weapons.linkMode === 0, 'Default should be 0');
    assert.ok(weapons.linkModes[0] === '0', 'First mode should be "0"');
  });
});
