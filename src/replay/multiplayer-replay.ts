/**
 * Multiplayer Replay Support
 *
 * Records and plays back multiplayer missions with inputs from all players.
 * Handles:
 * - Per-player input recording with RLE compression
 * - Player join/leave mid-mission
 * - Multi-player playback with entity mapping
 */

import type { PlayerId } from 'rollback-netcode';

import type { PlayerAutoaim } from '../settings/game-settings';
import { encodeRLE } from './compression';
import type {
  FullReplayData,
  MultiplayerReplayData,
  MultiplayerReplayInputs,
  MultiplayerReplayPlayer,
  ReplayShipLoadout,
  ReplayWingman,
} from './types';
import { REPLAY_VERSION } from './types';

// Re-export playback classes and utilities from the playback module
export {
  createPlayerEntityMapFromReplay,
  findPlayerEntityById,
  MultiplayerReplayPlayback,
} from './multiplayer-replay-playback';

// =============================================================================
// Multiplayer Input Recorder
// =============================================================================

/**
 * Tracks a single player's inputs during recording.
 */
interface PlayerInputTracker {
  playerId: string;
  inputs: number[];
  startTick: number;
  endTick: number | null;
}

/**
 * Records inputs from multiple players during a multiplayer mission.
 *
 * Usage:
 * 1. Create recorder at mission start
 * 2. Call addPlayer() when players join
 * 3. Call recordInputs() each tick with all player inputs
 * 4. Call removePlayer() when players leave
 * 5. Call buildReplayData() at mission end
 */
export class MultiplayerInputRecorder {
  private playerTrackers: Map<string, PlayerInputTracker> = new Map();
  private currentTick = 0;
  private readonly seed: number;
  private readonly missionId: string;
  private wingmen: ReplayWingman[] = [];
  private playerAutoaim: PlayerAutoaim = 0;

  constructor(seed: number, missionId: string) {
    this.seed = seed;
    this.missionId = missionId;
  }

  /**
   * Store AI wingmen data for replay reconstruction.
   * Call after spawning ships, before gameplay starts.
   *
   * @param wingmen - AI wingman data (excluding player-controlled ships)
   * @param playerAutoaim - Autoaim setting for replay
   */
  setWingmen(wingmen: ReplayWingman[], playerAutoaim: PlayerAutoaim): void {
    this.wingmen = wingmen;
    this.playerAutoaim = playerAutoaim;
  }

  /**
   * Get stored AI wingmen data.
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
   * Add a player to the recording.
   * Call when a player joins the mission.
   */
  addPlayer(playerId: string): void {
    if (this.playerTrackers.has(playerId)) return;

    this.playerTrackers.set(playerId, {
      playerId,
      inputs: [],
      startTick: this.currentTick,
      endTick: null,
    });
  }

  /**
   * Record inputs for all active players for the current tick.
   */
  recordInputs(inputs: Map<PlayerId, number>): void {
    for (const [playerId, bits] of inputs) {
      const tracker = this.playerTrackers.get(playerId);
      if (tracker && tracker.endTick === null) {
        // Fill any missing ticks with 0 (no input)
        while (tracker.inputs.length < this.currentTick - tracker.startTick) {
          tracker.inputs.push(0);
        }
        tracker.inputs.push(bits);
      }
    }
    this.currentTick++;
  }

  /**
   * Mark a player as having left the mission.
   */
  removePlayer(playerId: string): void {
    const tracker = this.playerTrackers.get(playerId);
    if (tracker && tracker.endTick === null) {
      tracker.endTick = this.currentTick;
    }
  }

  /**
   * Get the current tick count.
   */
  getTickCount(): number {
    return this.currentTick;
  }

  /**
   * Get seed for replay construction.
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get mission ID for replay construction.
   */
  getMissionId(): string {
    return this.missionId;
  }

  /**
   * Build compressed input streams for all players.
   */
  buildPlayerInputs(): MultiplayerReplayInputs[] {
    const result: MultiplayerReplayInputs[] = [];

    for (const tracker of this.playerTrackers.values()) {
      const { data, compressed } = encodeRLE(tracker.inputs);
      result.push({
        playerId: tracker.playerId,
        inputs: data,
        inputsCompressed: compressed,
        startTick: tracker.startTick,
      });
    }

    return result;
  }

  /**
   * Get player trackers for building player list.
   */
  getPlayerTrackers(): Map<string, PlayerInputTracker> {
    return this.playerTrackers;
  }
}

// =============================================================================
// Multiplayer Replay Data Builder
// =============================================================================

/**
 * Player info for building replay data.
 */
export interface MultiplayerPlayerInfo {
  playerId: string;
  callsign: string;
  shipEntityId: number;
  campaignShipId: string;
  isHost: boolean;
  loadout: ReplayShipLoadout;
}

/**
 * Build complete multiplayer replay data from recording.
 */
export function buildMultiplayerReplayData(
  recorder: MultiplayerInputRecorder,
  playerInfos: MultiplayerPlayerInfo[],
  hostPlayerId: string,
  metadata: Omit<FullReplayData['metadata'], 'id'>,
  playerLoadout: ReplayShipLoadout,
  wingmen: ReplayWingman[],
  playerAutoaim: PlayerAutoaim,
  debriefData?: FullReplayData['debriefData'],
  salvageData?: FullReplayData['salvageData'],
): MultiplayerReplayData {
  const trackers = recorder.getPlayerTrackers();

  // Build player list
  const players: MultiplayerReplayPlayer[] = playerInfos.map((info) => {
    const tracker = trackers.get(info.playerId);
    return {
      playerId: info.playerId,
      callsign: info.callsign,
      shipEntityId: info.shipEntityId,
      campaignShipId: info.campaignShipId,
      joinTick: tracker?.startTick ?? 0,
      leaveTick: tracker?.endTick ?? null,
      isHost: info.isHost,
    };
  });

  const result: MultiplayerReplayData = {
    version: REPLAY_VERSION,
    isMultiplayer: true,
    seed: recorder.getSeed(),
    tickCount: recorder.getTickCount(),
    inputsCompressed: true, // playerInputs are individually RLE-compressed
    metadata: {
      ...metadata,
      id: '', // Will be assigned on save
    },
    playerLoadout,
    wingmen,
    playerAutoaim,
    players,
    playerInputs: recorder.buildPlayerInputs(),
    hostPlayerId,
  };

  // Add optional fields only if defined (exactOptionalPropertyTypes compliance)
  if (debriefData !== undefined) {
    result.debriefData = debriefData;
  }
  if (salvageData !== undefined) {
    result.salvageData = salvageData;
  }

  return result;
}
