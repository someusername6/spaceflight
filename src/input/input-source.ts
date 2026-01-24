/**
 * Input Source Abstraction - Unified interface for different input providers.
 *
 * This abstraction allows the game to receive input from multiple sources:
 * - Keyboard (local player)
 * - Replay (playback mode)
 * - Network (remote players in multiplayer)
 *
 * Each player entity can have its own InputSource, enabling multiplayer
 * where different players receive input from different sources.
 */

import type { InputState } from '../core/types';
import { applyDecodedInput, encodeInput } from './input-encoding';
import type { InputPlayer, InputRecorder } from './input-recorder';
import { getKeyBindings } from './key-bindings';

/**
 * Interface for any source of player input.
 * Implementations provide input state for a single player each tick.
 */
export interface InputSource {
  /** Unique identifier for this input source */
  readonly id: string;

  /** Human-readable name for debugging */
  readonly name: string;

  /**
   * Read current input state.
   * Called once per tick to get the player's current input.
   */
  readInput(target: InputState): void;

  /**
   * Get the raw bitmask of current input (for recording/network).
   */
  getInputBits(): number;

  /**
   * Called when input source should be cleaned up.
   */
  dispose(): void;
}

/**
 * Keyboard input source - reads from local keyboard.
 * Each KeyboardInputSource manages its own pressed keys state.
 */
export class KeyboardInputSource implements InputSource {
  readonly id: string;
  readonly name = 'Keyboard';

  private pressedKeys = new Set<string>();
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleBlur: () => void;

  constructor(id: string = 'local') {
    this.id = id;

    // Create bound handlers
    this.handleKeyDown = (e: KeyboardEvent) => {
      // Don't track keys when interacting with form controls
      const target = e.target as HTMLElement;
      const isFormControl =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.isContentEditable;
      if (isFormControl) return;

      this.pressedKeys.add(e.code);
      // Prevent browser defaults for game keys
      const bindings = getKeyBindings();
      if (Object.values(bindings).includes(e.code)) {
        e.preventDefault();
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      this.pressedKeys.delete(e.code);
    };

    this.handleBlur = () => {
      this.pressedKeys.clear();
    };

    // Attach listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  readInput(target: InputState): void {
    const bindings = getKeyBindings();

    // Movement
    target.pitchUp = this.pressedKeys.has(bindings.pitchUp);
    target.pitchDown = this.pressedKeys.has(bindings.pitchDown);
    target.yawLeft = this.pressedKeys.has(bindings.yawLeft);
    target.yawRight = this.pressedKeys.has(bindings.yawRight);
    target.rollLeft = this.pressedKeys.has(bindings.rollLeft);
    target.rollRight = this.pressedKeys.has(bindings.rollRight);
    target.accelerate = this.pressedKeys.has(bindings.accelerate);
    target.decelerate = this.pressedKeys.has(bindings.decelerate);
    target.afterburner = this.pressedKeys.has(bindings.afterburner);

    // Combat
    target.firePrimary = this.pressedKeys.has(bindings.firePrimary);
    target.fireSecondary = this.pressedKeys.has(bindings.fireSecondary);
    target.launchDecoy = this.pressedKeys.has(bindings.launchDecoy);
    target.cyclePrimary = this.pressedKeys.has(bindings.cyclePrimary);
    target.cycleSecondary = this.pressedKeys.has(bindings.cycleSecondary);
    target.cycleTargetNext = this.pressedKeys.has(bindings.cycleTargetNext);
    target.cycleTargetPrev = this.pressedKeys.has(bindings.cycleTargetPrev);
    target.targetNearest = this.pressedKeys.has(bindings.targetNearest);
    target.toggleMatchSpeed = this.pressedKeys.has(bindings.toggleMatchSpeed);
  }

  getInputBits(): number {
    // Build a temporary InputState to encode
    const temp: InputState = {
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
    this.readInput(temp);
    return encodeInput(temp);
  }

  /** Check if a specific key is currently pressed */
  isKeyPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.pressedKeys.clear();
  }
}

/**
 * Replay input source - reads from recorded input data.
 * Used for replay playback mode.
 */
export class ReplayInputSource implements InputSource {
  readonly id: string;
  readonly name = 'Replay';

