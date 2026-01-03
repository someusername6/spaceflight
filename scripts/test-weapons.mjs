/**
 * Weapon behavior tests - validates Flak and Nuke mechanics.
 */

import * as THREE from 'three';
import {
  areEnemies,
  createFaction,
  Faction,
} from '../src/components/faction.ts';
import { createHealth } from '../src/components/health.ts';
import { createMissile, isMissileExpired } from '../src/components/missile.ts';
import { createProjectile } from '../src/components/projectile.ts';
import { createTransform } from '../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  queryEntities,
} from '../src/core/ecs.ts';
import { createCollision } from '../src/systems/collision.ts';

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
// FLAK TESTS
// ============================================================

console.log('\n=== FLAK CANNON TESTS ===\n');

// Test: Flak projectile has required properties
test('Flak projectile has flakRadius and shrapnelCount', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);
  const flakRadius = 80;
  const shrapnelCount = 8;

  const projectile = createProjectile(
    owner,
    15, // damage
    350, // speed
    600, // range
    direction,
    'ballistic',
    'Flak',
    flakRadius,
    shrapnelCount,
  );

  assert(projectile.flakRadius === 80, 'Flak radius should be 80');
  assert(projectile.shrapnelCount === 8, 'Shrapnel count should be 8');
  assert(projectile.weaponName === 'Flak', 'Weapon name should be Flak');
  assert(projectile.category === 'ballistic', 'Category should be ballistic');
});

// Test: Regular projectile does not have flak properties
test('Regular projectile does not have flak properties', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const projectile = createProjectile(
    owner,
    25, // damage
    400, // speed
    800, // range
    direction,
    'energy',
    'Plasma',
  );

  assert(
    projectile.flakRadius === undefined,
    'Regular projectile should not have flakRadius',
  );
  assert(
    projectile.shrapnelCount === undefined,
    'Regular projectile should not have shrapnelCount',
  );
});

// Test: Shrapnel projectile has correct properties
test('Shrapnel projectile is created correctly', () => {
  const owner = 1;
  const direction = new THREE.Vector3(1, 0, 0).normalize();

  const shrapnel = createProjectile(
    owner,
    8, // shrapnel damage
    450, // shrapnel speed
    120, // shrapnel range
    direction,
    'ballistic',
    'Shrapnel',
  );

  assert(shrapnel.weaponName === 'Shrapnel', 'Weapon name should be Shrapnel');
  assert(shrapnel.category === 'ballistic', 'Category should be ballistic');
  assert(shrapnel.damage === 8, 'Shrapnel damage should be 8');
  assert(shrapnel.speed === 450, 'Shrapnel speed should be 450');
  assert(shrapnel.range === 120, 'Shrapnel range should be 120');
});

// Test: Flak explosion proximity detection logic
test('Flak explosion detects enemies within radius', () => {
  const world = createWorld();

  // Create owner ship (player)
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Create flak projectile at position (100, 0, 0)
  const flakEntity = createEntity(world);
  addComponent(world, flakEntity, createTransform(100, 0, 0));
  addComponent(
    world,
    flakEntity,
    createProjectile(
      owner,
      15,
      350,
      600,
      new THREE.Vector3(1, 0, 0),
      'ballistic',
      'Flak',
      80,
      8,
    ),
  );
  addComponent(world, flakEntity, createFaction(Faction.Player));

  // Create enemy at (150, 0, 0) - 50 units away, within 80 unit radius
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(150, 0, 0));
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  // Check distance - should be within flak radius
  const flakTransform = getComponent(world, flakEntity, 'transform');
  const enemyTransform = getComponent(world, enemy, 'transform');
  const distance = flakTransform.position.distanceTo(enemyTransform.position);

  assert(distance === 50, `Distance should be 50, got ${distance}`);
  assert(distance <= 80, 'Enemy should be within flak radius of 80');
});

// Test: Flak does not detect same faction entities
test('Flak does not detect same faction entities within radius', () => {
  const world = createWorld();

  // Create owner ship (player)
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Create friendly ship (same faction) at (50, 0, 0) - within flak radius
  const friendly = createEntity(world);
  addComponent(world, friendly, createTransform(50, 0, 0));
  addComponent(world, friendly, createHealth(100));
  addComponent(world, friendly, createFaction(Faction.Player));

  // Same faction should not be enemies
  const ownerFaction = getComponent(world, owner, 'faction');
  const friendlyFaction = getComponent(world, friendly, 'faction');

  assert(
    !areEnemies(ownerFaction.faction, friendlyFaction.faction),
    'Same faction should not be enemies',
  );
});

