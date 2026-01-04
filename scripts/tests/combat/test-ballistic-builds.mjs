/**
 * Ballistic Weapon Build Testing - Tests ballistic-specialized loadouts to verify:
 * 1. Autocannon brawler is viable at close range
 * 2. Railgun sniper is viable at long range
 * 3. Flak area denial is viable at mid range
 * 4. All builds are competitive with standard loadouts
 */

import { Quaternion, Vector3 } from 'three';
import { WEAPON_DEFS } from '../../../src/components/weapons.ts';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import { aiSystem } from '../../../src/systems/ai/ai.ts';
import { aimErrorSystem } from '../../../src/systems/aim-error.ts';
import { beamSystem } from '../../../src/systems/beams.ts';
import { cleanupSystem } from '../../../src/systems/cleanup.ts';
import { collisionSystem } from '../../../src/systems/collision.ts';
import { damageSystem } from '../../../src/systems/damage.ts';
import { decoySystem } from '../../../src/systems/decoys.ts';
import { explosionSystem } from '../../../src/systems/explosions.ts';
import { heatSystem } from '../../../src/systems/heat.ts';
import { missileSystem } from '../../../src/systems/missiles.ts';
import { physicsSystem } from '../../../src/systems/physics.ts';
import { projectileSystem } from '../../../src/systems/projectiles.ts';
import { shieldSystem } from '../../../src/systems/shields.ts';
import { targetingSystem } from '../../../src/systems/targeting.ts';
import { weaponSystem } from '../../../src/systems/weapons.ts';

const TICK_RATE = 60;
const TICK_SEC = 1 / TICK_RATE;
const MAX_SIMULATION_TIME = 120;
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;
const RUNS_PER_TEST = 50;

const SYSTEMS = [
  targetingSystem,
  aiSystem,
  aimErrorSystem,
  weaponSystem,
  beamSystem,
  physicsSystem,
  projectileSystem,
  missileSystem,
  decoySystem,
  collisionSystem,
  damageSystem,
  shieldSystem,
  heatSystem,
  cleanupSystem,
  explosionSystem,
];

// Store original archetypes to restore after tests
const originalArchetypes = { ...SHIP_ARCHETYPES };

/**
 * Create a custom archetype variant for testing
 * @param options - { preferredCombatRange?: number } for sniper builds
 */
function createVariant(baseName, primaryWeapons, variantName, options = {}) {
  const base = { ...SHIP_ARCHETYPES[baseName] };
  base.primaryWeapons = primaryWeapons;
  if (options.preferredCombatRange) {
    base.preferredCombatRange = options.preferredCombatRange;
  }
  // Store in SHIP_ARCHETYPES so createAIShip can find it
  SHIP_ARCHETYPES[variantName] = base;
  return variantName;
}

/**
 * Restore original archetypes after tests
 */
function restoreArchetypes() {
  for (const key of Object.keys(SHIP_ARCHETYPES)) {
    if (!originalArchetypes[key]) {
      delete SHIP_ARCHETYPES[key];
    }
  }
}

/**
 * Run a single combat simulation
 */
function runSimulation(archetypeA, archetypeB, startDistance, seed) {
  const world = createWorld(seed);

  world.systemState.combatStats = {
    shotsFired: {},
    damageDealt: {},
    missilesFired: {},
    missilesHit: {},
    missileDamage: {},
    missilesExpired: 0,
    missilesHitOwner: 0,
    missilesSeduced: 0,
    missilesInFlight: 0,
    beamDamage: {},
    decoysLaunched: 0,
    decoysSuccessful: 0,
  };

  const jitter = () => (Math.random() - 0.5) * 20;
  const facingPosZ = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  const facingNegZ = new Quaternion();

  // Alternate spawn order
  const spawnAFirst = Math.random() > 0.5;

  const spawnA = () => {
    createAIShip(
      world,
      archetypeA,
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      facingPosZ,
      'regular',
    );
  };

  const spawnB = () => {
    createAIShip(
      world,
      archetypeB,
      Faction.Enemy,
      new Vector3(jitter(), jitter(), startDistance + jitter()),
      facingNegZ,
      'regular',
    );
  };

  if (spawnAFirst) {
    spawnA();
    spawnB();
  } else {
    spawnB();
    spawnA();
  }

  const metrics = {
    winner: null,
    timeToVictory: 0,
    timeout: false,
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;

    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    let teamACount = 0;
    let teamBCount = 0;

    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Player) teamACount++;
      else if (faction.faction === Faction.Enemy) teamBCount++;
    }

    if (teamACount === 0 && teamBCount === 0) {
      metrics.winner = 'draw';
      metrics.timeToVictory = (tick + 1) / TICK_RATE;
      break;
    }
    if (teamACount === 0) {
      metrics.winner = 'B';
      metrics.timeToVictory = (tick + 1) / TICK_RATE;
      break;
    }
    if (teamBCount === 0) {
      metrics.winner = 'A';
      metrics.timeToVictory = (tick + 1) / TICK_RATE;
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.winner = 'draw';
    metrics.timeToVictory = MAX_SIMULATION_TIME;
  }

  metrics.combatStats = world.systemState.combatStats;
  return metrics;
}

/**
 * Run multiple simulations and return win rate
 */
function runMatchup(
  archetypeA,
  archetypeB,
  startDistance,
  runs = RUNS_PER_TEST,
) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919;
    results.push(runSimulation(archetypeA, archetypeB, startDistance, seed));
  }

  const aWins = results.filter((r) => r.winner === 'A').length;
  const bWins = results.filter((r) => r.winner === 'B').length;
  const draws = results.filter((r) => r.winner === 'draw').length;
  const timeouts = results.filter((r) => r.timeout).length;
  const avgTime = results.reduce((sum, r) => sum + r.timeToVictory, 0) / runs;

  return { aWins, bWins, draws, timeouts, avgTime, runs };
}

