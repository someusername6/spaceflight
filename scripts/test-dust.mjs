/**
 * Simulation to test dust particle behavior when flying straight.
 * Run with: node scripts/test-dust.mjs
 */

// NEW dust configuration - despawn behind player faster
const PARTICLE_COUNT = 2500;
const SPAWN_RADIUS_MIN = 60;
const SPAWN_RADIUS_MAX = 600;
const DESPAWN_RADIUS = 1200;
const DESPAWN_BEHIND = 300; // Despawn if this far BEHIND player (along velocity)
const VELOCITY_BIAS = 1.5;

// Player config
const PLAYER_SPEED = 250; // m/s (max speed)
const DT = 1 / 60; // 60 fps
const SIMULATION_SECONDS = 30;

// View frustum approximation: cone in front of player
const VIEW_DISTANCE = 500; // How far ahead we consider "visible"
const VIEW_ANGLE = Math.PI / 3; // 60 degree cone

function spawnParticle(spawnCenterZ) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: spawnCenterZ + r * Math.cos(phi),
  };
}

function isInViewCone(p, playerZ) {
  const dz = p.z - playerZ;
  if (dz < 0 || dz > VIEW_DISTANCE) return false; // Behind or too far

  const lateralDist = Math.sqrt(p.x * p.x + p.y * p.y);
  const angle = Math.atan2(lateralDist, dz);
  return angle < VIEW_ANGLE;
}

function simulate() {
  console.log("=== Dust Particle Simulation ===");
  console.log(`Config: ${PARTICLE_COUNT} particles, spawn ${SPAWN_RADIUS_MIN}-${SPAWN_RADIUS_MAX}m, despawn ${DESPAWN_RADIUS}m`);
  console.log(`Velocity bias: ${VELOCITY_BIAS}s (${VELOCITY_BIAS * PLAYER_SPEED}m at max speed)`);
  console.log(`Player speed: ${PLAYER_SPEED} m/s`);
  console.log(`View cone: ${VIEW_DISTANCE}m distance, ${(VIEW_ANGLE * 180 / Math.PI).toFixed(0)}° angle`);
  console.log("");

  let playerZ = 0;
  const particles = [];

  // Initialize particles around starting position
  const initialSpawnCenter = VELOCITY_BIAS * PLAYER_SPEED;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(spawnParticle(initialSpawnCenter));
  }

  // Track statistics
  let minInView = Infinity;
  let maxInView = 0;
  let totalInView = 0;
  let sampleCount = 0;
  let zeroViewFrames = 0;
  let lowViewFrames = 0; // Less than 50 particles

  const totalFrames = SIMULATION_SECONDS * 60;

  for (let frame = 0; frame < totalFrames; frame++) {
    // Move player
    playerZ += PLAYER_SPEED * DT;

    const spawnCenterZ = playerZ + VELOCITY_BIAS * PLAYER_SPEED;

    // Update particles
    let respawnCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x;
      const dy = p.y;
      const dz = p.z - playerZ;
      const distSq = dx * dx + dy * dy + dz * dz;

      const tooFar = distSq > DESPAWN_RADIUS * DESPAWN_RADIUS;
      const tooClose = distSq < SPAWN_RADIUS_MIN * SPAWN_RADIUS_MIN;
      const tooBehind = dz < -DESPAWN_BEHIND; // Behind player by more than threshold

      if (tooFar || tooClose || tooBehind) {
        particles[i] = spawnParticle(spawnCenterZ);
        respawnCount++;
      }
    }

    // Count particles in view
    let inView = 0;
    for (const p of particles) {
      if (isInViewCone(p, playerZ)) {
        inView++;
      }
    }

    // Track stats every frame
    minInView = Math.min(minInView, inView);
    maxInView = Math.max(maxInView, inView);
    totalInView += inView;
    sampleCount++;

    if (inView === 0) zeroViewFrames++;
    if (inView < 50) lowViewFrames++;

    // Log every second
    if (frame > 0 && frame % 60 === 0) {
      const second = frame / 60;
      console.log(`t=${second.toString().padStart(2)}s: ${inView.toString().padStart(4)} in view, ${respawnCount.toString().padStart(4)} respawned this frame`);
    }
  }

  console.log("");
  console.log("=== Results ===");
  console.log(`Min particles in view: ${minInView}`);
  console.log(`Max particles in view: ${maxInView}`);
  console.log(`Avg particles in view: ${(totalInView / sampleCount).toFixed(1)}`);
  console.log(`Frames with 0 in view: ${zeroViewFrames} (${(100 * zeroViewFrames / totalFrames).toFixed(2)}%)`);
  console.log(`Frames with <50 in view: ${lowViewFrames} (${(100 * lowViewFrames / totalFrames).toFixed(2)}%)`);

  if (minInView < 20) {
    console.log("\n⚠️  WARNING: Very low particle count detected - player can outrun particles!");
  } else {
    console.log("\n✓ Particle coverage looks stable");
  }
}

simulate();
