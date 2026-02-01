/**
 * Mission Launcher - Handles mission initialization and game setup.
 */

import { logDebug } from '../../core/logger';
import { findLocalPlayer } from '../../core/player-utils';
import { deriveKey } from '../../core/prng';
import { createGame, startGame } from '../../game';
import { InputRecorder } from '../../input/input-recorder';
import {
  setActiveGame,
  setActiveMissionEndState,
  setActiveMultiplayerState,
} from '../../multiplayer/active-game';
import { buildPlayerEntityMap } from '../../multiplayer/mission-setup';
import {
  createMultiplayerGameState,
  startMultiplayerGameLoop,
} from '../../multiplayer/multiplayer-game-loop';
import { createMultiplayerSession } from '../../multiplayer/multiplayer-session';
import { render } from '../../rendering/renderer';
import { getPlayerAutoaim } from '../../settings/game-settings';
import { startRecording } from '../../systems/input';
import { initMatchStats } from '../../systems/stats';
import { setMissionContainer } from '../../ui/common/screens';
import { cleanupTitleScreen } from '../../ui/screens/title';
import type { CampaignController } from '../controller-types';
import { getLobbyContext } from '../handlers/lobby-context';
import { setupMultiplayerMissionPause } from '../handlers/multiplayer-pause-handler';
import { shipToReplayLoadout } from '../ship-spawning';
import type { Contract } from '../types';
import { createMissionEndExecutor } from './mission-callbacks';
import {
  createMissionRenderers,
  updateMissionRenderers,
  updateSpectatorRendering,
} from './mission-renderer';
import { spawnMissionSquadron } from './mission-spawning';
import {
  checkMidMissionDeath,
  checkSpectatorMode,
  clearMissionSpectator,
  getSpectatorState,
  initializeMissionSpectator,
} from './mission-spectator';
import { setupMissionTypeCallbacks } from './mission-type-setup';
import { createMissionEndState } from './mission-waves';

/** Callback type for contracts screen setup */
export type SetupContractsCallback = (controller: CampaignController) => void;

/**
 * Launch a mission with the selected contract.
 * @param localShipId - Ship ID of the local player (for multiplayer). If not provided, commander is local.
 */
