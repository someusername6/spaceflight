/**
 * Shared missile fixtures for AI safe distance tests.
 */

/**
 * Create a test nuke missile with configurable properties.
 */
export function createTestNuke(overrides = {}) {
  return {
    name: 'Nuke',
    requiresLock: true,
    count: 2,
    range: 2000,
    speed: 300,
    turnRate: 45,
    damage: 500,
    fireRate: 2,
    lockSpeed: 0.5,
    lockConeAngle: 30,
    bankSize: 1,
    maxCount: 2,
    aoeRadius: 100,
    isNuke: true,
    ...overrides,
  };
}

/**
 * Create a test seeker missile (non-AoE).
 */
export function createTestSeeker(overrides = {}) {
  return {
    name: 'Seeker',
    requiresLock: true,
    count: 5,
    range: 2000,
    speed: 400,
    turnRate: 90,
    damage: 60,
    fireRate: 0.5,
    lockSpeed: 1,
    lockConeAngle: 30,
    bankSize: 1,
    maxCount: 8,
    ...overrides,
  };
}

/**
 * Create a test dumbfire rocket.
 */
export function createTestRocket(overrides = {}) {
  return {
    name: 'Rocket',
    requiresLock: false,
    count: 5,
    range: 1000,
    speed: 600,
    turnRate: 0,
    damage: 50,
    fireRate: 0.5,
    lockSpeed: 0,
    lockConeAngle: 30,
    bankSize: 1,
    maxCount: 8,
    ...overrides,
  };
}

/**
 * Create a test secondary weapons component.
 */
export function createTestSecondaryWeapons(missiles, overrides = {}) {
  return {
    type: 'secondaryWeapons',
    weapons: missiles,
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: undefined,
    lockProgress: 1, // Locked by default
    lockWeaponIndex: 0,
    ...overrides,
  };
}
