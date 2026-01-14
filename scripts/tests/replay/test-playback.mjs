/**
 * Replay Playback Tests
 *
 * Verifies that:
 * 1. ReplayPlayback correctly simulates from replay data
 * 2. Playback produces identical results to original recording
 * 3. Seeking works correctly
 * 4. Playback controls function properly
 */

import { encodeRLE } from '../../../src/replay/compression.ts';
import { findMissionById } from '../../../src/replay/mission-setup.ts';
import { ReplayPlayback } from '../../../src/replay/playback.ts';
import {
  computeWorldChecksum,
  generateScriptedInputs,
} from '../shared/replay-test-utils.mjs';

// ============================================================================
// Test Framework
// ============================================================================

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal replay data object for testing.
 */
function createTestReplayData(
  seed,
  inputs,
  missionId = 's1-gnat-expectations',
) {
  const { data: compressedInputs, compressed } = encodeRLE(inputs);
  return {
    version: 2,
    seed,
    inputs: compressedInputs,
    inputsCompressed: compressed,
    tickCount: inputs.length,
    metadata: {
      id: 'test-replay',
      missionId,
      missionName: 'Test Mission',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: inputs.length,
      recordedAt: Date.now(),
      gameVersion: '0.1.0',
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
    },
  };
}

// ============================================================================
// Mission Setup Tests
// ============================================================================

test('findMissionById: finds existing mission', () => {
  const mission = findMissionById('s1-gnat-expectations');
  assertTrue(mission !== null, 'Should find s1-gnat-expectations mission');
  assertEqual(mission.id, 's1-gnat-expectations', 'Mission ID should match');
});

test('findMissionById: returns null for unknown mission', () => {
  const mission = findMissionById('nonexistent_mission_xyz');
  assertEqual(mission, null, 'Should return null for unknown mission');
});

// ============================================================================
// ReplayPlayback Tests
// ============================================================================

test('ReplayPlayback: initializes correctly', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  assertEqual(playback.getCurrentTick(), 0, 'Should start at tick 0');
  assertEqual(playback.getTotalTicks(), 100, 'Should have correct total ticks');
  assertEqual(playback.getState(), 'paused', 'Should start paused');
  assertEqual(playback.getSpeed(), 1, 'Should start at 1x speed');
});

test('ReplayPlayback: tick advances state', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  playback.play();
  assertEqual(playback.getState(), 'playing', 'Should be playing');

  playback.tick();
  assertEqual(playback.getCurrentTick(), 1, 'Should advance to tick 1');

  playback.tick();
  assertEqual(playback.getCurrentTick(), 2, 'Should advance to tick 2');
});

test('ReplayPlayback: pause/play toggle', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  assertEqual(playback.getState(), 'paused', 'Should start paused');

  playback.togglePlayPause();
  assertEqual(playback.getState(), 'playing', 'Should be playing after toggle');

  playback.togglePlayPause();
  assertEqual(
    playback.getState(),
    'paused',
    'Should be paused after second toggle',
  );
});

test('ReplayPlayback: speed control', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  playback.setSpeed(2);
  assertEqual(playback.getSpeed(), 2, 'Should set speed to 2x');

  playback.setSpeed(0.5);
  assertEqual(playback.getSpeed(), 0.5, 'Should set speed to 0.5x');

  playback.setSpeed(99); // Invalid
  assertEqual(playback.getSpeed(), 0.5, 'Should ignore invalid speed');
});

test('ReplayPlayback: cycle speed', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  assertEqual(playback.getSpeed(), 1, 'Should start at 1x');

  playback.cycleSpeed();
  assertEqual(playback.getSpeed(), 2, 'Should cycle to 2x');

  playback.cycleSpeed();
  assertEqual(playback.getSpeed(), 4, 'Should cycle to 4x');

  playback.cycleSpeed();
  assertEqual(playback.getSpeed(), 0.25, 'Should wrap to 0.25x');
});

