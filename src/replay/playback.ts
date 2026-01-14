/**
 * Replay Playback Controller
 *
 * Manages world simulation from replay data.
 * Features:
 * - Variable playback speed (0.25x to 4x)
 * - Pause/resume
 * - Seeking (via restart + fast-forward for MVP)
 */

import type { WaveState } from '../campaign/mission/mission-waves';
import type { Contract } from '../campaign/types';
import type { PlayerControlled } from '../components/player';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';
import { SIMULATION_SYSTEMS } from '../game';
import { InputPlayer } from '../input/input-recorder';
import { decodeRLE } from './compression';
import {
  isReplayMissionComplete,
  setupReplayWorld,
  tickReplayWaves,
} from './mission-setup';
import type { FullReplayData, PlaybackState, ReplayMetadata } from './types';
import {
  DEFAULT_SEEK_TICKS_PER_FRAME,
  PLAYBACK_SPEEDS,
  TICK_SEC,
} from './types';

/**
 * Replay Playback Controller
 *
 * Manages playback of recorded input sequences.
 * Supports variable speed, pause/resume, and seeking.
 */
export class ReplayPlayback {
  private replay: FullReplayData;
  private inputs: number[];
  private world: World;
  private waveState: WaveState;
  private mission: Contract;
  private inputPlayer: InputPlayer;
  private currentTick: number = 0;
  private playbackSpeed: number = 1;
  private state: PlaybackState = 'paused';

  // Seeking state
  private seekTarget: number | null = null;
  private seekProgress: number = 0;

  constructor(replay: FullReplayData) {
    this.replay = replay;

    // Decompress inputs if needed
    this.inputs = replay.inputsCompressed
      ? decodeRLE(replay.inputs, true)
      : [...replay.inputs];

    this.inputPlayer = new InputPlayer(this.inputs);

    // Set up mission from replay metadata (v3+ includes loadout for determinism)
    const { world, waveState, mission } = setupReplayWorld(
      replay.seed,
      replay.metadata.missionId,
      replay.metadata.shipType,
      replay.playerLoadout,
      replay.wingmen,
    );
    this.world = world;
    this.waveState = waveState;
    this.mission = mission;
  }

  /**
   * Reinitialize world for seeking.
   */
  private reinitializeWorld(): void {
    const { world, waveState, mission } = setupReplayWorld(
      this.replay.seed,
      this.replay.metadata.missionId,
      this.replay.metadata.shipType,
      this.replay.playerLoadout,
      this.replay.wingmen,
    );
    this.world = world;
    this.waveState = waveState;
    this.mission = mission;
    this.currentTick = 0;
  }

  /**
   * Advance simulation by one tick.
   * Returns false if playback has ended.
   */
  tick(): boolean {
    if (this.state === 'ended') {
      return false;
    }

    if (this.currentTick >= this.replay.tickCount) {
      this.state = 'ended';
      return false;
    }

    this.simulateTick();

    // Check for mission complete
    if (isReplayMissionComplete(this.waveState)) {
      // Don't immediately end - let explosions settle
      // The viewer can check isReplayMissionComplete if needed
    }

    return true;
  }

  /**
   * Core simulation step - apply input, run systems, advance tick.
   * Shared between tick() and seeking.
   */
  private simulateTick(): void {
    // Apply input for current tick to player entity
    for (const entity of queryEntities(this.world, ['playerControlled'])) {
      const player = getComponent<PlayerControlled>(
        this.world,
        entity,
        'playerControlled',
      );
      if (player) {
        this.inputPlayer.applyInputForTick(this.currentTick, player.input);
      }
    }

    // Update game time
    this.world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SIMULATION_SYSTEMS) {
      system(this.world, TICK_SEC);
    }

    // Process wave spawning
    tickReplayWaves(this.world, this.waveState, this.mission, TICK_SEC);

    this.currentTick++;
  }

  /**
   * Seek to a specific tick.
   * For MVP: restarts from beginning and fast-forwards.
   */
  seekTo(targetTick: number): void {
    // Clamp to valid range
    const clampedTarget = Math.max(
      0,
      Math.min(targetTick, this.replay.tickCount - 1),
    );

    if (clampedTarget === this.currentTick) return;

    // Always restart from beginning (MVP approach)
    this.reinitializeWorld();
    this.seekTarget = clampedTarget;
    this.seekProgress = 0;
    this.state = 'loading';
  }

  /**
   * Process seeking. Call each frame during loading state.
   * Returns true if still seeking, false when done.
   */
  processSeek(
    maxTicksPerFrame: number = DEFAULT_SEEK_TICKS_PER_FRAME,
  ): boolean {
    if (this.seekTarget === null) return false;

    const ticksToProcess = Math.min(
      maxTicksPerFrame,
      this.seekTarget - this.currentTick,
    );

    for (let i = 0; i < ticksToProcess; i++) {
      this.tickInternal();
    }

    this.seekProgress =
      this.seekTarget > 0 ? this.currentTick / this.seekTarget : 1;

    if (this.currentTick >= this.seekTarget) {
      this.seekTarget = null;
      this.state = 'paused';
      return false;
    }

    return true;
  }

  /**
   * Internal tick without state checks (for seeking).
   */
  private tickInternal(): void {
    if (this.currentTick >= this.replay.tickCount) return;
    this.simulateTick();
  }

  // =========================================================================
  // Playback Controls
  // =========================================================================

  play(): void {
    if (this.state !== 'ended' && this.seekTarget === null) {
      this.state = 'playing';
    }
  }

  pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
    }
  }

  togglePlayPause(): void {
    if (this.state === 'playing') {
      this.pause();
    } else if (this.state === 'paused') {
      this.play();
    }
  }

  setSpeed(speed: number): void {
    if ((PLAYBACK_SPEEDS as readonly number[]).includes(speed)) {
      this.playbackSpeed = speed;
    }
  }

  cycleSpeed(): void {
    const idx = PLAYBACK_SPEEDS.indexOf(
      this.playbackSpeed as 0.25 | 0.5 | 1 | 2 | 4,
    );
    const nextIdx = (idx + 1) % PLAYBACK_SPEEDS.length;
    this.playbackSpeed = PLAYBACK_SPEEDS[nextIdx] ?? 1;
  }

  // =========================================================================
  // State Getters
  // =========================================================================

  getWorld(): World {
    return this.world;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getTotalTicks(): number {
    return this.replay.tickCount;
  }

  getState(): PlaybackState {
    return this.state;
  }

  getSpeed(): number {
    return this.playbackSpeed;
  }

  getSeekProgress(): number {
    return this.seekProgress;
  }

  getMetadata(): ReplayMetadata {
    return this.replay.metadata;
  }

  getCurrentTimeSeconds(): number {
    return this.currentTick / 60;
  }

  getTotalTimeSeconds(): number {
    return this.replay.tickCount / 60;
  }

  getProgressPercent(): number {
    if (this.replay.tickCount === 0) return 0;
    return (this.currentTick / this.replay.tickCount) * 100;
  }

  isSeeking(): boolean {
    return this.seekTarget !== null;
  }

  isComplete(): boolean {
    return isReplayMissionComplete(this.waveState);
  }
}
