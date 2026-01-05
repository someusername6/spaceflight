/**
 * Campaign controller - orchestrates campaign flow, screen transitions,
 * and mission spawning.
 */

import { Vector3 } from 'three';
import type { ProfileName } from '../data/ai-profiles';
import { createPlayerShip, createWingman } from '../factories/ship';
import {
  countLivingEnemyShips,
  createGame,
  MissionResult,
  resetMissionNotification,
  resetMissionState,
  startGame,
  stopGame,
} from '../game';
import { initInput } from '../systems/input';
import { createContractsUI } from '../ui/contracts';
import { createHangarUI, updateHangarUI } from '../ui/hangar';
import {
  createScreenManager,
  endMission,
  getScreenElement,
  goToContracts,
  goToHangar,
  Screen,
  setMissionContainer,
  startMission,
  updateCampaignState,
} from '../ui/screens';
import { injectCampaignStyles } from '../ui/styles';
import {
  createMissionRenderers,
  updateMissionRenderers,
} from './mission-renderer';
import {
  createMissionEndState,
  createWaveState,
  MISSION_END_DELAY,
  spawnWave,
} from './mission-waves';
import { showGameOver, showResults } from './screen-handlers';
import { applyMissionResults, createNewCampaign, isGameOver } from './state';
import type { Contract } from './types';

/** Campaign controller state */
export interface CampaignController {
  container: HTMLElement;
  screenManager: ReturnType<typeof createScreenManager>;
  missionContainer: HTMLElement | null;
  game: ReturnType<typeof createGame> | null;
  missionEnded: boolean;
}

