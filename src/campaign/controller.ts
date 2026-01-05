/**
 * Campaign controller - orchestrates campaign flow, screen transitions,
 * and mission spawning.
 */

import { Vector3 } from 'three';
import type { FactionComponent } from '../components/faction';
import { getEnemyCallsignPrefix } from '../components/ship-identity';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';
import { Faction } from '../core/types';
import type { ProfileName } from '../data/ai-profiles';
import {
  createEnemyShip,
  createPlayerShip,
  createWingman,
} from '../factories/ship';
import { createGame, MissionResult, startGame, stopGame } from '../game';
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
import { showGameOver, showResults } from './screen-handlers';
import { applyMissionResults, createNewCampaign, isGameOver } from './state';
import type { Contract, ContractWave } from './types';

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

/** Wave state for tracking mission progress */
interface WaveState {
  currentWave: number;
  totalWaves: number;
  waveCleared: boolean;
  delayRemaining: number;
}

/** Count enemy ships in the world */
function countEnemies(world: World): number {
  let count = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    if (faction && faction.faction === Faction.Enemy) {
      count++;
    }
  }
  return count;
}

/** Spawn a wave of enemies */
function spawnWave(world: World, wave: ContractWave, waveIndex: number): void {
  // Get callsign prefix for this wave (Aries, Taurus, Gemini, etc.)
  const callsignPrefix = getEnemyCallsignPrefix(waveIndex);

  wave.enemies.forEach((enemySpec, groupIndex) => {
    for (let i = 0; i < enemySpec.count; i++) {
      const angle = (Math.PI * 2 * i) / enemySpec.count + groupIndex * 0.5;
      // 1500m base distance = ~5-8 seconds approach (depends on ship speed)
      const distance = 1500 + waveIndex * 100 + groupIndex * 150;
      const x = Math.cos(angle) * distance * 0.5;
      const z = -distance;
      const y = (groupIndex - 1) * 50 + i * 20;

      createEnemyShip(
        world,
        enemySpec.archetype,
        new Vector3(x, y, z),
        undefined,
        enemySpec.skill as ProfileName,
        callsignPrefix,
      );
    }
  });
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

  // Spawn wingmen with offset positions
  wingmen.forEach((wingman, index) => {
    const offset = (index + 1) * 50;
    const side = index % 2 === 0 ? 1 : -1;
    createWingman(
      game.world,
      wingman.archetype,
      new Vector3(side * offset, 0, -offset),
      undefined,
      (wingman.pilot?.skill as ProfileName) ?? 'regular',
    );
  });

  // Wave state for tracking progress
  const waveState: WaveState = {
    currentWave: 0,
    totalWaves: contract.waves.length,
    waveCleared: false,
    delayRemaining: 0,
  };

  // Spawn first wave
  const firstWave = contract.waves[0];
  if (firstWave) {
    spawnWave(game.world, firstWave, 0);
    console.log(`Wave 1/${waveState.totalWaves} spawned`);
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

  // Set tick callback for wave management
  const TICK_SEC = 1 / 60;
  game.onTick = (world) => {
    // Skip if mission already ended
    if (controller.missionEnded) return;

    const enemyCount = countEnemies(world);

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
            `Wave ${waveState.currentWave + 1} cleared! Next wave in ${waveState.delayRemaining}s`,
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
          spawnWave(world, nextWave, waveState.currentWave);
          console.log(
            `Wave ${waveState.currentWave + 1}/${waveState.totalWaves} spawned`,
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

    // Only end mission if it's a defeat OR all waves are complete
    if (!isDefeat && !allWavesComplete) {
      return; // More waves to spawn, don't end yet
    }

    // Prevent multiple calls
    if (controller.missionEnded) return;
    controller.missionEnded = true;

    // Stop the game loop
    stopGame(game);

    // Determine victory
    const victory = result === MissionResult.Victory;

    // Apply results to campaign (simplified - no damage tracking yet)
    const shipsLost: string[] = [];
    const hullDamage = new Map<string, number>();

    // For now, just check if player won and if so award credits
    const creditsEarned = victory ? contract.reward : 0;

    const newState = applyMissionResults(
      screenManager.campaignState,
      victory,
      creditsEarned,
      shipsLost,
      hullDamage,
    );

    // Update campaign state
    updateCampaignState(screenManager, newState);

    // Transition to results or game over
    if (isGameOver(newState)) {
      endMission(screenManager, victory);
      showGameOver(controller, setupContractsScreen);
    } else {
      endMission(screenManager, victory);
      showResults(controller, victory, contract, setupContractsScreen);
    }
  };

  // Start the game
  startGame(game);

  const totalEnemies = contract.waves.reduce(
    (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
    0,
  );
  console.log(`Mission started: ${contract.name}`);
  console.log(`${totalEnemies} enemies across ${contract.waves.length} waves`);
}