export function launchMission(
  controller: CampaignController,
  contract: Contract,
  deployedShipIds: string[],
  setupContractsScreen: SetupContractsCallback,
  guestShipMap?: Map<string, string>,
  localShipId?: string,
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

  // Store active game reference for test utilities
  setActiveGame(game);

  // Setup multiplayer pause coordination if in lobby
  const lobbyCtx = getLobbyContext();
  if (lobbyCtx) {
    const pauseCoordinator = setupMultiplayerMissionPause(controller, lobbyCtx);
    lobbyCtx.pauseCoordinator = pauseCoordinator;
  }

  // Create input recorder (will capture deployment data below)
  // Capture playerAutoaim at mission start for replay determinism
  const recorder = new InputRecorder(seed, contract.id, getPlayerAutoaim());

  // Dispose title screen battle simulation before creating mission renderer
  // This frees the WebGL context and avoids GPU contention delay
  // Note: For multiplayer, this is also called when entering lobby for earlier cleanup
  cleanupTitleScreen();

  // Create all renderers and store in controller for disposal
  const renderers = createMissionRenderers(controller.missionContainer, seed);
  controller.missionRenderers = renderers;

  // Spawn player and wingmen from campaign state
  const { replayWingmen, playerShip } = spawnMissionSquadron(
    game.world,
    campaignState,
    contract,
    deployedShipIds,
    guestShipMap,
    localShipId,
  );

  // Store deployment data in recorder for replay reconstruction
  if (playerShip) {
    recorder.setDeployment(shipToReplayLoadout(playerShip), replayWingmen);
  }

  // Start recording input for replay (stopped in mission end executor)
  startRecording(game.world, recorder);

  // Initialize match stats for debrief
  initMatchStats(game.world);

  // Clear any previous spectator state and check for spectator mode
  clearMissionSpectator();
  const { isSpectator } = checkSpectatorMode();

  if (isSpectator && controller.missionContainer) {
    initializeMissionSpectator(
      game.world,
      renderers,
      controller.missionContainer,
    );
  }

  // Cache local player entity for mid-mission death detection (avoids per-frame entity search)
  // Note: lobbyCtx is already defined above for pause coordination
  const cachedLocalPlayer = lobbyCtx ? findLocalPlayer(game.world) : null;

  // Mission end state for delayed transition (shared by all mission types)
  const missionEndState = createMissionEndState();

  // Track last frame time for spectator dt calculation
  let lastFrameTime = performance.now();

  // Set render callback with alpha for interpolation
  game.onRender = (world, alpha) => {
    const containerWidth = controller.missionContainer?.clientWidth ?? 800;
    const containerHeight = controller.missionContainer?.clientHeight ?? 600;

    // Calculate dt for spectator camera (render is called at variable rate)
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Check for mid-mission death transition to spectator (multiplayer only)
    const spectator = controller.missionContainer
      ? checkMidMissionDeath(
          cachedLocalPlayer,
          world,
          renderers,
          controller.missionContainer,
        )
      : getSpectatorState();

    if (spectator?.isActive) {
      // Spectator rendering with custom camera
      updateMissionRenderers(
        renderers,
        world,
        containerWidth,
        containerHeight,
        alpha,
        {
          skipCameraAndRender: true,
        },
      );
      updateSpectatorRendering(renderers, spectator, world, dt);

      // Complete the frame render
      render(renderers.renderer);
    } else {
      // Normal player rendering
      updateMissionRenderers(
        renderers,
        world,
        containerWidth,
        containerHeight,
        alpha,
      );
    }
  };

  // Create mission end executor (shared by all mission types)
  const executeMissionEnd = createMissionEndExecutor(
    controller,
    game,
    contract,
    missionEndState,
    setupContractsScreen,
  );

  // Store mission end state reference for test utilities (forceVictory)
  setActiveMissionEndState(missionEndState);

  // Setup mission type-specific callbacks (onTick, onMissionEnd)
  setupMissionTypeCallbacks(
    controller,
    game,
    contract,
    missionEndState,
    executeMissionEnd,
  );

  // === START GAME LOOP ===
  if (lobbyCtx) {
    // Multiplayer: Use rollback-netcode session
    const transport = lobbyCtx.connectionFlow.getTransport();
    if (!transport) {
      logDebug(
        '[MISSION] ERROR: No transport available for multiplayer session',
      );
      startGame(game);
      return;
    }

    const { playerEntityMap } = buildPlayerEntityMap(
      game.world,
      lobbyCtx.lobbyState.players,
      lobbyCtx.localPlayerId,
    );

    const session = createMultiplayerSession({
      world: game.world,
      transport,
      localPlayerId: lobbyCtx.localPlayerId,
      isHost: lobbyCtx.isHost,
      playerEntityMap,
    });

    // Re-wire router after session creation.
    // The rollback-netcode session sets its own onMessage handler, which overwrites
    // the router's handler. We need to re-wire so the router can dispatch game
    // messages (like PauseRequest) while passing rollback messages to the session.
    lobbyCtx.router.wireToTransport(transport.onMessage ?? undefined);

    // Enable input recording for multiplayer replays
    const playerIds = lobbyCtx.lobbyState.players.map((p) => p.playerId);
    session.enableRecording(seed, contract.id, playerIds);

    // Store AI wingmen for replay reconstruction (replayWingmen now only contains AI, not guests)
    session.setReplayWingmen(replayWingmen, getPlayerAutoaim());

    const mpState = createMultiplayerGameState(session);
    controller.multiplayerGameState = mpState;

    // Store active multiplayer state for test utilities
    setActiveMultiplayerState(mpState);

    // Wire callbacks (they are guaranteed to be set by setupMissionTypeCallbacks)
    if (game.onRender) mpState.onRender = game.onRender;
    if (game.onTick) mpState.onTick = game.onTick;
    if (game.onMissionEnd) mpState.onMissionEnd = game.onMissionEnd;

    // Wire lagReport for auto-pause (>0.5 seconds behind = 30 ticks at 60fps)
    session.on('lagReport', (_laggyPlayerId, ticksBehind) => {
      if (ticksBehind > 30) {
        lobbyCtx.pauseCoordinator?.requestPause('lag-detected');
      }
    });

    logDebug(
      `[MISSION ${performance.now().toFixed(0)}ms] Started multiplayer game loop`,
    );
    startMultiplayerGameLoop(mpState);
  } else {
    // Single-player: Use standard game loop
    startGame(game);
  }
}
