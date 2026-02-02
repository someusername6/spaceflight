/**
 * Input Recording and Playback
 *
 * Records player input each tick for replay functionality.
 * Uses bitmask encoding for compact storage (~72KB for 5-minute battle).
 */

import type { InputState } from '../core/types';
import type { ReplayShipLoadout, ReplayWingman } from '../replay/types';
import type { PlayerAutoaim } from '../settings/game-settings';
import { applyDecodedInput, decodeInput, encodeInput } from './input-encoding';

/**
 * Replay file format.
 * Contains all data needed to reproduce a battle.
 */
export interface ReplayData {
  /** Format version for future compatibility */
  version: 1;
  /** Game seed for world creation */
  seed: number;
  /** Input bitmask for each tick (index = tick number) */
  inputs: number[];
  /** Total ticks recorded */
  tickCount: number;
  /** Optional metadata */
  metadata?: {
    /** Mission ID if applicable */
    missionId?: string;
    /** Recording timestamp */
    recordedAt?: number;
    /** Game version */
    gameVersion?: string;
  };
}

/**
 * Records player input each tick.
 * Call record() once per tick during gameplay.
 */
export class InputRecorder {
  private inputs: number[] = [];
  private seed: number;
  private missionId: string | undefined;
  private playerLoadout: ReplayShipLoadout | undefined;
  private wingmen: ReplayWingman[] = [];
  private playerAutoaim: PlayerAutoaim;

  constructor(
    seed: number,
    missionId: string | undefined,
    playerAutoaim: PlayerAutoaim,
  ) {
    this.seed = seed;
    this.missionId = missionId;
    this.playerAutoaim = playerAutoaim;
  }

  /**
   * Store deployment loadout data for replay reconstruction.
   * Call this at mission start after spawning ships.
   */
  setDeployment(
    playerLoadout: ReplayShipLoadout,
    wingmen: ReplayWingman[],
  ): void {
    this.playerLoadout = playerLoadout;
    this.wingmen = wingmen;
  }

  /**
   * Get stored player loadout.
   */
  getPlayerLoadout(): ReplayShipLoadout | undefined {
    return this.playerLoadout;
  }

  /**
   * Get stored wingmen data.
   */
  getWingmen(): ReplayWingman[] {
    return this.wingmen;
  }

  /**
   * Get stored player autoaim setting.
   */
  getPlayerAutoaim(): PlayerAutoaim {
    return this.playerAutoaim;
  }

  /**
   * Record input for the current tick.
   * Must be called exactly once per tick in order.
   */
  record(state: InputState): void {
    this.inputs.push(encodeInput(state));
  }

  /**
   * Record a raw bitmask (for testing or network input).
   */
  recordRaw(bits: number): void {
    this.inputs.push(bits);
  }

  /**
   * Get the current tick count.
   */
  getTickCount(): number {
    return this.inputs.length;
  }

  /**
   * Get the complete replay data.
   */
  getReplayData(): ReplayData {
    const metadata: ReplayData['metadata'] = {
      recordedAt: Date.now(),
    };
    if (this.missionId !== undefined) {
      metadata.missionId = this.missionId;
    }
    return {
      version: 1,
      seed: this.seed,
      inputs: [...this.inputs],
      tickCount: this.inputs.length,
      metadata,
    };
  }

  /**
   * Get just the input array (for compact storage or comparison).
   */
  getInputs(): number[] {
    return [...this.inputs];
  }

  /**
   * Clear recorded data (for reuse).
   */
  clear(): void {
    this.inputs = [];
  }
}

/**
 * Plays back recorded input during replay.
 * Replaces live keyboard input with recorded data.
 */
export class InputPlayer {
  private inputs: number[];
  private tickCount: number;

  constructor(replayData: ReplayData | number[]) {
    if (Array.isArray(replayData)) {
      this.inputs = [...replayData];
      this.tickCount = replayData.length;
    } else {
      this.inputs = [...replayData.inputs];
      this.tickCount = replayData.tickCount;
    }
  }

  /**
   * Get input state for a specific tick.
   * Returns empty input if tick is out of range.
   */
  getInputForTick(tick: number): InputState {
    if (tick < 0 || tick >= this.tickCount) {
      return decodeInput(0); // All false
    }
    return decodeInput(this.inputs[tick] ?? 0);
  }

  /**
   * Get raw bitmask for a specific tick.
   */
  getRawInputForTick(tick: number): number {
    if (tick < 0 || tick >= this.tickCount) {
      return 0;
    }
    return this.inputs[tick] ?? 0;
  }

  /**
   * Apply input for a tick directly to an InputState object.
   * More efficient than creating a new object each tick.
   */
  applyInputForTick(tick: number, target: InputState): void {
    const bits =
      tick >= 0 && tick < this.tickCount ? (this.inputs[tick] ?? 0) : 0;
    applyDecodedInput(target, bits);
  }

  /**
   * Get total tick count.
   */
  getTickCount(): number {
    return this.tickCount;
  }

  /**
   * Check if a tick is within the recorded range.
   */
  hasTickData(tick: number): boolean {
    return tick >= 0 && tick < this.tickCount;
  }
}