/**
 * Calculate DPS for a loadout
 */
function calcLoadoutDPS(primaryWeapons) {
  let total = 0;
  for (const w of primaryWeapons) {
    const def = WEAPON_DEFS[w.name];
    const dps = def.fireRate === 0 ? def.damage : def.damage / def.fireRate;
    total += dps * w.size;
  }
  return total;
}

console.log(
  '======================================================================',
);
console.log('BALLISTIC BUILD TESTING');
console.log(
  '======================================================================\n',
);

// ============================================================
// TEST 1: Updated weapon stats
// ============================================================
console.log('--- TEST 1: UPDATED BALLISTIC STATS ---\n');

const ballisticWeapons = ['autocannon', 'railgun', 'flak'];
console.log('Weapon          | DPS    | Range  | Ammo   | Notes');
console.log('----------------|--------|--------|--------|------------------');
for (const name of ballisticWeapons) {
  const def = WEAPON_DEFS[name];
  const dps = (def.damage / def.fireRate).toFixed(0);
  const notes =
    name === 'autocannon'
      ? '+12.5% dmg (was +25%, too strong)'
      : name === 'railgun'
        ? '+100% dmg, slower fire'
        : name === 'flak'
          ? '+100% dmg, +60% fire rate, +25% radius'
          : '';
  console.log(
    `${name.padEnd(15)} | ${String(dps).padStart(6)} | ${String(def.range).padStart(6)} | ${String(def.ammo).padStart(6)} | ${notes}`,
  );
}

// ============================================================
// TEST 2: Create ballistic variant loadouts
// ============================================================
console.log('\n--- TEST 2: BALLISTIC VARIANT LOADOUTS ---\n');

// Autocannon brawler - Raider base, all autocannons
const autocannonLoadout = [
  { name: 'autocannon', size: 3 },
  { name: 'autocannon', size: 3 },
  { name: 'autocannon', size: 2 },
];
createVariant('raider', autocannonLoadout, 'raider-autocannon');

// Railgun sniper - Striker base, dual railguns + backup plasma
// preferredCombatRange = 1200m to enable kiting/sniping behavior
const railgunLoadout = [
  { name: 'railgun', size: 2 },
  { name: 'railgun', size: 2 },
  { name: 'plasma', size: 1 },
];
createVariant('striker', railgunLoadout, 'striker-railgun', {
  preferredCombatRange: 1200,
});

// Flak area denial - Defender base, dual flak + beam
const flakLoadout = [
  { name: 'flak', size: 2 },
  { name: 'flak', size: 2 },
  { name: 'greenLaser', size: 1 },
];
createVariant('defender', flakLoadout, 'defender-flak');

// Mixed ballistic - Interceptor base
const mixedLoadout = [
  { name: 'autocannon', size: 2 },
  { name: 'railgun', size: 1 },
  { name: 'plasma', size: 1 },
];
createVariant('interceptor', mixedLoadout, 'interceptor-ballistic');

const variants = [
  {
    name: 'raider-autocannon',
    loadout: autocannonLoadout,
    base: 'raider',
    range: 'close',
  },
  {
    name: 'striker-railgun',
    loadout: railgunLoadout,
    base: 'striker',
    range: 'long',
  },
  {
    name: 'defender-flak',
    loadout: flakLoadout,
    base: 'defender',
    range: 'mid',
  },
  {
    name: 'interceptor-ballistic',
    loadout: mixedLoadout,
    base: 'interceptor',
    range: 'mid',
  },
];

console.log('Created variants:');
for (const v of variants) {
  const dps = calcLoadoutDPS(v.loadout).toFixed(0);
  const baseDps = calcLoadoutDPS(
    SHIP_ARCHETYPES[v.base].primaryWeapons,
  ).toFixed(0);
  console.log(
    `  ${v.name}: ${dps} DPS (base ${v.base}: ${baseDps} DPS) - ${v.range} range`,
  );
}

// ============================================================
// TEST 3: Tournament - all variants vs all standards
// ============================================================
console.log('\n--- TEST 3: VARIANT TOURNAMENT ---\n');
console.log('Each variant vs all standard archetypes at optimal range\n');

const standardArchetypes = [
  'scout',
  'interceptor',
  'striker',
  'defender',
  'bomber',
  'raider',
  'sentinel',
];

// Optimal ranges for each variant
const variantRanges = {
  'raider-autocannon': 300,
  'striker-railgun': 1500,
  'defender-flak': 600,
  'interceptor-ballistic': 500,
};

const tournamentResults = {};

for (const variant of variants) {
  tournamentResults[variant.name] = { wins: 0, losses: 0, total: 0 };

  for (const std of standardArchetypes) {
    const range = variantRanges[variant.name];
    const result = runMatchup(variant.name, std, range);
    tournamentResults[variant.name].total++;
    if (result.aWins > result.bWins) {
      tournamentResults[variant.name].wins++;
    } else if (result.bWins > result.aWins) {
      tournamentResults[variant.name].losses++;
    }
  }
}

console.log('Variant                | Wins | Losses | Win%');
console.log('-----------------------|------|--------|------');
for (const variant of variants) {
  const r = tournamentResults[variant.name];
  const winPct = ((r.wins / r.total) * 100).toFixed(0);
  console.log(
    `${variant.name.padEnd(22)} | ${String(r.wins).padStart(4)} | ${String(r.losses).padStart(6)} | ${winPct.padStart(4)}%`,
  );
}

restoreArchetypes();
console.log('\nBALLISTIC BUILD TESTING COMPLETE');
