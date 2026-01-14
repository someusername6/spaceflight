/**
 * Input Replay and Determinism Tests
 *
 * Verifies that:
 * 1. Input encoding/decoding is lossless
 * 2. Replays produce identical results to original runs
 * 3. The game is deterministic (same seed + inputs = same result)
 */

import { createInputState } from '../../../src/core/types.ts';
import {
  decodeInput,
  encodeInput,
  verifyEncodingRoundtrip,
} from '../../../src/input/input-encoding.ts';
import {
  InputPlayer,
  InputRecorder,
} from '../../../src/input/input-recorder.ts';
import {
  generateScriptedInputs,
  INPUT_BITS,
  runBattleSync,
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
// Encoding Tests
// ============================================================================

test('encodeInput: empty state encodes to 0', () => {
  const state = createInputState();
  assertEqual(encodeInput(state), 0, 'Empty state should encode to 0');
});

test('encodeInput: each flag maps to correct bit position', () => {
  // Test each flag individually encodes to exactly 2^bit
  // INPUT_BITS (from shared module) is the source of truth
  for (const [flag, bit] of Object.entries(INPUT_BITS)) {
    const state = createInputState();
    state[flag] = true;
    const encoded = encodeInput(state);
    const expected = 1 << bit;
    assertEqual(
      encoded,
      expected,
      `${flag} should encode to ${expected} (2^${bit}), got ${encoded}`,
    );
  }
});

test('encodeInput: multiple flags encode correctly', () => {
  const state = createInputState();
  state.pitchUp = true; // bit 0 = 1
  state.accelerate = true; // bit 6 = 64
  state.firePrimary = true; // bit 9 = 512
  assertEqual(encodeInput(state), 1 + 64 + 512, 'Combined flags should add up');
});

test('decodeInput: 0 decodes to empty state', () => {
  const state = decodeInput(0);
  assertTrue(!state.pitchUp, 'pitchUp should be false');
  assertTrue(!state.accelerate, 'accelerate should be false');
  assertTrue(!state.firePrimary, 'firePrimary should be false');
});

test('decodeInput: single bit decodes correctly', () => {
  const state1 = decodeInput(1);
  assertTrue(state1.pitchUp, 'bit 0 should decode to pitchUp');
  assertTrue(!state1.pitchDown, 'other flags should be false');

  const state2 = decodeInput(512);
  assertTrue(state2.firePrimary, 'bit 9 should decode to firePrimary');
  assertTrue(!state2.pitchUp, 'other flags should be false');
});

test('encode/decode roundtrip preserves all flags', () => {
  // Test all possible single-flag states
  const flags = [
    'pitchUp',
    'pitchDown',
    'yawLeft',
    'yawRight',
    'rollLeft',
    'rollRight',
    'accelerate',
    'decelerate',
    'afterburner',
    'firePrimary',
    'fireSecondary',
    'launchDecoy',
    'cyclePrimary',
    'cycleSecondary',
    'cycleTargetNext',
    'cycleTargetPrev',
    'targetNearest',
    'toggleMatchSpeed',
  ];

  for (const flag of flags) {
    const state = createInputState();
    state[flag] = true;
    assertTrue(verifyEncodingRoundtrip(state), `Roundtrip failed for ${flag}`);
  }
});

test('encode/decode roundtrip preserves complex states', () => {
  // Test deterministic combinations using simple LCG
  // LCG: next = (a * current + c) mod m
  let seed = 12345;
  const a = 1103515245;
  const c = 12345;
  const m = 0x80000000; // 2^31

  for (let i = 0; i < 100; i++) {
    seed = (a * seed + c) % m;
    const bits = (seed >>> 0) & 0x3ffff; // 18 bits max
    const decoded = decodeInput(bits);
    const reencoded = encodeInput(decoded);
    assertEqual(reencoded, bits, `Roundtrip failed for bits ${bits}`);
  }
});

// ============================================================================
// Recorder/Player Tests
// ============================================================================

test('InputRecorder records inputs correctly', () => {
  const recorder = new InputRecorder(12345);

  const state1 = createInputState();
  state1.accelerate = true;
  recorder.record(state1);

  const state2 = createInputState();
  state2.firePrimary = true;
  recorder.record(state2);

  assertEqual(recorder.getTickCount(), 2, 'Should have 2 ticks recorded');

  const inputs = recorder.getInputs();
  assertEqual(inputs[0], encodeInput(state1), 'First input should match');
  assertEqual(inputs[1], encodeInput(state2), 'Second input should match');
});

test('InputPlayer plays back inputs correctly', () => {
  const inputs = [64, 512, 0, 576]; // accelerate, fire, nothing, both
  const player = new InputPlayer(inputs);

  assertEqual(player.getTickCount(), 4, 'Should have 4 ticks');

  const state0 = player.getInputForTick(0);
  assertTrue(state0.accelerate, 'Tick 0: accelerate should be true');
  assertTrue(!state0.firePrimary, 'Tick 0: firePrimary should be false');

  const state1 = player.getInputForTick(1);
  assertTrue(!state1.accelerate, 'Tick 1: accelerate should be false');
  assertTrue(state1.firePrimary, 'Tick 1: firePrimary should be true');

  const state3 = player.getInputForTick(3);
  assertTrue(state3.accelerate, 'Tick 3: accelerate should be true');
  assertTrue(state3.firePrimary, 'Tick 3: firePrimary should be true');
});

test('InputPlayer handles out-of-range ticks', () => {
  const inputs = [64, 512];
  const player = new InputPlayer(inputs);

  const stateNeg = player.getInputForTick(-1);
  assertEqual(encodeInput(stateNeg), 0, 'Negative tick should return empty');

  const stateBeyond = player.getInputForTick(100);
  assertEqual(encodeInput(stateBeyond), 0, 'Beyond range should return empty');
});

test('InputPlayer applyInputForTick mutates target correctly', () => {
  const inputs = [576]; // accelerate + firePrimary
  const player = new InputPlayer(inputs);

  const target = createInputState();
  player.applyInputForTick(0, target);

  assertTrue(target.accelerate, 'accelerate should be applied');
  assertTrue(target.firePrimary, 'firePrimary should be applied');
  assertTrue(!target.pitchUp, 'pitchUp should remain false');
});

// ============================================================================
// Determinism Tests
// ============================================================================

test('determinism: same seed + inputs = same result', () => {
  const seed = 42;
  const inputs = generateScriptedInputs(600); // 10 seconds

  const result1 = runBattleSync(seed, inputs, 600);
  const result2 = runBattleSync(seed, inputs, 600);

  assertEqual(result1.checksum, result2.checksum, 'Checksums should match');
  assertEqual(result1.prngState, result2.prngState, 'PRNG states should match');
  assertEqual(result1.gameTime, result2.gameTime, 'Game times should match');
  assertEqual(
    result1.entityCount,
    result2.entityCount,
    'Entity counts should match',
  );
});

test('determinism: different seeds = different results', () => {
  const inputs = generateScriptedInputs(600);

  const result1 = runBattleSync(42, inputs, 600);
  const result2 = runBattleSync(43, inputs, 600);

  assertTrue(
    result1.checksum !== result2.checksum ||
      result1.prngState !== result2.prngState,
    'Different seeds should produce different results',
  );
});

test('determinism: longer simulation remains deterministic', () => {
  const seed = 99;
  const inputs = generateScriptedInputs(1800); // 30 seconds

  const result1 = runBattleSync(seed, inputs, 1800);
  const result2 = runBattleSync(seed, inputs, 1800);

  assertEqual(
    result1.checksum,
    result2.checksum,
    'Checksums should match after 30s',
  );
  assertEqual(
    result1.prngState,
    result2.prngState,
    'PRNG states should match after 30s',
  );
});

test('determinism: replay from recording matches original', () => {
  const seed = 12345;

  // "Record" by generating scripted inputs
  const recorder = new InputRecorder(seed);
  const inputs = generateScriptedInputs(600);
  for (const bits of inputs) {
    recorder.recordRaw(bits);
  }

  // Run original
  const original = runBattleSync(seed, inputs, 600);

  // Run replay from recording
  const replay = runBattleSync(seed, recorder.getInputs(), 600);

  assertEqual(
    replay.checksum,
    original.checksum,
    'Replay checksum should match original',
  );
  assertEqual(
    replay.prngState,
    original.prngState,
    'Replay PRNG should match original',
  );
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Input Replay and Determinism Tests');
console.log('==================================\n');

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
