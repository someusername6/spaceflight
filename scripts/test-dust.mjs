/**
 * Simulation to test tiled cube dust particle behavior in various flight scenarios.
 * Run with: node scripts/test-dust.mjs
 */

// Dust configuration (must match dust.ts)
const CUBE_SIZE = 200;
const PARTICLES_PER_CUBE = 80;
const RENDER_DISTANCE = 600;

// Player config
const PLAYER_SPEED = 250;
const DT = 1 / 60;

// View frustum approximation
const VIEW_DISTANCE = 500;
const VIEW_ANGLE = Math.PI / 3;

// Seeded random (same as dust.ts)
function seededRandom(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate template offsets (same as dust.ts)
const TEMPLATE_OFFSETS = [];
const random = seededRandom(42);
for (let i = 0; i < PARTICLES_PER_CUBE; i++) {
  TEMPLATE_OFFSETS.push({
    x: random() * CUBE_SIZE,
    y: random() * CUBE_SIZE,
    z: random() * CUBE_SIZE,
  });
}

// Get all particles within render distance of a position
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
        const cubeOriginX = cx * CUBE_SIZE;
        const cubeOriginY = cy * CUBE_SIZE;
        const cubeOriginZ = cz * CUBE_SIZE;

        for (const offset of TEMPLATE_OFFSETS) {
          const worldX = cubeOriginX + offset.x;
          const worldY = cubeOriginY + offset.y;
          const worldZ = cubeOriginZ + offset.z;

          const dx = worldX - px;
          const dy = worldY - py;
          const dz = worldZ - pz;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq <= renderDistSq) {
            particles.push({ x: worldX, y: worldY, z: worldZ });
          }
        }
      }
    }
  }
  return particles;
}

// Check if particle is in view cone along a direction
function isInViewCone3D(p, playerPos, viewDir) {
  const dx = p.x - playerPos.x;
  const dy = p.y - playerPos.y;
  const dz = p.z - playerPos.z;

  const alongView = dx * viewDir.x + dy * viewDir.y + dz * viewDir.z;
  if (alongView < 0 || alongView > VIEW_DISTANCE) return false;

  const latX = dx - alongView * viewDir.x;
  const latY = dy - alongView * viewDir.y;
  const latZ = dz - alongView * viewDir.z;
  const latDist = Math.sqrt(latX*latX + latY*latY + latZ*latZ);

  const angle = Math.atan2(latDist, alongView);
  return angle < VIEW_ANGLE;
}

function runScenario(name, getVelocityAtTime) {
  console.log(`\n=== Scenario: ${name} ===`);

  const playerPos = { x: 0, y: 0, z: 0 };

  let minInView = Infinity;
  let maxInView = 0;
  let totalInView = 0;
  let sampleCount = 0;
  let minTotalParticles = Infinity;
  let maxTotalParticles = 0;

  const totalFrames = 30 * 60; // 30 seconds

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame * DT;
    const vel = getVelocityAtTime(t);
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);

    // Move player
    playerPos.x += vel.x * DT;
    playerPos.y += vel.y * DT;
    playerPos.z += vel.z * DT;

    // Get particles using tiled cube approach
    const particles = getParticlesNearPosition(playerPos.x, playerPos.y, playerPos.z);

    // Track total particle count (should be ~constant)
    minTotalParticles = Math.min(minTotalParticles, particles.length);
    maxTotalParticles = Math.max(maxTotalParticles, particles.length);

    // View direction (normalized velocity, or forward if stationary)
    const viewDir = speed > 1
      ? { x: vel.x/speed, y: vel.y/speed, z: vel.z/speed }
      : { x: 0, y: 0, z: 1 };

    // Count in view
    let inView = 0;
    for (const p of particles) {
      if (isInViewCone3D(p, playerPos, viewDir)) inView++;
    }

    minInView = Math.min(minInView, inView);
    maxInView = Math.max(maxInView, inView);
    totalInView += inView;
    sampleCount++;

    // Log key moments
    if (frame % (5 * 60) === 0) {
      console.log(`  t=${(t).toFixed(0).padStart(2)}s: ${inView.toString().padStart(4)} in view, ${particles.length.toString().padStart(5)} total nearby`);
    }
  }

  const avgInView = totalInView / sampleCount;
  const variance = maxInView - minInView;
  const variancePercent = (100 * variance / avgInView).toFixed(1);

  console.log(`  Result: min=${minInView}, max=${maxInView}, avg=${avgInView.toFixed(0)}, variance=${variancePercent}%`);
  console.log(`  Total particles: min=${minTotalParticles}, max=${maxTotalParticles}`);

  // Pass if variance is less than 20% and min > 100
  const pass = variance / avgInView < 0.20 && minInView > 100;
  return pass;
}

// Scenario 1: Straight flight
const scenario1 = runScenario("Straight flight +Z", (t) => ({ x: 0, y: 0, z: PLAYER_SPEED }));

// Scenario 2: Fly 10s, 180° turn, fly 10s
const scenario2 = runScenario("Fly +Z 10s, 180° turn, fly -Z", (t) => {
  if (t < 10) return { x: 0, y: 0, z: PLAYER_SPEED };
  return { x: 0, y: 0, z: -PLAYER_SPEED };
});

// Scenario 3: Fly 10s, 90° turn up, fly 10s
const scenario3 = runScenario("Fly +Z 10s, 90° turn up (+Y), fly", (t) => {
  if (t < 10) return { x: 0, y: 0, z: PLAYER_SPEED };
  return { x: 0, y: PLAYER_SPEED, z: 0 };
});

// Scenario 4: Continuous turning (spiral)
const scenario4 = runScenario("Spiral (continuous turn)", (t) => {
  const angle = t * 0.5; // Slow turn
  return { x: Math.sin(angle) * PLAYER_SPEED, y: 0, z: Math.cos(angle) * PLAYER_SPEED };
});

// Scenario 5: Stationary
const scenario5 = runScenario("Stationary", (t) => ({ x: 0, y: 0, z: 0 }));

// Scenario 6: Random direction changes
const scenario6 = runScenario("Random direction changes every 2s", (t) => {
  const segment = Math.floor(t / 2);
  const angles = [0, Math.PI/2, Math.PI, -Math.PI/2, Math.PI/4, -Math.PI/4];
  const angle = angles[segment % angles.length];
  return { x: Math.sin(angle) * PLAYER_SPEED, y: 0, z: Math.cos(angle) * PLAYER_SPEED };
});

console.log("\n=== Summary ===");
console.log(`Scenario 1 (Straight):     ${scenario1 ? "✓ PASS" : "⚠️ FAIL"}`);
console.log(`Scenario 2 (180° turn):    ${scenario2 ? "✓ PASS" : "⚠️ FAIL"}`);
console.log(`Scenario 3 (90° turn):     ${scenario3 ? "✓ PASS" : "⚠️ FAIL"}`);
console.log(`Scenario 4 (Spiral):       ${scenario4 ? "✓ PASS" : "⚠️ FAIL"}`);
console.log(`Scenario 5 (Stationary):   ${scenario5 ? "✓ PASS" : "⚠️ FAIL"}`);
console.log(`Scenario 6 (Random):       ${scenario6 ? "✓ PASS" : "⚠️ FAIL"}`);

const allPass = scenario1 && scenario2 && scenario3 && scenario4 && scenario5 && scenario6;
console.log(`\nOverall: ${allPass ? "✓ ALL TESTS PASS" : "⚠️ SOME TESTS FAILED"}`);