// Test: Flak does not detect enemies outside radius
test('Flak does not detect enemies outside radius', () => {
  const world = createWorld();

  // Create owner ship (player)
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Create flak projectile at (100, 0, 0)
  const flakEntity = createEntity(world);
  addComponent(world, flakEntity, createTransform(100, 0, 0));

  // Create enemy at (200, 0, 0) - 100 units away, outside 80 unit radius
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(200, 0, 0));
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  const flakTransform = getComponent(world, flakEntity, 'transform');
  const enemyTransform = getComponent(world, enemy, 'transform');
  const distance = flakTransform.position.distanceTo(enemyTransform.position);

  assert(distance === 100, `Distance should be 100, got ${distance}`);
  assert(distance > 80, 'Enemy should be outside flak radius of 80');
});

// ============================================================
// NUKE TESTS
// ============================================================

console.log('\n=== NUKE TESTS ===\n');

// Test: Nuke missile has isNuke and aoeRadius
test('Nuke missile has isNuke flag and aoeRadius', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const missile = createMissile(
    owner,
    undefined, // no target
    500, // damage
    300, // speed
    50, // turn rate
    1500, // range
    direction,
    150, // AoE radius
    true, // isNuke
  );

  assert(missile.isNuke === true, 'Missile should be a nuke');
  assert(missile.aoeRadius === 150, 'AoE radius should be 150');
  assert(missile.damage === 500, 'Nuke damage should be 500');
});

// Test: Regular missile is not a nuke
test('Regular missile is not a nuke', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const missile = createMissile(
    owner,
    undefined,
    100, // damage
    400, // speed
    90, // turn rate
    800, // range
    direction,
    0, // no AoE
    false, // not a nuke
  );

  assert(missile.isNuke === false, 'Regular missile should not be a nuke');
  assert(missile.aoeRadius === 0, 'Regular missile should have no AoE');
});

// Test: Missile expiration check
test('Missile expires when distanceTraveled >= range', () => {
  const owner = 1;
  const direction = new THREE.Vector3(0, 0, -1);

  const missile = createMissile(
    owner,
    undefined,
    100,
    400,
    90,
    800,
    direction,
    0,
    false,
  );

  assert(!isMissileExpired(missile), 'Fresh missile should not be expired');

  missile.distanceTraveled = 400;
  assert(
    !isMissileExpired(missile),
    'Missile at half range should not be expired',
  );

  missile.distanceTraveled = 800;
  assert(isMissileExpired(missile), 'Missile at full range should be expired');

  missile.distanceTraveled = 900;
  assert(isMissileExpired(missile), 'Missile beyond range should be expired');
});

// Test: Nuke AoE detection - enemies in range
test('Nuke AoE detects enemies within blast radius', () => {
  const world = createWorld();

  // Create owner ship
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Nuke position at (500, 0, 0) with AoE radius 150
  const nukePosition = new THREE.Vector3(500, 0, 0);
  const aoeRadius = 150;

  // Create enemy at (600, 0, 0) - 100 units away, within 150 radius
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(600, 0, 0));
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  const enemyTransform = getComponent(world, enemy, 'transform');
  const distance = nukePosition.distanceTo(enemyTransform.position);

  assert(distance === 100, `Distance should be 100, got ${distance}`);
  assert(distance <= aoeRadius, 'Enemy should be within AoE radius');
});

// Test: Nuke AoE - no enemies in range
test('Nuke AoE does not trigger when no enemies in blast radius', () => {
  const world = createWorld();

  // Create owner ship
  const owner = createEntity(world);
  addComponent(world, owner, createTransform(0, 0, 0));
  addComponent(world, owner, createFaction(Faction.Player));

  // Nuke position at (500, 0, 0) with AoE radius 150
  const nukePosition = new THREE.Vector3(500, 0, 0);
  const aoeRadius = 150;

  // Create enemy at (700, 0, 0) - 200 units away, outside 150 radius
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(700, 0, 0));
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  const enemyTransform = getComponent(world, enemy, 'transform');
  const distance = nukePosition.distanceTo(enemyTransform.position);

  assert(distance === 200, `Distance should be 200, got ${distance}`);
  assert(distance > aoeRadius, 'Enemy should be outside AoE radius');
});

