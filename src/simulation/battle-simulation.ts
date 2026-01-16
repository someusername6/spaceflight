/**
 * Battle Simulation - AI-controlled space battles for backgrounds.
 *
 * Creates and runs autonomous battles between two AI teams.
 * Used for title screen backgrounds and other non-interactive displays.
 */

import * as THREE from 'three';
import { Faction } from '../components/faction';
import { isDead } from '../components/health';
import type { Transform } from '../components/transform';
import { getComponent, isShip, queryEntities } from '../core/ecs';
import { createPRNG, random } from '../core/prng';
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
  createBoltRenderer,
  updateBoltRenderer,
} from '../rendering/effects/trails';
import {
  createExhaustRenderer,
  updateExhaustRenderer,
} from '../rendering/missile-exhaust';
import {
  createRenderer,
  disposeRenderer,
  getInterpolatedPosition,
  getInterpolatedRotation,
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
  /** Current camera position (computed from ship + offset) */
  position: THREE.Vector3;
  /** Current smoothed rotation (trails behind ship for cinematic effect) */
  rotation: THREE.Quaternion;
  /** Whether the camera has been initialized */
  initialized: boolean;
  /** Last followed entity (to detect target changes) */
  lastFollowed: Entity | null;
}

/** Camera configuration */
const CAMERA_CONFIG = {
  /** Camera offset behind and above ship (in ship's local space) */
  offset: new THREE.Vector3(0, 5, 20),
  /** Rotation smoothing speed (higher = faster/tighter following) */
  rotationSpeed: 4.0,
};

/** Battle simulation instance */
export interface BattleSimulation {
  game: Game;
  config: BattleConfig;
  container: HTMLElement;
  renderer: ReturnType<typeof createRenderer>;
  camera: BattleCamera;
  /** PRNG for spawn randomness (ephemeral, intentionally non-deterministic) */
  spawnRng: ReturnType<typeof createPRNG>;
  /** Camera state for following ships */
  smoothedCamera: SmoothedCamera;
  /** Last render time for frame delta calculation */
  lastRenderTime: number;
  // Effect renderers
  dustSystem: ReturnType<typeof createDustSystem>;
  explosionRenderer: ReturnType<typeof createExplosionRenderer>;
  boltRenderer: ReturnType<typeof createBoltRenderer>;
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
  sim: BattleSimulation,
  team: TeamConfig,
  faction: Faction,
  spawnRadius: number,
): Entity {
  const { spawnRng, game } = sim;
  // Random position on sphere surface using seeded PRNG
  const theta = random(spawnRng) * Math.PI * 2;
  const phi = Math.acos(2 * random(spawnRng) - 1);
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
    game.world,
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
  const { config } = sim;

  // Team A spawns on one hemisphere (positive Z)
  for (let i = 0; i < config.teamA.count; i++) {
    spawnTeamShip(sim, config.teamA, Faction.Player, config.spawnRadius);
  }

  // Team B spawns on opposite hemisphere (negative Z)
  for (let i = 0; i < config.teamB.count; i++) {
    spawnTeamShip(sim, config.teamB, Faction.Enemy, config.spawnRadius);
  }
}

/** Count living ships by faction */
function countLivingByFaction(world: World, faction: Faction): number {
  let count = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    if (!isShip(world, entity)) continue;

    const factionComp = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');

    if (factionComp?.faction === faction && health && !isDead(health)) {
      count++;
    }
  }
  return count;
}

/** Check and respawn ships as needed */
function checkRespawns(sim: BattleSimulation): void {
  const { game, config } = sim;

  const teamACount = countLivingByFaction(game.world, Faction.Player);
  const teamBCount = countLivingByFaction(game.world, Faction.Enemy);

  // Respawn team A ships
  for (let i = teamACount; i < config.teamA.count; i++) {
    spawnTeamShip(sim, config.teamA, Faction.Player, config.spawnRadius);
  }

  // Respawn team B ships
  for (let i = teamBCount; i < config.teamB.count; i++) {
    spawnTeamShip(sim, config.teamB, Faction.Enemy, config.spawnRadius);
  }
}

