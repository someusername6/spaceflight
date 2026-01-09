/**
 * Tests for single ship resupply operations.
 */

import assert from 'node:assert';
import { resupplyShipConstrained } from '../../../src/campaign/resupply-constrained.ts';
import { getMaxAmmoCapacity } from '../../../src/campaign/store-ammo.ts';

/** Create a test campaign state */
function createTestState(options = {}) {
  const {
    currentAmmo = 50,
    missileCount = 4,
    maxMissiles = 4,
    storedAmmo = 0,
    storeStockAmmo = 1000,
    credits = 1000,
  } = options;

  return {
    commanderId: 'commander1',
    credits,
    ships: [
      {
        id: 'ship1',
        shipClass: 'firefly',
        primaryWeapons: [
          { weaponType: 'autocannon', bankSize: 1, currentAmmo },
        ],
        secondaryWeapons: [
          {
            weaponType: 'heatseeking',
            bankSize: 1,
            count: missileCount,
            maxCount: maxMissiles,
          },
        ],
        pilot: { id: 'commander1', name: 'Commander' },
        hullDamage: 0,
        isPlayerShip: true,
      },
    ],
    pilots: [{ id: 'commander1', name: 'Commander' }],
    storedShips: [],
    storedWeapons: [],
    storedAmmo:
      storedAmmo > 0 ? [{ weaponType: 'autocannon', count: storedAmmo }] : [],
    storeStock: {
      ships: {},
      primaries: {},
      secondaries: { heatseeking: 100 },
      ammo: { autocannon: storeStockAmmo },
    },
    availableRecruits: [],
    currentSector: 1,
    completedContracts: [],
    missionCount: 0,
  };
}

console.log('=== Resupply Ship Tests ===\n');

// Test: resupplyShipConstrained uses storage first
console.log('Testing resupplyShipConstrained storage priority...');
{
  const maxAmmo = getMaxAmmoCapacity('autocannon', 1);
  const currentAmmo = 50;
  const storedAmmo = 100;

  const state = createTestState({
    currentAmmo,
    storedAmmo,
    storeStockAmmo: 1000,
  });
  const result = resupplyShipConstrained(state, 'ship1');

  assert.strictEqual(result.success, true, 'Resupply succeeded');
  assert.strictEqual(
    result.fromStorage.ammo.get('autocannon'),
    storedAmmo,
    'Used all storage',
  );
  assert.strictEqual(
    result.bought.ammo.get('autocannon'),
    50,
    'Bought remaining from store',
  );

  const ship = result.state.ships.find((s) => s.id === 'ship1');
  assert.strictEqual(
    ship.primaryWeapons[0].currentAmmo,
    maxAmmo,
    'Ship ammo is full',
  );
  assert.strictEqual(result.state.storedAmmo.length, 0, 'Storage is empty');

  console.log('  - Storage priority: PASS');
  console.log('  - Storage consumed: PASS');
  console.log('  - Remaining bought from store: PASS');
}

// Test: resupplyShipConstrained respects credit limit
console.log('\nTesting resupplyShipConstrained credit limit...');
{
  const state = createTestState({
    currentAmmo: 0,
    storedAmmo: 0,
    storeStockAmmo: 1000,
    credits: 5,
  });
  const result = resupplyShipConstrained(state, 'ship1');

  assert.strictEqual(
    result.success,
    false,
    'Resupply incomplete due to credits',
  );
  assert.ok(result.shortages.ammo.size > 0, 'Has shortages');
  assert.ok(result.creditsSpent <= 5, 'Did not spend more than available');

  console.log('  - Credit limit respected: PASS');
  console.log('  - Shortages reported: PASS');
}

// Test: resupplyShipConstrained respects store stock
console.log('\nTesting resupplyShipConstrained store stock limit...');
{
  const state = createTestState({
    currentAmmo: 0,
    storedAmmo: 0,
    storeStockAmmo: 50,
    credits: 10000,
  });
  const result = resupplyShipConstrained(state, 'ship1');

  assert.strictEqual(result.success, false, 'Resupply incomplete due to stock');
  assert.strictEqual(
    result.bought.ammo.get('autocannon'),
    50,
    'Bought all available stock',
  );
  assert.ok(result.shortages.ammo.get('autocannon') > 0, 'Has ammo shortage');
  assert.strictEqual(
    result.state.storeStock.ammo.autocannon,
    0,
    'Store stock depleted',
  );

  console.log('  - Store stock limit: PASS');
  console.log('  - Stock depleted: PASS');
}