test('ReplayPlayback: ends at tick count', () => {
  const inputs = generateScriptedInputs(10);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  playback.play();

  // Run to end
  for (let i = 0; i < 15; i++) {
    playback.tick();
  }

  assertEqual(playback.getState(), 'ended', 'Should be ended');
  assertEqual(playback.getCurrentTick(), 10, 'Should stop at tick count');
});

test('ReplayPlayback: seek to tick', () => {
  const inputs = generateScriptedInputs(1000);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  playback.seekTo(500);
  assertEqual(playback.getState(), 'loading', 'Should be in loading state');
  assertTrue(playback.isSeeking(), 'Should be seeking');

  // Process seeking
  while (playback.processSeek(500)) {
    // Continue seeking
  }

  assertEqual(playback.getCurrentTick(), 500, 'Should be at tick 500');
  assertEqual(playback.getState(), 'paused', 'Should be paused after seek');
});

test('ReplayPlayback: seek clamps to valid range', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  // Seek past end
  playback.seekTo(500);
  while (playback.processSeek()) {}
  assertEqual(playback.getCurrentTick(), 99, 'Should clamp to max tick');

  // Seek to negative
  playback.seekTo(-10);
  while (playback.processSeek()) {}
  assertEqual(playback.getCurrentTick(), 0, 'Should clamp to 0');
});

test('ReplayPlayback: progress calculation', () => {
  const inputs = generateScriptedInputs(100);
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  assertEqual(playback.getProgressPercent(), 0, 'Should start at 0%');

  playback.seekTo(50);
  while (playback.processSeek()) {}
  assertEqual(playback.getProgressPercent(), 50, 'Should be at 50%');

  playback.seekTo(99);
  while (playback.processSeek()) {}
  assertEqual(playback.getProgressPercent(), 99, 'Should be at 99%');
});

test('ReplayPlayback: time calculation', () => {
  const inputs = generateScriptedInputs(600); // 10 seconds at 60Hz
  const replay = createTestReplayData(12345, inputs);
  const playback = new ReplayPlayback(replay);

  assertEqual(playback.getTotalTimeSeconds(), 10, 'Total time should be 10s');
  assertEqual(playback.getCurrentTimeSeconds(), 0, 'Current time should be 0s');

  playback.seekTo(300);
  while (playback.processSeek()) {}
  assertEqual(playback.getCurrentTimeSeconds(), 5, 'Current time should be 5s');
});

// ============================================================================
// Determinism Tests
// ============================================================================

test('determinism: playback same seed same result', () => {
  const seed = 42;
  const inputs = generateScriptedInputs(300);
  const replay = createTestReplayData(seed, inputs);

  // Run playback twice
  const playback1 = new ReplayPlayback(replay);
  playback1.seekTo(300);
  while (playback1.processSeek(1000)) {}
  const checksum1 = computeWorldChecksum(playback1.getWorld());

  const playback2 = new ReplayPlayback(replay);
  playback2.seekTo(300);
  while (playback2.processSeek(1000)) {}
  const checksum2 = computeWorldChecksum(playback2.getWorld());

  assertEqual(
    checksum1,
    checksum2,
    'Two playbacks should produce same checksum',
  );
});

test('determinism: different seeds different results', () => {
  // Use longer simulation to ensure enemies spawn and divergence occurs
  const inputs = generateScriptedInputs(1200); // 20 seconds

  const replay1 = createTestReplayData(42, inputs);
  const playback1 = new ReplayPlayback(replay1);
  playback1.seekTo(1200);
  while (playback1.processSeek(2000)) {}
  const checksum1 = computeWorldChecksum(playback1.getWorld());
  const prng1 = playback1.getWorld().prng.state;

  const replay2 = createTestReplayData(43, inputs);
  const playback2 = new ReplayPlayback(replay2);
  playback2.seekTo(1200);
  while (playback2.processSeek(2000)) {}
  const checksum2 = computeWorldChecksum(playback2.getWorld());
  const prng2 = playback2.getWorld().prng.state;

  // PRNG states should definitely differ
  assertTrue(
    prng1 !== prng2 || checksum1 !== checksum2,
    'Different seeds should produce different PRNG states or checksums',
  );
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Replay Playback Tests');
console.log('=====================\n');

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
