/**
 * Mission Launcher - Handles mission initialization and game setup.
 */

import { Vector3 } from 'three';
import { createGame, startGame } from '../game';
import { initMatchStats } from '../systems/stats';
import { setMissionContainer } from '../ui/common/screens';
import type { CampaignController } from './controller-types';
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
  calculateWaveDelay,
  createMissionEndState,
  createWaveState,
  spawnWave,
} from './mission-waves';
import {
  spawnPlayerFromCampaign,
  spawnWingmanFromCampaign,
} from './ship-spawning';
import { getCommanderShip, getWingmanShips } from './state';
import type { Contract } from './types';
import { getGameSeed } from './utils';

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

  // Create game with seed
  const seed = getGameSeed();
  const game = createGame(seed);
  controller.game = game;

  // Create all renderers
  const renderers = createMissionRenderers(controller.missionContainer, seed);

  // Spawn player and wingmen from campaign state (uses campaign loadout/ammo)
  // Only spawn ships that were selected for deployment
  const { campaignState } = screenManager;
  const playerShip = getCommanderShip(campaignState);
  const allWingmen = getWingmanShips(campaignState);
  const deployedIdSet = new Set(deployedShipIds);

  // Filter wingmen to only deployed ships
  const wingmen = allWingmen.filter((w) => deployedIdSet.has(w.id));

  if (playerShip) {
    spawnPlayerFromCampaign(game.world, playerShip, new Vector3(0, 0, 0));
  }

  // Spawn deployed wingmen in tight symmetric formation near player
  wingmen.forEach((wingman, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const xOffset = 20 * side; // 20m left/right
    const zOffset = -10 - Math.floor(index / 2) * 15; // Staggered rows behind
    spawnWingmanFromCampaign(
      game.world,
      wingman,
      new Vector3(xOffset, 0, zOffset),
    );
  });

  // Initialize match stats for debrief
  initMatchStats(game.world);

  // Wave state for tracking progress
  const waveState = createWaveState(contract.waves.length);

  // Mission end state for delayed transition
  const missionEndState = createMissionEndState();

  // Handle first wave - spawn immediately or after delay
  const firstWave = contract.waves[0];
  if (firstWave) {
    const firstWaveDelay = calculateWaveDelay(firstWave.delay, game.world.prng);
    if (firstWaveDelay > 0) {
      // Set currentWave = -1 so tick callback increments to 0 when spawning
      waveState.currentWave = -1;
      waveState.waveCleared = true;
      waveState.delayRemaining = firstWaveDelay;
      console.log(
        `[WAVE ${performance.now().toFixed(0)}ms] First wave in ${firstWaveDelay.toFixed(1)}s`,
      );
    } else {
      // Spawn immediately (no delay)
      spawnWave(game.world, firstWave, 0);
      console.log(
        `[WAVE ${performance.now().toFixed(0)}ms] Wave 1/${waveState.totalWaves} spawned`,
      );
    }
  }

  // Set render callback
  game.onRender = (world, _alpha) => {
    updateMissionRenderers(
      renderers,
      world,
      controller.missionContainer?.clientWidth ?? 800,
      controller.missionContainer?.clientHeight ?? 600,
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
  console.log(
    `[MISSION ${performance.now().toFixed(0)}ms] Mission started: ${contract.name}`,
  );
  console.log(
    `[MISSION ${performance.now().toFixed(0)}ms] ${totalEnemies} enemies across ${contract.waves.length} waves`,
  );
}