  private player: InputPlayer;
  private currentTick = 0;

  constructor(player: InputPlayer, id: string = 'replay') {
    this.id = id;
    this.player = player;
  }

  readInput(target: InputState): void {
    this.player.applyInputForTick(this.currentTick, target);
    this.currentTick++;
  }

  getInputBits(): number {
    return this.player.getRawInputForTick(this.currentTick);
  }

  /** Get current playback tick */
  getTick(): number {
    return this.currentTick;
  }

  /** Get total tick count in replay */
  getTickCount(): number {
    return this.player.getTickCount();
  }

  /** Seek to a specific tick */
  seek(tick: number): void {
    const maxTick = this.player.getTickCount();
    this.currentTick = Math.max(0, Math.min(tick, maxTick - 1));
  }

  /** Check if replay has finished */
  isFinished(): boolean {
    return this.currentTick >= this.player.getTickCount();
  }

  dispose(): void {
    // Nothing to clean up
  }
}

/**
 * Network input source - receives input from a remote player.
 * Placeholder for multiplayer implementation.
 */
export class NetworkInputSource implements InputSource {
  readonly id: string;
  readonly name: string;

  private inputBuffer: number[] = [];
  private currentTick = 0;

  constructor(playerId: string, playerName: string = 'Remote Player') {
    this.id = playerId;
    this.name = playerName;
  }

  readInput(target: InputState): void {
    // Get input for current tick from buffer
    const bits =
      this.currentTick < this.inputBuffer.length
        ? (this.inputBuffer[this.currentTick] ?? 0)
        : 0;
    applyDecodedInput(target, bits);
    this.currentTick++;
  }

  getInputBits(): number {
    return this.currentTick < this.inputBuffer.length
      ? (this.inputBuffer[this.currentTick] ?? 0)
      : 0;
  }

  /**
   * Receive input bits from network.
   * Called when network message arrives with remote player's input.
   */
  receiveInput(tick: number, bits: number): void {
    // Ensure buffer is large enough
    while (this.inputBuffer.length <= tick) {
      this.inputBuffer.push(0);
    }
    this.inputBuffer[tick] = bits;
  }

  /**
   * Receive a batch of inputs (for catch-up or initial sync).
   */
  receiveInputBatch(startTick: number, inputs: number[]): void {
    for (let i = 0; i < inputs.length; i++) {
      this.receiveInput(startTick + i, inputs[i] ?? 0);
    }
  }

  /** Get how many ticks we have buffered ahead of current tick */
  getBufferedTicks(): number {
    return Math.max(0, this.inputBuffer.length - this.currentTick);
  }

  /** Check if we have input for the current tick */
  hasInputForCurrentTick(): boolean {
    return this.currentTick < this.inputBuffer.length;
  }

  dispose(): void {
    this.inputBuffer = [];
  }
}

/**
 * Recording wrapper - wraps another InputSource and records its output.
 * Used to record local player input during live gameplay.
 */
export class RecordingInputSource implements InputSource {
  readonly id: string;
  readonly name: string;

  private source: InputSource;
  private recorder: InputRecorder;

  constructor(source: InputSource, recorder: InputRecorder) {
    this.source = source;
    this.recorder = recorder;
    this.id = source.id;
    this.name = `Recording(${source.name})`;
  }

  readInput(target: InputState): void {
    this.source.readInput(target);
    // Record after reading
    this.recorder.record(target);
  }

  getInputBits(): number {
    return this.source.getInputBits();
  }

  /** Get the underlying source */
  getWrappedSource(): InputSource {
    return this.source;
  }

  /** Get the recorder */
  getRecorder(): InputRecorder {
    return this.recorder;
  }

  dispose(): void {
    this.source.dispose();
  }
}
