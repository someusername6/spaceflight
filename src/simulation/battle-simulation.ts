/**
 * Battle Simulation - AI-controlled space battles for backgrounds.
 *
 * Creates and runs autonomous battles between two AI teams.
 * Used for title screen backgrounds and other non-interactive displays.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../components/faction';
import { Faction } from '../components/faction';
import type { Health } from '../components/health';
import { isDead } from '../components/health';
import type { Transform } from '../components/transform';
import { getComponent, isShip, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createAIShip } from '../factories/ship';
import { createGame, type Game, startGame, stopGame } from '../game';
import {
  createLightningRenderer,
  updateLightningRenderer,
} from '../rendering/beam-effects/lightning';
import {
  createNuclearLanceRenderer,
  updateNuclearLanceRenderer,
} from '../rendering/beam-effects/nuclear-lance';
import {
  createTorchRenderer,
  updateTorchRenderer,
} from '../rendering/beam-effects/torch';
import { createDustSystem, updateDustSystem } from '../rendering/effects/dust';
import {
  createExplosionRenderer,
  updateExplosionRenderer,
} from '../rendering/effects/explosions';
import {
  createMuzzleFlashRenderer,
  updateMuzzleFlashRenderer,
} from '../rendering/effects/muzzle-flash';
import {
  createProjectileHitRenderer,
  updateProjectileHitRenderer,
} from '../rendering/effects/projectile-hits';
import {
  createShieldEffectRenderer,
  updateShieldEffectRenderer,
} from '../rendering/effects/shield-effects';
import {
  createTrailRenderer,
  updateTrailRenderer,
} from '../rendering/effects/trails';
import {
  createExhaustRenderer,
  updateExhaustRenderer,
} from '../rendering/missile-exhaust';
import {
  createRenderer,
  disposeRenderer,
  getScene,
  render,
  syncScene,
} from '../rendering/renderer';
import {
  type BattleCamera,
  createBattleCamera,
  updateBattleCamera,
} from './battle-camera';
import type { BattleConfig, TeamConfig } from './battle-configs';

/** Smoothed camera state for cinematic following */
interface SmoothedCamera {
  /** Current smoothed position */
  position: THREE.Vector3;
  /** Current smoothed rotation */
  rotation: THREE.Quaternion;
  /** Whether the camera has been initialized */
  initialized: boolean;
  /** Last followed entity (to detect target changes) */
  lastFollowed: Entity | null;
}

/** Camera smoothing configuration */
const CAMERA_SMOOTHING = {
  /** Position lerp factor (0-1, higher = faster/less smooth) */
  positionLerp: 0.08,
  /** Rotation slerp factor (0-1, higher = faster/less smooth) */
  rotationLerp: 0.05,
  /** Camera offset behind and above ship */
  offset: new THREE.Vector3(0, 5, 20),
};

/** Battle simulation instance */
export interface BattleSimulation {
  game: Game;
  config: BattleConfig;
  container: HTMLElement;
  renderer: ReturnType<typeof createRenderer>;
  camera: BattleCamera;
  /** Smoothed camera for cinematic effect */
  smoothedCamera: SmoothedCamera;
  // Effect renderers
  dustSystem: ReturnType<typeof createDustSystem>;
  explosionRenderer: ReturnType<typeof createExplosionRenderer>;
  trailRenderer: ReturnType<typeof createTrailRenderer>;
  exhaustRenderer: ReturnType<typeof createExhaustRenderer>;
  shieldEffectRenderer: ReturnType<typeof createShieldEffectRenderer>;
  muzzleFlashRenderer: ReturnType<typeof createMuzzleFlashRenderer>;
  lightningRenderer: ReturnType<typeof createLightningRenderer>;
  nuclearLanceRenderer: ReturnType<typeof createNuclearLanceRenderer>;
  torchRenderer: ReturnType<typeof createTorchRenderer>;
  projectileHitRenderer: ReturnType<typeof createProjectileHitRenderer>;
}

/** Spawn a ship for a team at a random position */
function spawnTeamShip(
  world: World,
  team: TeamConfig,
  faction: Faction,
  spawnRadius: number,
): Entity {
  // Random position on sphere surface
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const position = new THREE.Vector3(
    spawnRadius * Math.sin(phi) * Math.cos(theta),
    spawnRadius * Math.sin(phi) * Math.sin(theta),
    spawnRadius * Math.cos(phi),
  );

  // Face toward center (where enemies are)
  const toCenter = position.clone().negate().normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    toCenter,
  );

  return createAIShip(
    world,
    team.archetype,
    faction,
    position,
    rotation,
    team.profile,
    team.callsignPrefix,
  );
}

/** Spawn initial ships for both teams */
function spawnInitialShips(sim: BattleSimulation): void {
  const { game, config } = sim;
  const world = game.world;

  // Team A spawns on one hemisphere (positive Z)
  for (let i = 0; i < config.teamA.count; i++) {
    spawnTeamShip(world, config.teamA, Faction.Player, config.spawnRadius);
  }

  // Team B spawns on opposite hemisphere (negative Z)
  for (let i = 0; i < config.teamB.count; i++) {
    spawnTeamShip(world, config.teamB, Faction.Enemy, config.spawnRadius);
  }
}

/** Count living ships by faction */
function countLivingByFaction(world: World, faction: Faction): number {
  let count = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    if (!isShip(world, entity)) continue;

    const factionComp = getComponent<FactionComponent>(
      world,
      entity,
      'faction',
    );
    const health = getComponent<Health>(world, entity, 'health');

    if (factionComp?.faction === faction && health && !isDead(health)) {
      count++;
    }
  }
  return count;
}