/** Get seed from URL or generate random */
function getGameSeed(): number {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  if (seedParam === null || seedParam === 'random') {
    return performance.now() | 0;
  }

  const parsed = Number.parseInt(seedParam, 10);
  return Number.isNaN(parsed) ? 12345 : parsed;
}

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

  // Setup hangar screen
  const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
  createHangarUI(hangarElement, campaignState, () => {
    goToContracts(screenManager);
    setupContractsScreen(controller);
  });

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
    () => {
      // Back to hangar
      goToHangar(screenManager);
      const hangarElement = getScreenElement(screenManager, Screen.HANGAR);
      updateHangarUI(
        { element: hangarElement, onSelectContracts: () => {} },
        screenManager.campaignState,
      );
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

  // Spawn player and wingmen from campaign state
  const { campaignState } = screenManager;
  const playerShip = campaignState.ships.find((s) => s.isPlayerShip);
  const wingmen = campaignState.ships.filter((s) => !s.isPlayerShip);

  if (playerShip) {
    createPlayerShip(game.world, playerShip.archetype, new Vector3(0, 0, 0));
  }

  // Spawn wingmen in tight formation near player
  wingmen.forEach((wingman, index) => {
    const offset = (index + 1) * 15; // Close formation (15m spacing)
    const side = index % 2 === 0 ? 1 : -1;
    createWingman(
      game.world,
      wingman.archetype,
      new Vector3(side * offset, 0, -offset * 0.5),
      undefined,
      (wingman.pilot?.skill as ProfileName) ?? 'regular',
    );
  });

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

  // Helper to execute the actual mission end transition
  const executeMissionEnd = () => {
    controller.missionEnded = true;
    console.log(
      `[MISSION ${performance.now().toFixed(0)}ms] Transitioning to results`,
    );

    // Stop the game loop
    stopGame(game);

    // Apply results to campaign (simplified - no damage tracking yet)
    const shipsLost: string[] = [];
    const hullDamage = new Map<string, number>();

    // For now, just check if player won and if so award credits
    const creditsEarned = missionEndState.victory ? contract.reward : 0;

    const newState = applyMissionResults(
      screenManager.campaignState,
      missionEndState.victory,
      creditsEarned,
      shipsLost,
      hullDamage,
    );

    // Update campaign state
    updateCampaignState(screenManager, newState);

    // Transition to results or game over
    if (isGameOver(newState)) {
      endMission(screenManager, missionEndState.victory);
      showGameOver(controller, setupContractsScreen);
    } else {
      endMission(screenManager, missionEndState.victory);
      showResults(
        controller,
        missionEndState.victory,
        contract,
        setupContractsScreen,
      );
    }
  };

  // Set tick callback for wave management and mission end delay
  const TICK_SEC = 1 / 60;
  game.onTick = (world) => {
    // Skip if mission already ended
    if (controller.missionEnded) return;

    // Handle mission end delay countdown
    if (missionEndState.pending) {
      missionEndState.delayRemaining -= TICK_SEC;
      if (missionEndState.delayRemaining <= 0) {
        executeMissionEnd();
      }
      return; // Don't process waves while ending
    }

    const enemyCount = countLivingEnemyShips(world);

    // Check if current wave is cleared
    if (enemyCount === 0 && !waveState.waveCleared) {
      waveState.waveCleared = true;
      const nextWaveIndex = waveState.currentWave + 1;

      if (nextWaveIndex < waveState.totalWaves) {
        // Set delay for next wave
        const nextWave = contract.waves[nextWaveIndex];
        if (nextWave) {
          waveState.delayRemaining = nextWave.delay ?? 0;
          console.log(
            `[WAVE ${performance.now().toFixed(0)}ms] Wave ${waveState.currentWave + 1} cleared! Next wave in ${waveState.delayRemaining}s`,
          );
        }
      }
    }

    // Handle wave delay and spawning
    if (
      waveState.waveCleared &&
      waveState.currentWave + 1 < waveState.totalWaves
    ) {
      if (waveState.delayRemaining > 0) {
        waveState.delayRemaining -= TICK_SEC;
      } else {
        // Spawn next wave
        waveState.currentWave++;
        waveState.waveCleared = false;
        const nextWave = contract.waves[waveState.currentWave];
        if (nextWave) {
          // Reset mission state so missionSystem can detect Victory for this wave
          resetMissionState(game.world);
          // Reset notification tracking so we get notified when this wave clears
          resetMissionNotification(game);

          spawnWave(world, nextWave, waveState.currentWave);
          console.log(
            `[WAVE ${performance.now().toFixed(0)}ms] Wave ${waveState.currentWave + 1}/${waveState.totalWaves} spawned`,
          );
        }
      }
    }
  };

  // Set mission end callback
  game.onMissionEnd = (result: MissionResult) => {
    // For wave-based missions, only end when all waves are complete
    // The mission system triggers Victory when enemyCount === 0
    // But we need to check if there are more waves first
    const allWavesComplete = waveState.currentWave >= waveState.totalWaves - 1;
    const isDefeat = result === MissionResult.Defeat;

    console.log(
      `[MISSION ${performance.now().toFixed(0)}ms] onMissionEnd called: result=${result}, wave=${waveState.currentWave + 1}/${waveState.totalWaves}, allWavesComplete=${allWavesComplete}`,
    );

    // Only end mission if it's a defeat OR all waves are complete
    if (!isDefeat && !allWavesComplete) {
      console.log(
        `[MISSION ${performance.now().toFixed(0)}ms] Wave cleared, awaiting next wave`,
      );
      // More waves to spawn - don't end the mission yet
      // The game.lastNotifiedResult tracking in game.ts prevents this from spamming
      // We'll reset the mission state when the next wave spawns
      return;
    }

    // Prevent multiple calls (check both flags)
    if (controller.missionEnded || missionEndState.pending) {
      console.log(
        `[MISSION ${performance.now().toFixed(0)}ms] Ignoring - already ending`,
      );
      return;
    }

    // Start the mission end delay (game keeps running so explosions play out)
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;
    missionEndState.victory = result === MissionResult.Victory;

    // Show victory/defeat overlay immediately (slightly above center)
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 35%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 72px;
      font-weight: bold;
      font-family: sans-serif;
      text-shadow: 0 0 20px ${isDefeat ? '#ff0000' : '#00ff00'}, 0 0 40px ${isDefeat ? '#ff0000' : '#00ff00'};
      color: ${isDefeat ? '#ff0000' : '#00ff00'};
      pointer-events: none;
      z-index: 1000;
    `;
    overlay.textContent = isDefeat ? 'DEFEAT' : 'VICTORY';
    controller.missionContainer?.appendChild(overlay);

    console.log(
      `[MISSION ${performance.now().toFixed(0)}ms] ${isDefeat ? 'DEFEAT' : 'VICTORY'} - transitioning in ${MISSION_END_DELAY}s`,
    );
  };

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