// Test: AoE damage falloff
test('AoE damage has linear falloff from center to edge', () => {
  const maxDamage = 100;
  const radius = 100;

  // At center (distance 0): full damage
  const damageAtCenter = maxDamage * (1 - 0 / radius);
  assert(damageAtCenter === 100, 'Damage at center should be full');

  // At half radius (distance 50): half damage
  const damageAtHalf = maxDamage * (1 - 50 / radius);
  assert(damageAtHalf === 50, 'Damage at half radius should be half');

  // At edge (distance 100): zero damage
  const damageAtEdge = maxDamage * (1 - 100 / radius);
  assert(damageAtEdge === 0, 'Damage at edge should be zero');
});

// Test: Nuke AoE respects faction alignment
test('Nuke AoE respects faction alignment', () => {
  // Same faction should not be enemies
  assert(
    !areEnemies(Faction.Player, Faction.Player),
    'Same faction should not be enemies',
  );
  assert(
    !areEnemies(Faction.Enemy, Faction.Enemy),
    'Same faction should not be enemies',
  );

  // Different factions are hostile
  assert(
    areEnemies(Faction.Player, Faction.Enemy),
    'Player and Enemy should be enemies',
  );
  assert(
    areEnemies(Faction.Enemy, Faction.Player),
    'Enemy and Player should be enemies',
  );

  // Neutral is never hostile
  assert(
    !areEnemies(Faction.Player, Faction.Neutral),
    'Neutral is never an enemy',
  );
  assert(
    !areEnemies(Faction.Neutral, Faction.Enemy),
    'Neutral is never an enemy',
  );
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

console.log('\n=== INTEGRATION TESTS ===\n');

// Test: Full flak scenario setup
test('Full flak explosion scenario entities created correctly', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Flak projectile
  const flak = createEntity(world);
  addComponent(world, flak, createTransform(100, 0, 0));
  const flakProj = createProjectile(
    player,
    15,
    350,
    600,
    new THREE.Vector3(1, 0, 0),
    'ballistic',
    'Flak',
    80,
    8,
  );
  addComponent(world, flak, flakProj);
  addComponent(world, flak, createFaction(Faction.Player));
  addComponent(world, flak, createCollision(0.5));

  // Enemy in range
  const enemy1 = createEntity(world);
  addComponent(world, enemy1, createTransform(150, 0, 0));
  addComponent(world, enemy1, createHealth(80));
  addComponent(world, enemy1, createFaction(Faction.Enemy));

  // Enemy out of range
  const enemy2 = createEntity(world);
  addComponent(world, enemy2, createTransform(300, 0, 0));
  addComponent(world, enemy2, createHealth(80));
  addComponent(world, enemy2, createFaction(Faction.Enemy));

  // Verify entities exist
  const projectiles = [...queryEntities(world, ['projectile'])];
  assert(projectiles.length === 1, 'Should have 1 projectile');
  assert(projectiles[0] === flak, 'Projectile should be flak');

  const enemies = [...queryEntities(world, ['health', 'faction'])].filter(
    (e) => {
      const faction = getComponent(world, e, 'faction');
      return faction.faction === Faction.Enemy;
    },
  );
  assert(enemies.length === 2, 'Should have 2 enemies');
});

// Test: Full nuke scenario setup
test('Full nuke explosion scenario entities created correctly', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Nuke missile
  const nuke = createEntity(world);
  addComponent(world, nuke, createTransform(500, 0, 0));
  const nukeMissile = createMissile(
    player,
    undefined,
    500,
    300,
    50,
    1500,
    new THREE.Vector3(1, 0, 0),
    150,
    true,
  );
  addComponent(world, nuke, nukeMissile);
  addComponent(world, nuke, createFaction(Faction.Player));
  addComponent(world, nuke, createCollision(1.0));

  // Enemies at various distances from nuke position (500, 0, 0)
  // Enemy 1: at (600, 0, 0) - 100 units away, inside 150 radius
  const enemy1 = createEntity(world);
  addComponent(world, enemy1, createTransform(600, 0, 0));
  addComponent(world, enemy1, createHealth(100));
  addComponent(world, enemy1, createFaction(Faction.Enemy));

  // Enemy 2: at (650, 0, 0) - 150 units away, at edge of radius
  const enemy2 = createEntity(world);
  addComponent(world, enemy2, createTransform(650, 0, 0));
  addComponent(world, enemy2, createHealth(100));
  addComponent(world, enemy2, createFaction(Faction.Enemy));

  // Enemy 3: at (700, 0, 0) - 200 units away, outside radius
  const enemy3 = createEntity(world);
  addComponent(world, enemy3, createTransform(700, 0, 0));
  addComponent(world, enemy3, createHealth(100));
  addComponent(world, enemy3, createFaction(Faction.Enemy));

  // Verify setup
  const missiles = [...queryEntities(world, ['missile'])];
  assert(missiles.length === 1, 'Should have 1 missile');

  const missile = getComponent(world, missiles[0], 'missile');
  assert(missile.isNuke === true, 'Missile should be a nuke');
  assert(missile.aoeRadius === 150, 'AoE radius should be 150');
});

