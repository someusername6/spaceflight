/**
 * Test that the tiled cube approach is deterministic:
 * - Same position always has same particles
 * - Returning to a position shows same particles
 */

const CUBE_SIZE = 200;
const PARTICLES_PER_CUBE = 80;
const RENDER_DISTANCE = 600;

function seededRandom(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

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
          if (dx*dx + dy*dy + dz*dz <= renderDistSq) {
            particles.push({ x: worldX, y: worldY, z: worldZ });
          }
        }
      }
    }
  }
  // Sort for comparison
  return particles.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
}

function particlesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y || a[i].z !== b[i].z) return false;
  }
  return true;
}

console.log("=== Determinism Tests ===\n");

// Test 1: Same position called twice
console.log("Test 1: Same position called twice");
const pos1a = getParticlesNearPosition(1234.5, -567.8, 9012.3);
const pos1b = getParticlesNearPosition(1234.5, -567.8, 9012.3);
const test1 = particlesEqual(pos1a, pos1b);
console.log(`  Result: ${test1 ? "✓ PASS" : "⚠️ FAIL"} (${pos1a.length} particles both times)`);

// Test 2: Return to origin after travel
console.log("\nTest 2: Return to origin after travel");
const originBefore = getParticlesNearPosition(0, 0, 0);
// Simulate traveling far away
getParticlesNearPosition(10000, 10000, 10000);
getParticlesNearPosition(-5000, 2000, 8000);
const originAfter = getParticlesNearPosition(0, 0, 0);
const test2 = particlesEqual(originBefore, originAfter);
console.log(`  Result: ${test2 ? "✓ PASS" : "⚠️ FAIL"} (${originBefore.length} particles both times)`);

// Test 3: Same particles at cube boundaries
console.log("\nTest 3: Cube boundary transitions are smooth");
const nearBoundary1 = getParticlesNearPosition(199, 0, 0);
const nearBoundary2 = getParticlesNearPosition(201, 0, 0);
// These should share most particles (difference is just from the distance cutoff)
const shared = nearBoundary1.filter(p1 =>
  nearBoundary2.some(p2 => p1.x === p2.x && p1.y === p2.y && p1.z === p2.z)
);
const overlapPercent = (100 * shared.length / Math.min(nearBoundary1.length, nearBoundary2.length)).toFixed(1);
const test3 = shared.length > nearBoundary1.length * 0.9; // >90% overlap
console.log(`  Result: ${test3 ? "✓ PASS" : "⚠️ FAIL"} (${overlapPercent}% overlap, ${shared.length}/${nearBoundary1.length} shared)`);

// Test 4: Very far positions still work
console.log("\nTest 4: Very far positions (1 million units away)");
const farPos = getParticlesNearPosition(1000000, -500000, 2000000);
const test4 = farPos.length > 8000 && farPos.length < 10000;
console.log(`  Result: ${test4 ? "✓ PASS" : "⚠️ FAIL"} (${farPos.length} particles)`);

// Test 5: Negative positions work
console.log("\nTest 5: Negative positions");
const negPos = getParticlesNearPosition(-1234, -5678, -9012);
const test5 = negPos.length > 8000 && negPos.length < 10000;
console.log(`  Result: ${test5 ? "✓ PASS" : "⚠️ FAIL"} (${negPos.length} particles)`);

console.log("\n=== Summary ===");
const allPass = test1 && test2 && test3 && test4 && test5;
console.log(allPass ? "✓ ALL DETERMINISM TESTS PASS" : "⚠️ SOME TESTS FAILED");
