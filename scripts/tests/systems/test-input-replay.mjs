/**
 * Input Replay and Determinism Tests
 *
 * Verifies that:
 * 1. Input encoding/decoding is lossless
 * 2. Replays produce identical results to original runs
 * 3. The game is deterministic (same seed + inputs = same result)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
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
// Encoding Tests
// ============================================================================

describe('Input Encoding', () => {
  it('encodeInput: empty state encodes to 0', () => {
    const state = createInputState();
    assert.strictEqual(encodeInput(state), 0, 'Empty state should encode to 0');
  });

  it('encodeInput: each flag maps to correct bit position', () => {
    // Test each flag individually encodes to exactly 2^bit
    // INPUT_BITS (from shared module) is the source of truth
    for (const [flag, bit] of Object.entries(INPUT_BITS)) {
      const state = createInputState();
      state[flag] = true;
      const encoded = encodeInput(state);
      const expected = 1 << bit;
      assert.strictEqual(
        encoded,
        expected,
        `${flag} should encode to ${expected} (2^${bit}), got ${encoded}`,
      );
    }
  });

  it('encodeInput: multiple flags encode correctly', () => {
    const state = createInputState();
    state.pitchUp = true; // bit 0 = 1
    state.accelerate = true; // bit 6 = 64
    state.firePrimary = true; // bit 9 = 512
    assert.strictEqual(
      encodeInput(state),
      1 + 64 + 512,
      'Combined flags should add up',
    );
  });

  it('decodeInput: 0 decodes to empty state', () => {
    const state = decodeInput(0);
    assert.ok(!state.pitchUp, 'pitchUp should be false');
    assert.ok(!state.accelerate, 'accelerate should be false');
    assert.ok(!state.firePrimary, 'firePrimary should be false');
  });

  it('decodeInput: single bit decodes correctly', () => {
    const state1 = decodeInput(1);
    assert.ok(state1.pitchUp, 'bit 0 should decode to pitchUp');
    assert.ok(!state1.pitchDown, 'other flags should be false');

    const state2 = decodeInput(512);
    assert.ok(state2.firePrimary, 'bit 9 should decode to firePrimary');
    assert.ok(!state2.pitchUp, 'other flags should be false');
  });

  it('encode/decode roundtrip preserves all flags', () => {
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
      assert.ok(verifyEncodingRoundtrip(state), `Roundtrip failed for ${flag}`);
    }
  });

  it('encode/decode roundtrip preserves complex states', () => {
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
      assert.strictEqual(reencoded, bits, `Roundtrip failed for bits ${bits}`);
    }
  });
});

// ============================================================================
// Recorder/Player Tests
// ============================================================================

describe('InputRecorder', () => {
  it('records inputs correctly', () => {
    const recorder = new InputRecorder(12345);

    const state1 = createInputState();
    state1.accelerate = true;
    recorder.record(state1);

    const state2 = createInputState();
    state2.firePrimary = true;
    recorder.record(state2);

    assert.strictEqual(
      recorder.getTickCount(),
      2,
      'Should have 2 ticks recorded',
    );

    const inputs = recorder.getInputs();
    assert.strictEqual(
      inputs[0],
      encodeInput(state1),
      'First input should match',
    );
    assert.strictEqual(
      inputs[1],
      encodeInput(state2),
      'Second input should match',
    );
  });
});

describe('InputPlayer', () => {
  it('plays back inputs correctly', () => {
    const inputs = [64, 512, 0, 576]; // accelerate, fire, nothing, both
    const player = new InputPlayer(inputs);

    assert.strictEqual(player.getTickCount(), 4, 'Should have 4 ticks');

    const state0 = player.getInputForTick(0);
    assert.ok(state0.accelerate, 'Tick 0: accelerate should be true');
    assert.ok(!state0.firePrimary, 'Tick 0: firePrimary should be false');

    const state1 = player.getInputForTick(1);
    assert.ok(!state1.accelerate, 'Tick 1: accelerate should be false');
    assert.ok(state1.firePrimary, 'Tick 1: firePrimary should be true');

    const state3 = player.getInputForTick(3);
    assert.ok(state3.accelerate, 'Tick 3: accelerate should be true');
    assert.ok(state3.firePrimary, 'Tick 3: firePrimary should be true');
  });

  it('handles out-of-range ticks', () => {
    const inputs = [64, 512];
    const player = new InputPlayer(inputs);

    const stateNeg = player.getInputForTick(-1);
    assert.strictEqual(
      encodeInput(stateNeg),
      0,
      'Negative tick should return empty',
    );

    const stateBeyond = player.getInputForTick(100);
    assert.strictEqual(
      encodeInput(stateBeyond),
      0,
      'Beyond range should return empty',
    );
  });

  it('applyInputForTick mutates target correctly', () => {
    const inputs = [576]; // accelerate + firePrimary
    const player = new InputPlayer(inputs);

    const target = createInputState();
    player.applyInputForTick(0, target);

    assert.ok(target.accelerate, 'accelerate should be applied');
    assert.ok(target.firePrimary, 'firePrimary should be applied');
    assert.ok(!target.pitchUp, 'pitchUp should remain false');
  });
});

// ============================================================================
// Determinism Tests
// ============================================================================

describe('Determinism', () => {
  it('same seed + inputs = same result', () => {
    const seed = 42;
    const inputs = generateScriptedInputs(600); // 10 seconds

    const result1 = runBattleSync(seed, inputs, 600);
    const result2 = runBattleSync(seed, inputs, 600);

    assert.strictEqual(
      result1.checksum,
      result2.checksum,
      'Checksums should match',
    );
    assert.strictEqual(
      result1.prngState,
      result2.prngState,
      'PRNG states should match',
    );
    assert.strictEqual(
      result1.gameTime,
      result2.gameTime,
      'Game times should match',
    );
    assert.strictEqual(
      result1.entityCount,
      result2.entityCount,
      'Entity counts should match',
    );
  });

  it('different seeds = different results', () => {
    const inputs = generateScriptedInputs(600);

    const result1 = runBattleSync(42, inputs, 600);
    const result2 = runBattleSync(43, inputs, 600);

    assert.ok(
      result1.checksum !== result2.checksum ||
        result1.prngState !== result2.prngState,
      'Different seeds should produce different results',
    );
  });

  it('longer simulation remains deterministic', () => {
    const seed = 99;
    const inputs = generateScriptedInputs(1800); // 30 seconds

    const result1 = runBattleSync(seed, inputs, 1800);
    const result2 = runBattleSync(seed, inputs, 1800);

    assert.strictEqual(
      result1.checksum,
      result2.checksum,
      'Checksums should match after 30s',
    );
    assert.strictEqual(
      result1.prngState,
      result2.prngState,
      'PRNG states should match after 30s',
    );
  });

  it('replay from recording matches original', () => {
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

    assert.strictEqual(
      replay.checksum,
      original.checksum,
      'Replay checksum should match original',
    );
    assert.strictEqual(
      replay.prngState,
      original.prngState,
      'Replay PRNG should match original',
    );
  });
});
