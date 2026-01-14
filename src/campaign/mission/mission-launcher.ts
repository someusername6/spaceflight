/**
 * Mission Launcher - Handles mission initialization and game setup.
 */

import { Vector3 } from 'three';
import { logDebug, logError } from '../../core/logger';
import { deriveKey } from '../../core/prng';
import { createGame, startGame } from '../../game';
import { InputRecorder } from '../../input/input-recorder';
import type { ReplayWingman } from '../../replay/types';
import { getPlayerAutoaim } from '../../settings/game-settings';
import { startRecording } from '../../systems/input';
import { initMatchStats } from '../../systems/stats';
import { setMissionContainer } from '../../ui/common/screens';
import type { CampaignController } from '../controller-types';
import {
  shipToReplayLoadout,
  spawnPlayerFromCampaign,
  spawnWingmanFromCampaign,
} from '../ship-spawning';
import { getCommanderShip, getWingmanShips } from '../state';
import type { Contract } from '../types';
import {
  createMissionEndCallback,
  createMissionEndExecutor,
  createTickCallback,
} from './mission-callbacks';
import {
  createMissionRenderers,
  updateMissionRenderers,
} from './mission-renderer';
import {
  createMissionEndState,
  createWaveState,
  initializeFirstWave,
} from './mission-waves';

/** Callback type for contracts screen setup */
export type SetupContractsCallback = (controller: CampaignController) => void;

/** Launch a mission with the selected contract */
export function launchMission(
  controller: CampaignController,
  contract: Contract,
  deployedShipIds: string[],
  setupContractsScreen: SetupContractsCallback,
): void {
  const { container, screenManager } = controller;

  // Reset mission ended flag
  controller.missionEnded = false;

  // Create mission container if needed
  if (!controller.missionContainer) {
    controller.missionContainer = document.createElement('div');
    controller.missionContainer.id = 'mission-container';
    controller.missionContainer.style.cssText =
      'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';
    container.appendChild(controller.missionContainer);
    setMissionContainer(screenManager, controller.missionContainer);
  }

  // Clear any previous mission content
  controller.missionContainer.innerHTML = '';

  // Create game with deterministic seed derived from campaign state
  // This ensures same mission count = same combat randomness (prevents save scumming)
  const { campaignState } = screenManager;
  const seed = deriveKey(
    campaignState.seed,
    'mission',
    campaignState.missionCount,
  );
  const game = createGame(seed);
  controller.game = game;

  // Create input recorder (will capture deployment data below)
  // Capture playerAutoaim at mission start for replay determinism
  const recorder = new InputRecorder(seed, contract.id, getPlayerAutoaim());

  // Create all renderers and store in controller for disposal
  const renderers = createMissionRenderers(controller.missionContainer, seed);
  controller.missionRenderers = renderers;

  // Spawn player and wingmen from campaign state (uses campaign loadout/ammo)
  // Only spawn ships that were selected for deployment
  const playerShip = getCommanderShip(campaignState);
  const allWingmen = getWingmanShips(campaignState);
  const deployedIdSet = new Set(deployedShipIds);

  // Filter wingmen to only deployed ships
  const wingmen = allWingmen.filter((w) => deployedIdSet.has(w.id));

  if (playerShip) {
    spawnPlayerFromCampaign(game.world, playerShip, new Vector3(0, 0, 0));
  } else {
    // This should never happen - squad selection should prevent it
    logError('[Mission] No commander ship found!', {
      commanderId: campaignState.commanderId,
      shipCount: campaignState.ships.length,
      pilotCount: campaignState.pilots.length,
      deployedShipIds,
    });
  }

  // Spawn deployed wingmen in tight symmetric formation near player
  // Track positions for replay reconstruction
  const replayWingmen: ReplayWingman[] = [];
  wingmen.forEach((wingman, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const xOffset = 20 * side; // 20m left/right
    const zOffset = -10 - Math.floor(index / 2) * 15; // Staggered rows behind
    spawnWingmanFromCampaign(
      game.world,
      wingman,
      new Vector3(xOffset, 0, zOffset),
    );
    // Capture wingman loadout, position, pilot name and skill for replay
    const replayWingman: ReplayWingman = {
      loadout: shipToReplayLoadout(wingman),
      position: { x: xOffset, y: 0, z: zOffset },
    };
    if (wingman.pilot?.name) {
      replayWingman.pilotName = wingman.pilot.name;
    }
    if (wingman.pilot?.skill) {
      replayWingman.pilotSkill = wingman.pilot.skill;
    }
    replayWingmen.push(replayWingman);
  });

  // Store deployment data in recorder for replay reconstruction
  if (playerShip) {
    recorder.setDeployment(shipToReplayLoadout(playerShip), replayWingmen);
  }

  // Start recording input for replay (stopped in mission end executor)
  startRecording(recorder);

  // Initialize match stats for debrief
  initMatchStats(game.world);

  // Wave state for tracking progress
  const waveState = createWaveState(contract.waves.length);

  // Mission end state for delayed transition
  const missionEndState = createMissionEndState();

  // Handle first wave - spawn immediately or after delay (shared with replay)
  initializeFirstWave(game.world, waveState, contract.waves);
  if (waveState.delayRemaining > 0) {
    logDebug(
      `[WAVE ${performance.now().toFixed(0)}ms] First wave in ${waveState.delayRemaining.toFixed(1)}s`,
    );
  } else {
    logDebug(
      `[WAVE ${performance.now().toFixed(0)}ms] Wave 1/${waveState.totalWaves} spawned`,
    );
  }

  // Set render callback with alpha for interpolation
  game.onRender = (world, alpha) => {
    updateMissionRenderers(
      renderers,
      world,
      controller.missionContainer?.clientWidth ?? 800,
      controller.missionContainer?.clientHeight ?? 600,
      alpha,
    );
  };

  // Create callbacks for mission management
  const executeMissionEnd = createMissionEndExecutor(
    controller,
    game,
    contract,
    missionEndState,
    setupContractsScreen,
  );

  game.onTick = createTickCallback(
    controller,
    game,
    contract,
    waveState,
    missionEndState,
    executeMissionEnd,
  );

  game.onMissionEnd = createMissionEndCallback(
    controller,
    waveState,
    missionEndState,
  );

  // Start the game
  startGame(game);

  const totalEnemies = contract.waves.reduce(
    (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
    0,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] Mission started: ${contract.name}`,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] ${totalEnemies} enemies across ${contract.waves.length} waves`,
  );
}
