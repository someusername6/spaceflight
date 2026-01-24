/**
 * Tests for InputSource abstraction.
 */

import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';

// Mock window for KeyboardInputSource tests
globalThis.window = {
  addEventListener: mock.fn(),
  removeEventListener: mock.fn(),
};

import { encodeInput } from '../../../src/input/input-encoding.ts';
import {
  InputPlayer,
  InputRecorder,
} from '../../../src/input/input-recorder.ts';
import {
  KeyboardInputSource,
  NetworkInputSource,
  RecordingInputSource,
  ReplayInputSource,
} from '../../../src/input/input-source.ts';

/** Create an empty input state */
function createEmptyInput() {
  return {
    pitchUp: false,
    pitchDown: false,
    yawLeft: false,
    yawRight: false,
    rollLeft: false,
    rollRight: false,
    accelerate: false,
    decelerate: false,
    afterburner: false,
    firePrimary: false,
    fireSecondary: false,
    launchDecoy: false,
    cyclePrimary: false,
    cycleSecondary: false,
    cycleTargetNext: false,
    cycleTargetPrev: false,
    targetNearest: false,
    toggleMatchSpeed: false,
  };
}

describe('KeyboardInputSource', () => {
  beforeEach(() => {
    // Reset mocks
    globalThis.window.addEventListener.mock.resetCalls();
    globalThis.window.removeEventListener.mock.resetCalls();
  });

  it('registers event listeners on construction', () => {
    const source = new KeyboardInputSource('test');

    assert.strictEqual(window.addEventListener.mock.callCount(), 3);
    const calls = window.addEventListener.mock.calls;
    assert.strictEqual(calls[0].arguments[0], 'keydown');
    assert.strictEqual(calls[1].arguments[0], 'keyup');
    assert.strictEqual(calls[2].arguments[0], 'blur');

    source.dispose();
  });

  it('removes event listeners on dispose', () => {
    const source = new KeyboardInputSource('test');
    source.dispose();

    assert.strictEqual(window.removeEventListener.mock.callCount(), 3);
  });

  it('has correct id and name', () => {
    const source = new KeyboardInputSource('player1');

    assert.strictEqual(source.id, 'player1');
    assert.strictEqual(source.name, 'Keyboard');

    source.dispose();
  });

  it('returns all false when no keys pressed', () => {
    const source = new KeyboardInputSource('test');
    const input = createEmptyInput();

    source.readInput(input);

    assert.strictEqual(input.pitchUp, false);
    assert.strictEqual(input.accelerate, false);
    assert.strictEqual(input.firePrimary, false);

    source.dispose();
  });
});

describe('ReplayInputSource', () => {
  it('reads input from replay data', () => {
    // Create replay with some input
    const inputs = [
      encodeInput({ ...createEmptyInput(), accelerate: true }),
      encodeInput({ ...createEmptyInput(), firePrimary: true }),
      encodeInput({ ...createEmptyInput(), pitchUp: true }),
    ];
    const player = new InputPlayer(inputs);
    const source = new ReplayInputSource(player, 'replay1');

    // Read first tick
    const input1 = createEmptyInput();
    source.readInput(input1);
    assert.strictEqual(input1.accelerate, true);
    assert.strictEqual(input1.firePrimary, false);

    // Read second tick
    const input2 = createEmptyInput();
    source.readInput(input2);
    assert.strictEqual(input2.accelerate, false);
    assert.strictEqual(input2.firePrimary, true);

    // Read third tick
    const input3 = createEmptyInput();
    source.readInput(input3);
    assert.strictEqual(input3.pitchUp, true);

    source.dispose();
  });

  it('tracks current tick', () => {
    const inputs = [0, 0, 0, 0, 0];
    const player = new InputPlayer(inputs);
    const source = new ReplayInputSource(player);

    assert.strictEqual(source.getTick(), 0);

    source.readInput(createEmptyInput());
    assert.strictEqual(source.getTick(), 1);

    source.readInput(createEmptyInput());
    assert.strictEqual(source.getTick(), 2);

    source.dispose();
  });

  it('can seek to specific tick', () => {
    const inputs = [0, 0, 0, 0, 0];
    const player = new InputPlayer(inputs);
    const source = new ReplayInputSource(player);

    source.seek(3);
    assert.strictEqual(source.getTick(), 3);

    // Clamps to valid range
    source.seek(100);
    assert.strictEqual(source.getTick(), 4); // Last valid tick

    source.seek(-5);
    assert.strictEqual(source.getTick(), 0);

    source.dispose();
  });

  it('reports when finished', () => {
    const inputs = [0, 0];
    const player = new InputPlayer(inputs);
    const source = new ReplayInputSource(player);

    assert.strictEqual(source.isFinished(), false);

    source.readInput(createEmptyInput());
    assert.strictEqual(source.isFinished(), false);

    source.readInput(createEmptyInput());
    assert.strictEqual(source.isFinished(), true);

    source.dispose();
  });
});