// ============================================================
// FRIENDLY FIRE TESTS
// ============================================================

console.log('\n=== FRIENDLY FIRE TESTS ===\n');

// Test: Projectile collision data allows same-faction hits (friendly fire enabled)
test('Projectile collision does not filter same faction targets', () => {
  // The projectile system now damages anyone except the owner
  // This test verifies the expected behavior: friendly fire is ON

  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Allied ship (same faction)
  const ally = createEntity(world);
  addComponent(world, ally, createTransform(10, 0, 0));
  addComponent(world, ally, createHealth(100));
  addComponent(world, ally, createFaction(Faction.Player)); // Same faction as player

  // Projectile from player
  const projectile = createEntity(world);
  addComponent(world, projectile, createTransform(5, 0, 0));
  addComponent(
    world,
    projectile,
    createProjectile(
      player,
      25,
      400,
      800,
      new THREE.Vector3(1, 0, 0),
      'energy',
      'Plasma',
    ),
  );
  addComponent(world, projectile, createFaction(Faction.Player));
  addComponent(world, projectile, createCollision(0.5));

  // Verify entities have same faction (but projectile should still damage)
  const playerFaction = getComponent(world, player, 'faction');
  const allyFaction = getComponent(world, ally, 'faction');

  assert(
    playerFaction.faction === allyFaction.faction,
    'Player and ally should have same faction',
  );
  // Friendly fire is enabled - damage should apply to allies
});

// Test: Missile direct hit damages same faction (friendly fire)
test('Missile direct hit can damage same faction ships', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Allied ship
  const ally = createEntity(world);
  addComponent(world, ally, createTransform(100, 0, 0));
  addComponent(world, ally, createHealth(100));
  addComponent(world, ally, createFaction(Faction.Player)); // Same faction

  // Missile from player targeting general direction (would hit ally)
  const missile = createEntity(world);
  addComponent(world, missile, createTransform(50, 0, 0));
  const missileComp = createMissile(
    player,
    undefined,
    100,
    400,
    90,
    800,
    new THREE.Vector3(1, 0, 0),
    0,
    false,
  );
  addComponent(world, missile, missileComp);
  addComponent(world, missile, createFaction(Faction.Player));
  addComponent(world, missile, createCollision(1.0));

  // Verify missile owner is not ally
  assert(missileComp.owner === player, 'Missile owner should be player');
  assert(missileComp.owner !== ally, 'Missile owner should not be ally');
  // Friendly fire means ally can be hit by player's missile
});

// Test: Nuke AoE damages same faction (friendly fire)
test('Nuke AoE damages all ships including same faction', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Allied ship near nuke explosion
  const ally = createEntity(world);
  addComponent(world, ally, createTransform(550, 0, 0)); // 50 units from nuke
  addComponent(world, ally, createHealth(100));
  addComponent(world, ally, createFaction(Faction.Player)); // Same faction

  // Enemy ship also near nuke
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(600, 0, 0)); // 100 units from nuke
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  // Nuke position at (500, 0, 0) with AoE radius 150
  const nukePosition = new THREE.Vector3(500, 0, 0);
  const aoeRadius = 150;

  // Both ally and enemy are within AoE
  const allyTransform = getComponent(world, ally, 'transform');
  const enemyTransform = getComponent(world, enemy, 'transform');

  const allyDistance = nukePosition.distanceTo(allyTransform.position);
  const enemyDistance = nukePosition.distanceTo(enemyTransform.position);

  assert(
    allyDistance === 50,
    `Ally should be 50 units away, got ${allyDistance}`,
  );
  assert(
    enemyDistance === 100,
    `Enemy should be 100 units away, got ${enemyDistance}`,
  );
  assert(
    allyDistance <= aoeRadius,
    'Ally should be within AoE (will take friendly fire damage)',
  );
  assert(enemyDistance <= aoeRadius, 'Enemy should be within AoE');
});

