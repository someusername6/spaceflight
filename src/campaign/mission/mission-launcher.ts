/**
 * Mission Launcher - Handles mission initialization and game setup.
 */

import { Quaternion, Vector3 } from 'three';
import { logDebug, logError } from '../../core/logger';
import { deriveKey } from '../../core/prng';
import { getConvoyMaxSpeed } from '../../factories/convoy-ship';
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
  createAmbushMissionEndCallback,
  createAmbushTickCallback,
  getAmbushPlayerSpawn,
  getAmbushWingmenSpawns,
  setupAmbushMission,
} from './ambush-launcher';
import {
  createEscortMissionEndCallback,
  createEscortTickCallback,
  setupEscortMission,
} from './escort-launcher';
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
import {
  createStationDefenseMissionEndCallback,
  createStationDefenseTickCallback,
  setupStationDefenseMission,
} from './station-defense-launcher';

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

  // Extract mission-specific data (used for type narrowing)
  const escortData =
    contract.missionType === 'escort' ? contract.escortData : undefined;
  const stationDefenseData =
    contract.missionType === 'station-defense'
      ? contract.stationDefenseData
      : undefined;
  const ambushData =
    contract.missionType === 'ambush' ? contract.ambushData : undefined;

  // Calculate player spawn position and rotation based on mission type
  let playerSpawnPosition = new Vector3(0, 0, 0);
  let playerSpawnRotation: Quaternion | undefined;
  let initialSpeed: number | undefined;

  if (ambushData) {
    // Ambush: spawn to side of convoy path, facing convoy
    const spawn = getAmbushPlayerSpawn(ambushData);
    playerSpawnPosition = spawn.position;
    playerSpawnRotation = spawn.rotation;
  } else if (stationDefenseData) {
    // Station defense: 1500m from station, facing station
    const stationZ = stationDefenseData.stationDistance;
    playerSpawnPosition = new Vector3(0, 0, stationZ + 1500);
  } else if (escortData) {
    // Escort: spawn at origin facing escape zone (positive Z)
    playerSpawnRotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI,
    );
    // All ships start at convoy max speed so formation stays together
    initialSpeed = getConvoyMaxSpeed(escortData.convoyType);
  }

  if (playerShip) {
    spawnPlayerFromCampaign(
      game.world,
      playerShip,
      playerSpawnPosition,
      playerSpawnRotation,
      initialSpeed,
    );
  } else {
    // This should never happen - squad selection should prevent it
    logError('[Mission] No commander ship found!', {
      commanderId: campaignState.commanderId,
      shipCount: campaignState.ships.length,
      pilotCount: campaignState.pilots.length,
      deployedShipIds,
    });
  }

  // Spawn deployed wingmen
  // Track positions for replay reconstruction
  const replayWingmen: ReplayWingman[] = [];

  if (ambushData) {
    // Ambush: use specific spawn positions for wingmen
    const wingmenSpawns = getAmbushWingmenSpawns(ambushData, wingmen.length);
    wingmen.forEach((wingman, index) => {
      const spawn = wingmenSpawns[index];
      if (!spawn) return;
      spawnWingmanFromCampaign(
        game.world,
        wingman,
        spawn.position,
        spawn.rotation,
        initialSpeed,
      );
      // Capture wingman loadout, position, pilot name and skill for replay
      const replayWingman: ReplayWingman = {
        loadout: shipToReplayLoadout(wingman),
        position: {
          x: spawn.position.x,
          y: spawn.position.y,
          z: spawn.position.z,
        },
      };
      if (wingman.pilot?.name) {
        replayWingman.pilotName = wingman.pilot.name;
      }
      if (wingman.pilot?.skill) {
        replayWingman.pilotSkill = wingman.pilot.skill;
      }
      replayWingmen.push(replayWingman);
    });
  } else {
    // Standard formation: symmetric near player
    // Spacing wide enough to avoid immediate collisions
    wingmen.forEach((wingman, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      const xOffset = 30 * side; // 30m left/right (wider than convoy X spacing)
      const zRelative = -15 - Math.floor(index / 2) * 20; // Staggered rows behind player
      const zPosition = playerSpawnPosition.z + zRelative;
      spawnWingmanFromCampaign(
        game.world,
        wingman,
        new Vector3(xOffset, 0, zPosition),
        playerSpawnRotation,
        initialSpeed,
      );
      // Capture wingman loadout, position, pilot name and skill for replay
      const replayWingman: ReplayWingman = {
        loadout: shipToReplayLoadout(wingman),
        position: { x: xOffset, y: 0, z: zPosition },
      };
      if (wingman.pilot?.name) {
        replayWingman.pilotName = wingman.pilot.name;
      }
      if (wingman.pilot?.skill) {
        replayWingman.pilotSkill = wingman.pilot.skill;
      }
      replayWingmen.push(replayWingman);
    });
  }

  // Store deployment data in recorder for replay reconstruction
  if (playerShip) {
    recorder.setDeployment(shipToReplayLoadout(playerShip), replayWingmen);
  }

  // Start recording input for replay (stopped in mission end executor)
  startRecording(recorder);

  // Initialize match stats for debrief
  initMatchStats(game.world);

  // Mission end state for delayed transition (shared by all mission types)
  const missionEndState = createMissionEndState();

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

  // Create mission end executor (shared by all mission types)
  const executeMissionEnd = createMissionEndExecutor(
    controller,
    game,
    contract,
    missionEndState,
    setupContractsScreen,
  );

  // Branch based on mission type
  const missionType = contract.missionType ?? 'elimination';

  if (missionType === 'escort' && contract.escortData) {
    // === ESCORT MISSION ===
    const escortState = setupEscortMission(game.world, contract);

    game.onTick = createEscortTickCallback(
      controller,
      game,
      contract,
      escortState,
      missionEndState,
      executeMissionEnd,
    );

    game.onMissionEnd = createEscortMissionEndCallback(
      controller,
      escortState,
      missionEndState,
    );

    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] Escort mission started: ${contract.name}`,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] ${contract.escortData.convoySize} convoy ships to protect`,
    );
  } else if (missionType === 'station-defense' && contract.stationDefenseData) {
    // === STATION DEFENSE MISSION ===
    const stationState = setupStationDefenseMission(game.world, contract);

    game.onTick = createStationDefenseTickCallback(
      controller,
      game,
      contract,
      stationState,
      missionEndState,
      executeMissionEnd,
    );

    game.onMissionEnd = createStationDefenseMissionEndCallback(
      controller,
      game,
      stationState,
      missionEndState,
    );

    const totalEnemies = contract.stationDefenseData.waves.reduce(
      (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
      0,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] Station defense mission started: ${contract.name}`,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] ${totalEnemies} enemies across ${contract.stationDefenseData.waves.length} waves`,
    );
  } else if (missionType === 'ambush' && contract.ambushData) {
    // === AMBUSH MISSION ===
    const ambushState = setupAmbushMission(game.world, contract);

    game.onTick = createAmbushTickCallback(
      controller,
      game,
      contract,
      ambushState,
      missionEndState,
      executeMissionEnd,
    );

    game.onMissionEnd = createAmbushMissionEndCallback(
      controller,
      game,
      ambushState,
      missionEndState,
    );

    const totalEscorts = contract.ambushData.escorts.reduce(
      (sum, e) => sum + e.count,
      0,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] Ambush mission started: ${contract.name}`,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] ${contract.ambushData.convoySize} convoy targets, ${totalEscorts} escorts`,
    );
  } else {
    // === ELIMINATION MISSION (default) ===
    const waves = contract.waves ?? [];
    const waveState = createWaveState(waves.length);

    // Handle first wave - spawn immediately or after delay (shared with replay)
    initializeFirstWave(game.world, waveState, waves);
    if (waveState.delayRemaining > 0) {
      logDebug(
        `[WAVE ${performance.now().toFixed(0)}ms] First wave in ${waveState.delayRemaining.toFixed(1)}s`,
      );
    } else {
      logDebug(
        `[WAVE ${performance.now().toFixed(0)}ms] Wave 1/${waveState.totalWaves} spawned`,
      );
    }

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

    const totalEnemies = waves.reduce(
      (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
      0,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] Mission started: ${contract.name}`,
    );
    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] ${totalEnemies} enemies across ${waves.length} waves`,
    );
  }

  // Start the game
  startGame(game);
}