describe('NetworkInputSource', () => {
  it('returns empty input when no data received', () => {
    const source = new NetworkInputSource('player2', 'Remote Player 2');
    const input = createEmptyInput();

    source.readInput(input);

    // All should be false
    assert.strictEqual(input.accelerate, false);
    assert.strictEqual(input.firePrimary, false);

    source.dispose();
  });

  it('receives and returns network input', () => {
    const source = new NetworkInputSource('player2');

    // Receive input for tick 0
    source.receiveInput(
      0,
      encodeInput({ ...createEmptyInput(), accelerate: true }),
    );

    const input = createEmptyInput();
    source.readInput(input);

    assert.strictEqual(input.accelerate, true);

    source.dispose();
  });

  it('receives batch of inputs', () => {
    const source = new NetworkInputSource('player2');

    const inputs = [
      encodeInput({ ...createEmptyInput(), accelerate: true }),
      encodeInput({ ...createEmptyInput(), firePrimary: true }),
    ];
    source.receiveInputBatch(0, inputs);

    const input1 = createEmptyInput();
    source.readInput(input1);
    assert.strictEqual(input1.accelerate, true);

    const input2 = createEmptyInput();
    source.readInput(input2);
    assert.strictEqual(input2.firePrimary, true);

    source.dispose();
  });

  it('tracks buffered ticks', () => {
    const source = new NetworkInputSource('player2');

    assert.strictEqual(source.getBufferedTicks(), 0);
    assert.strictEqual(source.hasInputForCurrentTick(), false);

    source.receiveInput(0, 0);
    source.receiveInput(1, 0);
    source.receiveInput(2, 0);

    assert.strictEqual(source.getBufferedTicks(), 3);
    assert.strictEqual(source.hasInputForCurrentTick(), true);

    source.readInput(createEmptyInput()); // consume tick 0
    assert.strictEqual(source.getBufferedTicks(), 2);

    source.dispose();
  });
});

describe('RecordingInputSource', () => {
  beforeEach(() => {
    globalThis.window.addEventListener.mock.resetCalls();
    globalThis.window.removeEventListener.mock.resetCalls();
  });

  it('wraps another source and records', () => {
    // Create a simple mock source
    const mockSource = {
      id: 'mock',
      name: 'Mock',
      readInput: (target) => {
        target.accelerate = true;
      },
      getInputBits: () =>
        encodeInput({ ...createEmptyInput(), accelerate: true }),
      dispose: mock.fn(),
    };

    const recorder = new InputRecorder(12345, 'test-mission', 'off');
    const source = new RecordingInputSource(mockSource, recorder);

    assert.strictEqual(source.id, 'mock');
    assert.strictEqual(source.name, 'Recording(Mock)');

    // Read input - should also record
    const input = createEmptyInput();
    source.readInput(input);

    assert.strictEqual(input.accelerate, true);
    assert.strictEqual(recorder.getTickCount(), 1);

    // Read again
    source.readInput(createEmptyInput());
    assert.strictEqual(recorder.getTickCount(), 2);

    // Check recorded data
    const inputs = recorder.getInputs();
    assert.strictEqual(inputs.length, 2);
    assert.strictEqual(
      inputs[0],
      encodeInput({ ...createEmptyInput(), accelerate: true }),
    );

    source.dispose();
    assert.strictEqual(mockSource.dispose.mock.callCount(), 1);
  });

  it('provides access to wrapped source and recorder', () => {
    const mockSource = {
      id: 'mock',
      name: 'Mock',
      readInput: () => {},
      getInputBits: () => 0,
      dispose: () => {},
    };

    const recorder = new InputRecorder(12345, 'test', 'off');
    const source = new RecordingInputSource(mockSource, recorder);

    assert.strictEqual(source.getWrappedSource(), mockSource);
    assert.strictEqual(source.getRecorder(), recorder);

    source.dispose();
  });
});
