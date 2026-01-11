/**
 * Tests for store ammo functions - capacity limits and bank size scaling.
 */

import assert from 'node:assert';
import { createSlotArray, getSlot } from '../../../src/campaign/slot-array.ts';
import {
  buyAmmo,
  getMaxAmmoCapacity,
  loadAmmoToWeapon,
  sellAmmo,
  unloadAmmoFromWeapon,
} from '../../../src/campaign/store/store-ammo.ts';
import { getAmmoPrice } from '../../../src/data/prices.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';

/** Create a test campaign state with a ship that has a ballistic weapon */
function createTestState(
  weaponType = 'autocannon',
  bankSize = 1,
  currentAmmo = 0,
) {
  return {
    seed: 12345,
    nextId: 100,
    credits: 1000,
    commanderId: 'commander1',
    ships: [
      {
        id: 'ship1',
        shipClass: 'interceptor',
        primaryWeapons: createSlotArray([
          { weaponType, bankSize, currentAmmo },
        ]),
        secondaryWeapons: createSlotArray([]),
        pilot: null,
        hullDamage: 0,
        isPlayerShip: true,
      },
    ],
    pilots: [],
    storedShips: [],
    storedWeapons: [],
    storedAmmo: [],
    storeStock: {
      ships: {},
      primaries: {},
      secondaries: {},
      ammo: { autocannon: 10000, railgun: 10000, flak: 10000 },
    },
    currentSector: 1,
    completedContracts: [],
    missionCount: 0,
  };
}

console.log('=== Store Ammo Tests ===\n');

// Test: getMaxAmmoCapacity scales with bank size
console.log('Testing getMaxAmmoCapacity...');
{
  const autocannonBase = PRIMARY_WEAPONS.autocannon.ammo;

  assert.strictEqual(
    getMaxAmmoCapacity('autocannon', 1),
    autocannonBase * 1,
    'Bank size 1',
  );
  assert.strictEqual(
    getMaxAmmoCapacity('autocannon', 2),
    autocannonBase * 2,
    'Bank size 2',
  );
  assert.strictEqual(
    getMaxAmmoCapacity('autocannon', 3),
    autocannonBase * 3,
    'Bank size 3',
  );

  const railgunBase = PRIMARY_WEAPONS.railgun.ammo;
  assert.strictEqual(
    getMaxAmmoCapacity('railgun', 1),
    railgunBase * 1,
    'Railgun bank 1',
  );
  assert.strictEqual(
    getMaxAmmoCapacity('railgun', 2),
    railgunBase * 2,
    'Railgun bank 2',
  );

  // Energy weapons have no ammo
  assert.strictEqual(getMaxAmmoCapacity('plasma', 1), 0, 'Plasma has no ammo');
  assert.strictEqual(getMaxAmmoCapacity('pulse', 1), 0, 'Pulse has no ammo');

  console.log('  - Bank size scaling: PASS');
  console.log('  - Energy weapons return 0: PASS');
}

// Test: buyAmmo adds to storage
console.log('\nTesting buyAmmo...');
{
  let state = createTestState();
  const amountToBuy = 50;
  state = buyAmmo(state, 'autocannon', amountToBuy);

  const pricePerRound = getAmmoPrice('autocannon', 'buy');
  const expectedCost = amountToBuy * pricePerRound;
  assert.strictEqual(
    state.credits,
    1000 - expectedCost,
    `Credits deducted (${pricePerRound} credit/round)`,
  );
  assert.strictEqual(state.storedAmmo.length, 1, 'Ammo added to storage');
  assert.strictEqual(
    state.storedAmmo[0].weaponType,
    'autocannon',
    'Correct weapon type',
  );
  assert.strictEqual(state.storedAmmo[0].count, 50, 'Correct count');

  // Buy more - should stack
  state = buyAmmo(state, 'autocannon', 30);
  assert.strictEqual(state.storedAmmo.length, 1, 'Still one stack');
  assert.strictEqual(state.storedAmmo[0].count, 80, 'Stacked count');

  console.log('  - Basic buy: PASS');
  console.log('  - Stacking: PASS');
}

// Test: buyAmmo fails when can't afford
console.log('\nTesting buyAmmo insufficient credits...');
{
  let state = createTestState();
  state.credits = 10;
  const before = state;
  const railgunPrice = getAmmoPrice('railgun', 'buy');
  // Try to buy 10 slugs - should fail if cost exceeds 10 credits
  state = buyAmmo(state, 'railgun', 10);

  assert.strictEqual(
    state,
    before,
    `State unchanged when can't afford (10 * ${railgunPrice} = ${10 * railgunPrice} credits needed)`,
  );

  console.log('  - Insufficient credits check: PASS');
}