/** Create a new battle simulation */
export function createBattleSimulation(
  container: HTMLElement,
  config: BattleConfig,
): BattleSimulation {
  // Create ephemeral PRNG for spawn randomness (intentionally non-deterministic)
  // Title screen variation is desirable, but we use consistent PRNG methodology
  const spawnRng = createPRNG(Date.now() ^ (performance.now() * 1000));
  const seed = config.seed ?? Math.floor(random(spawnRng) * 100000);
  const game = createGame(seed);
  const renderer = createRenderer(container, seed);
  const scene = getScene(renderer);

  const sim: BattleSimulation = {
    game,
    config,
    container,
    renderer,
    camera: createBattleCamera(8),
    spawnRng,
    smoothedCamera: {
      position: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      initialized: false,
      lastFollowed: null,
    },
    lastRenderTime: 0,
    dustSystem: createDustSystem(scene),
    explosionRenderer: createExplosionRenderer(),
    boltRenderer: createBoltRenderer(),
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

  // Set up render callback with alpha for interpolation
  game.onRender = (_world, alpha) => {
    updateRender(sim, alpha);
  };

  return sim;
}

/** Update rendering for a simulation frame */
function updateRender(sim: BattleSimulation, alpha: number): void {
  const { game, renderer, camera } = sim;
  const world = game.world;
  const scene = getScene(renderer);

  // Calculate actual frame delta for frame-rate independent camera smoothing
  const now = performance.now();
  const frameDt =
    sim.lastRenderTime === 0 ? 1 / 60 : (now - sim.lastRenderTime) / 1000;
  sim.lastRenderTime = now;

  // Sync scene with world state (with interpolation)
  syncScene(renderer, world, alpha);

  // Update effect renderers
  updateExplosionRenderer(sim.explosionRenderer, scene, world);
  updateBoltRenderer(sim.boltRenderer, scene, world);
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

  // Update camera following
  const followed = updateBattleCamera(camera, world, 1 / 60);
  if (followed !== null) {
    const transform = getComponent(world, followed, 'transform');
    if (transform) {
      // Use interpolated position/rotation for camera (same as what's rendered)
      const interpPos = getInterpolatedPosition(followed);
      const interpRot = getInterpolatedRotation(followed);
      updateSmoothedCamera(
        sim,
        followed,
        transform,
        interpPos,
        interpRot,
        frameDt,
      );
      // Dust uses interpolated position for consistency
      if (interpPos) {
        updateDustSystem(sim.dustSystem, interpPos);
      }
    }
  }

  // Render
  render(renderer);
}

// Reusable vector to avoid per-frame allocations
const targetOffset = new THREE.Vector3();

/**
 * Update camera with cinematic following.
 *
 * Key insight: Position smoothing causes jitter because the variable lag
 * fights with physics interpolation. Instead, we:
 * 1. Follow the interpolated ship position EXACTLY (no position lag)
 * 2. Smooth only the camera ROTATION (cinematic trailing effect)
 * 3. Calculate offset using the smoothed rotation (smooth orbit during turns)
 *
 * This gives a cinematic feel without jitter.
 */
function updateSmoothedCamera(
  sim: BattleSimulation,
  followedEntity: Entity,
  transform: Transform,
  interpPos: THREE.Vector3 | null,
  interpRot: THREE.Quaternion | null,
  dt: number,
): void {
  const { renderer, smoothedCamera } = sim;
  const threeCamera = renderer.camera;

  // Use interpolated values if available, otherwise fall back to raw transform
  const shipPosition = interpPos ?? transform.position;
  const shipRotation = interpRot ?? transform.rotation;

  // Detect target change
  const targetChanged = smoothedCamera.lastFollowed !== followedEntity;

  if (!smoothedCamera.initialized || targetChanged) {
    // First frame or target switch: snap rotation (no smoothing)
    smoothedCamera.rotation.copy(shipRotation);
    smoothedCamera.initialized = true;
    smoothedCamera.lastFollowed = followedEntity;
  } else {
    // Smooth only rotation - gives cinematic "trailing" effect during turns
    // Frame-rate independent using exponential decay
    const rotLerp = 1 - Math.exp(-CAMERA_CONFIG.rotationSpeed * dt);
    smoothedCamera.rotation.slerp(shipRotation, rotLerp);
  }

  // Calculate offset using SMOOTHED rotation (camera orbits smoothly during turns)
  targetOffset.copy(CAMERA_CONFIG.offset);
  targetOffset.applyQuaternion(smoothedCamera.rotation);

  // Position follows ship exactly - NO position smoothing (prevents jitter)
  smoothedCamera.position.copy(shipPosition).add(targetOffset);

  // Apply to actual camera
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
