/**
 * Campaign controller - orchestrates campaign flow, screen transitions,
 * and mission spawning.
 */

import { Vector3 } from 'three';
import { createGame, startGame } from '../game';
import { initInput } from '../systems/input';
import { initMatchStats } from '../systems/stats';
import {
  createScreenManager,
  getScreenElement,
  goToHangar,
  goToRoster,
  goToStore,
  Screen,
  setMissionContainer,
  startMission,
} from '../ui/common/screens';
import { injectCampaignStyles } from '../ui/common/styles';
import { createContractsUI } from '../ui/screens/contracts';
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
  createMissionEndState,
  createWaveState,
  spawnWave,
} from './mission-waves';
import {
  setupHangarScreen,
  setupRosterScreen,
  setupStoreScreen,
} from './screen-handlers';
import {
  spawnPlayerFromCampaign,
  spawnWingmanFromCampaign,
} from './ship-spawning';
import { createNewCampaign, getCommanderShip, getWingmanShips } from './state';
import type { Contract } from './types';
import { getGameSeed } from './utils';

export type { CampaignController } from './controller-types';

/** Create and start the campaign */
export function startCampaign(container: HTMLElement): CampaignController {
  // Initialize input system
  initInput();

  // Inject campaign styles
  injectCampaignStyles();

  // Create initial campaign state
  const campaignState = createNewCampaign();

  // Create screen manager
  const screenManager = createScreenManager(container, campaignState);

  // Create controller
  const controller: CampaignController = {
    container,
    screenManager,
    missionContainer: null,
    game: null,
    missionEnded: false,
  };

  // Setup hangar screen with resupply support
  const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
  setupHangarScreen(controller, hangarElement, setupContractsScreen);

  // Show hangar initially
  goToHangar(screenManager);

  console.log('Campaign started');
  console.log(`Starting credits: ${campaignState.credits}`);
  console.log(`Ships: ${campaignState.ships.length}`);

  return controller;
}

/** Setup contracts screen with callbacks */
function setupContractsScreen(controller: CampaignController): void {
  const { screenManager } = controller;
  const contractsElement = getScreenElement(screenManager, Screen.CONTRACTS);

  createContractsUI(
    contractsElement,
    screenManager.campaignState,
    (destination) => {
      // Navigation handler for contracts screen
      switch (destination) {
        case 'hangar': {
          goToHangar(screenManager);
          const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
          setupHangarScreen(controller, hangarElement, setupContractsScreen);
          break;
        }
        case 'roster': {
          goToRoster(screenManager);
          const rosterElement = getScreenElement(screenManager, Screen.ROSTER);
          setupRosterScreen(controller, rosterElement, setupContractsScreen);
          break;
        }
        case 'store': {
          goToStore(screenManager);
          const storeElement = getScreenElement(screenManager, Screen.STORE);
          setupStoreScreen(controller, storeElement, setupContractsScreen);
          break;
        }
        case 'contracts':
          // Already on contracts, no-op
          break;
      }
    },
    (contract: Contract) => {
      // Accept contract and start mission
      startMission(screenManager, contract);
      launchMission(controller, contract);
    },
  );
}

/** Launch a mission with the selected contract */
function launchMission(
  controller: CampaignController,
  contract: Contract,
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
  const { campaignState } = screenManager;
  const playerShip = getCommanderShip(campaignState);
  const wingmen = getWingmanShips(campaignState);

  if (playerShip) {
    spawnPlayerFromCampaign(game.world, playerShip, new Vector3(0, 0, 0));
  }

  // Spawn wingmen in tight symmetric formation near player
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

  // Spawn first wave
  const firstWave = contract.waves[0];
  if (firstWave) {
    spawnWave(game.world, firstWave, 0);
    console.log(
      `[WAVE ${performance.now().toFixed(0)}ms] Wave 1/${waveState.totalWaves} spawned`,
    );
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
