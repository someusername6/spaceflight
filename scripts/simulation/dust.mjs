#!/usr/bin/env node
/**
 * Dust Particle Simulation
 *
 * Tests the tiled cube dust particle system for:
 * 1. Uniform density across flight scenarios (straight, turns, spiral)
 * 2. Determinism (same position = same particles)
 *
 * Run: npm run sim:dust
 * Exit code: 0 if all tests pass, 1 if any fail
 */

// ============================================================================
// Configuration (must match src/rendering/dust.ts)
// ============================================================================

const CUBE_SIZE = 120;          // Smaller cubes = more frequent particles
const PARTICLES_PER_CUBE = 8;   // Fewer per cube, but cubes are smaller
const RENDER_DISTANCE = 400;
const PLAYER_SPEED = 250;
const DT = 1 / 60;
const VIEW_DISTANCE = 500;
const VIEW_ANGLE = Math.PI / 3;

// ============================================================================
// Shared Utilities
// ============================================================================

function seededRandom(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate template offsets (same algorithm as dust.ts)
const TEMPLATE_OFFSETS = [];
const random = seededRandom(42);
for (let i = 0; i < PARTICLES_PER_CUBE; i++) {
  TEMPLATE_OFFSETS.push({
    x: random() * CUBE_SIZE,
    y: random() * CUBE_SIZE,
    z: random() * CUBE_SIZE,
  });
}

function getParticlesNearPosition(px, py, pz) {
  const particles = [];
  const playerCubeX = Math.floor(px / CUBE_SIZE);
  const playerCubeY = Math.floor(py / CUBE_SIZE);
  const playerCubeZ = Math.floor(pz / CUBE_SIZE);
  const cubeRadius = Math.ceil(RENDER_DISTANCE / CUBE_SIZE);
  const renderDistSq = RENDER_DISTANCE * RENDER_DISTANCE;

  for (let cx = playerCubeX - cubeRadius; cx <= playerCubeX + cubeRadius; cx++) {
    for (let cy = playerCubeY - cubeRadius; cy <= playerCubeY + cubeRadius; cy++) {
      for (let cz = playerCubeZ - cubeRadius; cz <= playerCubeZ + cubeRadius; cz++) {
        for (const offset of TEMPLATE_OFFSETS) {
          const worldX = cx * CUBE_SIZE + offset.x;
          const worldY = cy * CUBE_SIZE + offset.y;
          const worldZ = cz * CUBE_SIZE + offset.z;
          const dx = worldX - px;
          const dy = worldY - py;
          const dz = worldZ - pz;
          if (dx * dx + dy * dy + dz * dz <= renderDistSq) {
            particles.push({ x: worldX, y: worldY, z: worldZ });
          }
        }
      }
    }
  }
  return particles;
}

function isInViewCone(p, playerPos, viewDir) {
  const dx = p.x - playerPos.x;
  const dy = p.y - playerPos.y;
  const dz = p.z - playerPos.z;
  const alongView = dx * viewDir.x + dy * viewDir.y + dz * viewDir.z;
  if (alongView < 0 || alongView > VIEW_DISTANCE) return false;
  const latX = dx - alongView * viewDir.x;
  const latY = dy - alongView * viewDir.y;
  const latZ = dz - alongView * viewDir.z;
  const latDist = Math.sqrt(latX * latX + latY * latY + latZ * latZ);
  return Math.atan2(latDist, alongView) < VIEW_ANGLE;
}

// ============================================================================
// Flight Scenario Tests
// ============================================================================

function runFlightScenario(name, getVelocityAtTime, quiet) {
  const playerPos = { x: 0, y: 0, z: 0 };
  let minInView = Infinity, maxInView = 0, totalInView = 0, sampleCount = 0;
  const totalFrames = 30 * 60;

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame * DT;
    const vel = getVelocityAtTime(t);
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

    playerPos.x += vel.x * DT;
    playerPos.y += vel.y * DT;
    playerPos.z += vel.z * DT;

    const particles = getParticlesNearPosition(playerPos.x, playerPos.y, playerPos.z);
    const viewDir = speed > 1
      ? { x: vel.x / speed, y: vel.y / speed, z: vel.z / speed }
      : { x: 0, y: 0, z: 1 };

    let inView = 0;
    for (const p of particles) {
      if (isInViewCone(p, playerPos, viewDir)) inView++;
    }

    minInView = Math.min(minInView, inView);
    maxInView = Math.max(maxInView, inView);
    totalInView += inView;
    sampleCount++;
  }

  const avgInView = totalInView / sampleCount;
  const variance = (maxInView - minInView) / avgInView;
  const pass = variance < 0.20 && minInView > 100;

  if (!quiet) {
    const status = pass ? '✓' : '✗';
    console.log(`  ${status} ${name}: min=${minInView}, avg=${avgInView.toFixed(0)}, variance=${(variance * 100).toFixed(1)}%`);
  }
  return pass;
}

