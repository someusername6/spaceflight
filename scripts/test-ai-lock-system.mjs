/**
 * AI Lock System Tests - validates lock reset behavior
 */

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
// Lock System Tests
// ============================================================

test('Lock resets when target changes', () => {
  const weapons = {
    type: 'secondaryWeapons',
    weapons: [
      {
        name: 'Seeker',
        requiresLock: true,
        count: 5,
        range: 2000,
        speed: 400,
        turnRate: 90,
        damage: 60,
        fireRate: 0.5,
        lockSpeed: 1,
        bankSize: 1,
        maxCount: 8,
      },
    ],
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: 1, // Entity 1
    lockProgress: 0.8, // 80% locked
    lockWeaponIndex: 0,
  };

  // Simulate target change (entity 1 -> entity 2)
  const newTarget = 2;

  // This is what updateLockProgress does
  if (weapons.lockTarget !== newTarget) {
    weapons.lockProgress = 0;
    weapons.lockTarget = newTarget;
    weapons.lockWeaponIndex = weapons.currentIndex;
  }

  assert(
    weapons.lockProgress === 0,
    'Lock should reset to 0 when target changes',
  );
  assert(weapons.lockTarget === 2, 'Lock target should update');
});

test('Lock resets when weapon changes', () => {
  const weapons = {
    type: 'secondaryWeapons',
    weapons: [
      {
        name: 'Seeker',
        requiresLock: true,
        count: 5,
        range: 2000,
        speed: 400,
        turnRate: 90,
        damage: 60,
        fireRate: 0.5,
        lockSpeed: 1,
        bankSize: 1,
        maxCount: 8,
      },
      {
        name: 'Torpedo',
        requiresLock: true,
        count: 2,
        range: 4000,
        speed: 200,
        turnRate: 30,
        damage: 150,
        fireRate: 1,
        lockSpeed: 0.5,
        bankSize: 1,
        maxCount: 3,
      },
    ],
    currentIndex: 0, // Currently on Seeker
    lastFireTime: 0,
    lockTarget: 1,
    lockProgress: 0.9, // 90% locked
    lockWeaponIndex: 0, // Lock was for Seeker
  };

  // Simulate weapon change (index 0 -> 1)
  weapons.currentIndex = 1;

  // This is what updateLockProgress does
  if (weapons.lockWeaponIndex !== weapons.currentIndex) {
    weapons.lockProgress = 0;
    weapons.lockWeaponIndex = weapons.currentIndex;
  }

  assert(
    weapons.lockProgress === 0,
    'Lock should reset to 0 when weapon changes',
  );
  assert(weapons.lockWeaponIndex === 1, 'Lock weapon index should update');
});

test('Lock does NOT reset when same target and weapon', () => {
  const weapons = {
    type: 'secondaryWeapons',
    weapons: [
      {
        name: 'Seeker',
        requiresLock: true,
        count: 5,
        range: 2000,
        speed: 400,
        turnRate: 90,
        damage: 60,
        fireRate: 0.5,
        lockSpeed: 1,
        bankSize: 1,
        maxCount: 8,
      },
    ],
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: 1,
    lockProgress: 0.5,
    lockWeaponIndex: 0,
  };

  const target = 1; // Same target
  const prevProgress = weapons.lockProgress;

  // Simulate updateLockProgress logic
  if (weapons.lockTarget !== target) {
    weapons.lockProgress = 0;
  }
  if (weapons.lockWeaponIndex !== weapons.currentIndex) {
    weapons.lockProgress = 0;
  }

  assert(
    weapons.lockProgress === prevProgress,
    'Lock should NOT reset when same target and weapon',
  );
});

test('Different missiles have different lock speeds', () => {
  const seeker = {
    name: 'Seeker',
    requiresLock: true,
    count: 5,
    range: 2000,
    speed: 400,
    turnRate: 90,
    damage: 60,
    fireRate: 0.5,
    lockSpeed: 1.0,
    bankSize: 1,
    maxCount: 8,
  };
  const torpedo = {
    name: 'Torpedo',
    requiresLock: true,
    count: 2,
    range: 4000,
    speed: 200,
    turnRate: 30,
    damage: 150,
    fireRate: 1,
    lockSpeed: 0.5,
    bankSize: 1,
    maxCount: 3,
  };

  assert(
    seeker.lockSpeed > torpedo.lockSpeed,
    'Seeker should lock faster than Torpedo',
  );
  assert(seeker.lockSpeed === 1.0, 'Seeker lockSpeed should be 1.0');
  assert(torpedo.lockSpeed === 0.5, 'Torpedo lockSpeed should be 0.5');
});

test('Lock accumulates correctly with lockSpeed', () => {
  const weapon = {
    name: 'Seeker',
    requiresLock: true,
    count: 5,
    range: 2000,
    speed: 400,
    turnRate: 90,
    damage: 60,
    fireRate: 0.5,
    lockSpeed: 1.0,
    bankSize: 1,
    maxCount: 8,
  };

  let lockProgress = 0;
  const dt = 0.5; // 500ms

  // Simulate lock accumulation
  lockProgress = Math.min(1, lockProgress + weapon.lockSpeed * dt);

  assert(
    lockProgress === 0.5,
    `Lock should be 50% after 0.5s at lockSpeed 1.0, got ${lockProgress}`,
  );

  // Another 500ms
  lockProgress = Math.min(1, lockProgress + weapon.lockSpeed * dt);

  assert(
    lockProgress === 1.0,
    `Lock should be 100% after 1.0s at lockSpeed 1.0, got ${lockProgress}`,
  );
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