/** Check and respawn ships as needed */
function checkRespawns(sim: BattleSimulation): void {
  const { game, config } = sim;
  const world = game.world;

  const teamACount = countLivingByFaction(world, Faction.Player);
  const teamBCount = countLivingByFaction(world, Faction.Enemy);

  // Respawn team A ships
  for (let i = teamACount; i < config.teamA.count; i++) {
    spawnTeamShip(world, config.teamA, Faction.Player, config.spawnRadius);
  }

  // Respawn team B ships
  for (let i = teamBCount; i < config.teamB.count; i++) {
    spawnTeamShip(world, config.teamB, Faction.Enemy, config.spawnRadius);
  }
}

/** Create a new battle simulation */
export function createBattleSimulation(
  container: HTMLElement,
  config: BattleConfig,
): BattleSimulation {
  const seed = config.seed ?? Math.floor(Math.random() * 100000);
  const game = createGame(seed);
  const renderer = createRenderer(container, seed);
  const scene = getScene(renderer);

  const sim: BattleSimulation = {
    game,
    config,
    container,
    renderer,
    camera: createBattleCamera(8),
    smoothedCamera: {
      position: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      initialized: false,
      lastFollowed: null,
    },
    dustSystem: createDustSystem(scene),
    explosionRenderer: createExplosionRenderer(),
    trailRenderer: createTrailRenderer(),
    exhaustRenderer: createExhaustRenderer(),
    shieldEffectRenderer: createShieldEffectRenderer(),
    muzzleFlashRenderer: createMuzzleFlashRenderer(),
    lightningRenderer: createLightningRenderer(scene),
    nuclearLanceRenderer: createNuclearLanceRenderer(scene),
    torchRenderer: createTorchRenderer(),
    projectileHitRenderer: createProjectileHitRenderer(),
  };

  // Spawn initial ships
  spawnInitialShips(sim);

  // Set up tick callback for respawning
  game.onTick = () => {
    checkRespawns(sim);
  };

  // Set up render callback
  game.onRender = () => {
    updateRender(sim);
  };

  return sim;
}

/** Update rendering for a simulation frame */
function updateRender(sim: BattleSimulation): void {
  const { game, renderer, camera } = sim;
  const world = game.world;
  const scene = getScene(renderer);

  // Sync scene with world state
  syncScene(renderer, world);

  // Update effect renderers
  updateExplosionRenderer(sim.explosionRenderer, scene, world);
  updateTrailRenderer(sim.trailRenderer, scene, world);
  updateExhaustRenderer(
    sim.exhaustRenderer,
    scene,
    world,
    world.systemState.gameTime,
  );
  updateShieldEffectRenderer(sim.shieldEffectRenderer, scene, world);
  updateMuzzleFlashRenderer(sim.muzzleFlashRenderer, scene, world);
  updateLightningRenderer(sim.lightningRenderer, scene, world);
  updateNuclearLanceRenderer(sim.nuclearLanceRenderer, scene, world);
  updateTorchRenderer(sim.torchRenderer, scene, world);
  updateProjectileHitRenderer(sim.projectileHitRenderer, scene, world);

  // Update camera following with smoothing
  const dt = 1 / 60; // Fixed timestep
  const followed = updateBattleCamera(camera, world, dt);
  if (followed !== null) {
    const transform = getComponent<Transform>(world, followed, 'transform');
    if (transform) {
      updateSmoothedCamera(sim, followed, transform);
      updateDustSystem(sim.dustSystem, transform.position);
    }
  }

  // Render
  render(renderer);
}

// Reusable vectors to avoid per-frame allocations
const targetPosition = new THREE.Vector3();
const targetOffset = new THREE.Vector3();

/** Update camera with smooth following */
function updateSmoothedCamera(
  sim: BattleSimulation,
  followedEntity: Entity,
  transform: Transform,
): void {
  const { renderer, smoothedCamera } = sim;
  const threeCamera = renderer.camera;

  // Calculate target position (behind and above ship)
  targetOffset.copy(CAMERA_SMOOTHING.offset);
  targetOffset.applyQuaternion(transform.rotation);
  targetPosition.copy(transform.position).add(targetOffset);

  // Reset smoothing when target changes or on first frame
  const targetChanged = smoothedCamera.lastFollowed !== followedEntity;
  if (!smoothedCamera.initialized || targetChanged) {
    smoothedCamera.position.copy(targetPosition);
    smoothedCamera.rotation.copy(transform.rotation);
    smoothedCamera.initialized = true;
    smoothedCamera.lastFollowed = followedEntity;
  } else {
    // Smoothly interpolate position and rotation
    smoothedCamera.position.lerp(targetPosition, CAMERA_SMOOTHING.positionLerp);
    smoothedCamera.rotation.slerp(
      transform.rotation,
      CAMERA_SMOOTHING.rotationLerp,
    );
  }

  // Apply smoothed values to actual camera
  threeCamera.position.copy(smoothedCamera.position);
  threeCamera.quaternion.copy(smoothedCamera.rotation);
}

/** Start the battle simulation */
export function startBattleSimulation(sim: BattleSimulation): void {
  startGame(sim.game);
}

/** Stop the battle simulation */
export function stopBattleSimulation(sim: BattleSimulation): void {
  stopGame(sim.game);
}

/** Dispose of all simulation resources */
export function disposeBattleSimulation(sim: BattleSimulation): void {
  stopGame(sim.game);
  disposeRenderer(sim.renderer);
}