function runFlightTests(quiet) {
  if (!quiet) console.log('\n[Flight Scenarios]');

  const scenarios = [
    ['Straight flight', () => ({ x: 0, y: 0, z: PLAYER_SPEED })],
    ['180° turn', (t) => t < 10 ? { x: 0, y: 0, z: PLAYER_SPEED } : { x: 0, y: 0, z: -PLAYER_SPEED }],
    ['90° turn', (t) => t < 10 ? { x: 0, y: 0, z: PLAYER_SPEED } : { x: 0, y: PLAYER_SPEED, z: 0 }],
    ['Spiral', (t) => ({ x: Math.sin(t * 0.5) * PLAYER_SPEED, y: 0, z: Math.cos(t * 0.5) * PLAYER_SPEED })],
    ['Stationary', () => ({ x: 0, y: 0, z: 0 })],
    ['Random turns', (t) => {
      const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4];
      const angle = angles[Math.floor(t / 2) % angles.length];
      return { x: Math.sin(angle) * PLAYER_SPEED, y: 0, z: Math.cos(angle) * PLAYER_SPEED };
    }],
  ];

  let allPass = true;
  for (const [name, fn] of scenarios) {
    if (!runFlightScenario(name, fn, quiet)) allPass = false;
  }
  return allPass;
}

// ============================================================================
// Determinism Tests
// ============================================================================

function particlesEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortFn = (p1, p2) => p1.x - p2.x || p1.y - p2.y || p1.z - p2.z;
  a.sort(sortFn);
  b.sort(sortFn);
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y || a[i].z !== b[i].z) return false;
  }
  return true;
}

function runDeterminismTests(quiet) {
  if (!quiet) console.log('\n[Determinism]');
  let allPass = true;

  // Test 1: Same position twice
  const pos1a = getParticlesNearPosition(1234.5, -567.8, 9012.3);
  const pos1b = getParticlesNearPosition(1234.5, -567.8, 9012.3);
  const test1 = particlesEqual(pos1a, pos1b);
  if (!quiet) console.log(`  ${test1 ? '✓' : '✗'} Same position returns same particles`);
  if (!test1) allPass = false;

  // Test 2: Return to origin
  const originBefore = getParticlesNearPosition(0, 0, 0);
  getParticlesNearPosition(10000, 10000, 10000);
  const originAfter = getParticlesNearPosition(0, 0, 0);
  const test2 = particlesEqual(originBefore, originAfter);
  if (!quiet) console.log(`  ${test2 ? '✓' : '✗'} Return to origin shows same particles`);
  if (!test2) allPass = false;

  // Test 3: Cube boundary overlap
  const near1 = getParticlesNearPosition(199, 0, 0);
  const near2 = getParticlesNearPosition(201, 0, 0);
  const shared = near1.filter(p1 => near2.some(p2 => p1.x === p2.x && p1.y === p2.y && p1.z === p2.z));
  const test3 = shared.length > near1.length * 0.9;
  if (!quiet) console.log(`  ${test3 ? '✓' : '✗'} Cube boundaries smooth (${(100 * shared.length / near1.length).toFixed(1)}% overlap)`);
  if (!test3) allPass = false;

  // Test 4: Extreme distances
  const farPos = getParticlesNearPosition(1000000, -500000, 2000000);
  const test4 = farPos.length > 1000 && farPos.length < 1600;
  if (!quiet) console.log(`  ${test4 ? '✓' : '✗'} Works at extreme distances (${farPos.length} particles)`);
  if (!test4) allPass = false;

  // Test 5: Negative positions
  const negPos = getParticlesNearPosition(-1234, -5678, -9012);
  const test5 = negPos.length > 1000 && negPos.length < 1600;
  if (!quiet) console.log(`  ${test5 ? '✓' : '✗'} Works with negative coordinates (${negPos.length} particles)`);
  if (!test5) allPass = false;

  return allPass;
}

// ============================================================================
// Main
// ============================================================================

const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');

if (!quiet) {
  console.log('=== Dust Particle Simulation ===');
  console.log(`Config: CUBE_SIZE=${CUBE_SIZE}, PARTICLES_PER_CUBE=${PARTICLES_PER_CUBE}, RENDER_DISTANCE=${RENDER_DISTANCE}`);
}

const flightPass = runFlightTests(quiet);
const determinismPass = runDeterminismTests(quiet);
const allPass = flightPass && determinismPass;

if (!quiet) {
  console.log('\n' + (allPass ? '✓ ALL TESTS PASS' : '✗ SOME TESTS FAILED'));
}

process.exit(allPass ? 0 : 1);