// Test: loadAmmoToWeapon respects max capacity
console.log('\nTesting loadAmmoToWeapon capacity limits...');
{
  const maxCap = PRIMARY_WEAPONS.autocannon.ammo; // 200 for bank size 1

  let state = createTestState('autocannon', 1, 0);
  state.storedAmmo = [{ weaponType: 'autocannon', count: 500 }];

  // Try to load more than capacity
  state = loadAmmoToWeapon(state, 'ship1', 0, 500);

  const weapon = getSlot(state.ships[0].primaryWeapons, 0);
  assert.strictEqual(
    weapon.currentAmmo,
    maxCap,
    `Capped at max capacity (${maxCap})`,
  );
  assert.strictEqual(
    state.storedAmmo[0].count,
    500 - maxCap,
    'Remaining in storage',
  );

  console.log(`  - Capacity limit (${maxCap}): PASS`);
}

// Test: loadAmmoToWeapon with bank size 2
console.log('\nTesting loadAmmoToWeapon with bank size 2...');
{
  const baseAmmo = PRIMARY_WEAPONS.autocannon.ammo;
  const maxCap = baseAmmo * 2; // Double for bank size 2

  let state = createTestState('autocannon', 2, 0);
  state.storedAmmo = [{ weaponType: 'autocannon', count: 1000 }];

  state = loadAmmoToWeapon(state, 'ship1', 0, 1000);

  const weapon = getSlot(state.ships[0].primaryWeapons, 0);
  assert.strictEqual(
    weapon.currentAmmo,
    maxCap,
    `Capped at bank size 2 capacity (${maxCap})`,
  );

  console.log(`  - Bank size 2 capacity (${maxCap}): PASS`);
}

// Test: loadAmmoToWeapon when already at capacity
console.log('\nTesting loadAmmoToWeapon when full...');
{
  const maxCap = PRIMARY_WEAPONS.autocannon.ammo;

  let state = createTestState('autocannon', 1, maxCap); // Already full
  state.storedAmmo = [{ weaponType: 'autocannon', count: 100 }];

  const before = state;
  state = loadAmmoToWeapon(state, 'ship1', 0, 50);

  assert.strictEqual(state, before, 'State unchanged when weapon full');

  console.log('  - Already full check: PASS');
}

// Test: loadAmmoToWeapon partial fill
console.log('\nTesting loadAmmoToWeapon partial fill...');
{
  const maxCap = PRIMARY_WEAPONS.autocannon.ammo;
  const startAmmo = maxCap - 50; // 50 slots available

  let state = createTestState('autocannon', 1, startAmmo);
  state.storedAmmo = [{ weaponType: 'autocannon', count: 100 }];

  state = loadAmmoToWeapon(state, 'ship1', 0, 100);

  const weapon = getSlot(state.ships[0].primaryWeapons, 0);
  assert.strictEqual(weapon.currentAmmo, maxCap, 'Filled to capacity');
  assert.strictEqual(state.storedAmmo[0].count, 50, 'Only took what fits');

  console.log('  - Partial fill: PASS');
}

// Test: unloadAmmoFromWeapon
console.log('\nTesting unloadAmmoFromWeapon...');
{
  let state = createTestState('autocannon', 1, 100);

  state = unloadAmmoFromWeapon(state, 'ship1', 0, 30);

  const weapon = getSlot(state.ships[0].primaryWeapons, 0);
  assert.strictEqual(weapon.currentAmmo, 70, 'Ammo reduced');
  assert.strictEqual(state.storedAmmo.length, 1, 'Ammo added to storage');
  assert.strictEqual(
    state.storedAmmo[0].count,
    30,
    'Correct amount in storage',
  );

  console.log('  - Basic unload: PASS');
}

// Test: sellAmmo
console.log('\nTesting sellAmmo...');
{
  let state = createTestState();
  state.storedAmmo = [{ weaponType: 'railgun', count: 10 }];
  state.credits = 0;

  const amountToSell = 5;
  state = sellAmmo(state, 'railgun', amountToSell);

  const sellPrice = getAmmoPrice('railgun', 'sell');
  const expectedGain = amountToSell * sellPrice;
  assert.strictEqual(
    state.credits,
    expectedGain,
    `Credits gained (${sellPrice} credits/round sell price)`,
  );
  assert.strictEqual(state.storedAmmo[0].count, 5, 'Ammo reduced');

  console.log('  - Sell ammo: PASS');
}

// Missile capacity is tested separately in loadout tests
console.log('\nMissile capacity scaling: N/A (tested in loadout)');

console.log('\n=== All Store Ammo Tests Passed ===');