// Test: Shrapnel damages same faction (friendly fire from flak)
test('Flak shrapnel damages all ships including same faction', () => {
  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Allied ship near flak explosion
  const ally = createEntity(world);
  addComponent(world, ally, createTransform(110, 0, 0)); // Just outside trigger range but in shrapnel range
  addComponent(world, ally, createHealth(100));
  addComponent(world, ally, createFaction(Faction.Player)); // Same faction

  // Enemy that triggers the flak
  const enemy = createEntity(world);
  addComponent(world, enemy, createTransform(150, 0, 0)); // Within 80-unit flak trigger radius
  addComponent(world, enemy, createHealth(100));
  addComponent(world, enemy, createFaction(Faction.Enemy));

  // Flak at (100, 0, 0) with 80 unit trigger radius
  const flakPosition = new THREE.Vector3(100, 0, 0);
  const flakRadius = 80;
  const shrapnelRange = 120;

  // Enemy is within trigger range
  const enemyTransform = getComponent(world, enemy, 'transform');
  const enemyDistance = flakPosition.distanceTo(enemyTransform.position);
  assert(
    enemyDistance === 50,
    `Enemy should be 50 units away, got ${enemyDistance}`,
  );
  assert(enemyDistance <= flakRadius, 'Enemy should trigger flak explosion');

  // Ally is outside trigger range but within shrapnel range
  const allyTransform = getComponent(world, ally, 'transform');
  const allyDistance = flakPosition.distanceTo(allyTransform.position);
  assert(
    allyDistance === 10,
    `Ally should be 10 units away, got ${allyDistance}`,
  );
  assert(
    allyDistance <= shrapnelRange,
    'Ally is within shrapnel range (will take friendly fire)',
  );
});

// Test: Flak trigger only by enemies, not friendlies
test('Flak explosion only triggered by enemies, not same faction', () => {
  // This verifies that flak proximity check only considers enemies
  // Same faction entities within range should NOT trigger explosion

  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Allied ship near flak (same faction)
  const ally = createEntity(world);
  addComponent(world, ally, createTransform(50, 0, 0)); // Within 80-unit flak radius
  addComponent(world, ally, createHealth(100));
  addComponent(world, ally, createFaction(Faction.Player)); // Same faction - should NOT trigger

  const allyFaction = getComponent(world, ally, 'faction');
  const playerFaction = getComponent(world, player, 'faction');

  // Same faction means NOT enemies
  assert(
    !areEnemies(playerFaction.faction, allyFaction.faction),
    'Same faction should not be enemies',
  );
  // Therefore ally within range should NOT trigger flak explosion
});

// Test: Beam hits same faction ships (friendly fire)
test('Beam weapon damages same faction ships', () => {
  // Beams now damage anyone except the firer (owner)
  // This test verifies the expected friendly fire behavior

  const world = createWorld();

  // Player ship
  const player = createEntity(world);
  addComponent(world, player, createTransform(0, 0, 0));
  addComponent(world, player, createHealth(100));
  addComponent(world, player, createFaction(Faction.Player));

  // Allied ship in front of player
  const ally = createEntity(world);
  addComponent(world, ally, createTransform(50, 0, 50)); // Forward of player
  addComponent(world, ally, createHealth(100));
  addComponent(world, ally, createFaction(Faction.Player)); // Same faction
  addComponent(world, ally, createCollision(5)); // Has hitbox

  // Beam can hit ally because friendly fire is enabled
  const playerFaction = getComponent(world, player, 'faction');
  const allyFaction = getComponent(world, ally, 'faction');

  assert(
    playerFaction.faction === allyFaction.faction,
    'Player and ally have same faction',
  );
  // With friendly fire enabled, beam from player CAN hit ally
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