// Test: resupplyShipConstrained uses stored missiles first
console.log('\nTesting resupplyShipConstrained missile storage priority...');
{
  const state = {
    commanderId: 'commander1',
    credits: 1000,
    ships: [
      {
        id: 'ship1',
        shipClass: 'firefly',
        primaryWeapons: [{ weaponType: 'plasma', bankSize: 1 }],
        secondaryWeapons: [
          { weaponType: 'heatseeking', bankSize: 1, count: 2, maxCount: 4 },
        ],
        pilot: { id: 'commander1', name: 'Commander' },
        hullDamage: 0,
      },
    ],
    pilots: [{ id: 'commander1', name: 'Commander' }],
    storedShips: [],
    storedWeapons: [
      { weaponType: 'heatseeking', category: 'secondary', count: 2 },
    ],
    storedAmmo: [],
    storeStock: {
      ships: {},
      primaries: {},
      secondaries: { heatseeking: 100 },
      ammo: {},
    },
    availableRecruits: [],
    currentSector: 1,
  };

  const result = resupplyShipConstrained(state, 'ship1');

  assert.strictEqual(result.success, true, 'Resupply succeeded');
  assert.strictEqual(
    result.fromStorage.missiles.get('heatseeking'),
    2,
    'Used missiles from storage',
  );
  assert.strictEqual(
    result.bought.missiles.get('heatseeking') ?? 0,
    0,
    'Did not buy missiles',
  );
  assert.strictEqual(result.creditsSpent, 0, 'No credits spent');

  const ship = result.state.ships.find((s) => s.id === 'ship1');
  assert.strictEqual(
    ship.secondaryWeapons[0].count,
    4,
    'Ship missiles are full',
  );

  const storedMissiles = result.state.storedWeapons.find(
    (w) => w.weaponType === 'heatseeking' && w.category === 'secondary',
  );
  assert.strictEqual(storedMissiles, undefined, 'Missile storage is empty');

  console.log('  - Missile storage priority: PASS');
  console.log('  - Missiles consumed from storage: PASS');
  console.log('  - No credits spent: PASS');
}

// Test: resupplyShipConstrained message generation
console.log('\nTesting message generation...');
{
  const state = createTestState({
    currentAmmo: 100,
    storedAmmo: 50,
    storeStockAmmo: 1000,
  });
  const result = resupplyShipConstrained(state, 'ship1');

  assert.ok(Array.isArray(result.messages), 'messages is an array');
  const allMessages = result.messages.join(' ');
  assert.ok(allMessages.includes('storage'), 'Message mentions storage');
  assert.ok(allMessages.includes('Bought'), 'Message mentions purchase');
  assert.ok(result.messages.length >= 2, 'Separate messages per item');
  assert.ok(
    result.messages.some((m) => m.includes('autocannon')),
    'Has message for autocannon',
  );

  console.log('  - Messages array format: PASS');
  console.log('  - Message includes storage info: PASS');
  console.log('  - Message includes purchase info: PASS');
  console.log('  - One message per item type: PASS');
}

// Test: shortageReason in messages
console.log('\nTesting shortageReason in resupply messages...');
{
  const creditShortageState = createTestState({
    currentAmmo: 0,
    storedAmmo: 0,
    storeStockAmmo: 1000,
    credits: 1,
  });
  const creditResult = resupplyShipConstrained(creditShortageState, 'ship1');

  assert.strictEqual(
    creditResult.shortageReason,
    'credits',
    'Reason is credits',
  );
  const creditMessages = creditResult.messages.join(' ');
  assert.ok(
    creditMessages.includes('insufficient credits'),
    'Message mentions credits',
  );

  const stockShortageState = createTestState({
    currentAmmo: 0,
    storedAmmo: 0,
    storeStockAmmo: 10,
    credits: 10000,
  });
  const stockResult = resupplyShipConstrained(stockShortageState, 'ship1');

  assert.strictEqual(stockResult.shortageReason, 'stock', 'Reason is stock');
  const stockMessages = stockResult.messages.join(' ');
  assert.ok(stockMessages.includes('out of stock'), 'Message mentions stock');

  console.log('  - Credit shortage reason: PASS');
  console.log('  - Stock shortage reason: PASS');
}

console.log('\n=== All Resupply Ship Tests Passed ===');
