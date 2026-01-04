/**
 * Main entry point - initializes game and starts the loop.
 */

import { Vector3 } from 'three';
import type { Transform } from './components/transform';
import { findEntity, getComponent } from './core/ecs';
import { createEnemyShip, createPlayerShip } from './factories/ship';
import { createGame, startGame } from './game';
import {
  createLightningRenderer,
  updateLightningRenderer,
} from './rendering/beam-effects/lightning';
import {
  createNuclearLanceRenderer,
  updateNuclearLanceRenderer,
} from './rendering/beam-effects/nuclear-lance';
import { createDustSystem, updateDustSystem } from './rendering/effects/dust';
import {
  createExplosionRenderer,
  updateExplosionRenderer,
} from './rendering/effects/explosions';
import {
  createMuzzleFlashRenderer,
  updateMuzzleFlashRenderer,
} from './rendering/effects/muzzle-flash';
import {
  createProjectileHitRenderer,
  updateProjectileHitRenderer,
} from './rendering/effects/projectile-hits';
import {
  createShieldEffectRenderer,
  updateShieldEffectRenderer,
} from './rendering/effects/shield-effects';
import {
  createTrailRenderer,
  updateTrailRenderer,
} from './rendering/effects/trails';
import { createHUD, updateHUD } from './rendering/hud/hud';
import {
  createExhaustRenderer,
  updateExhaustRenderer,
} from './rendering/missile-exhaust';
import {
  createRenderer,
  followEntity,
  getScene,
  render,
  syncScene,
} from './rendering/renderer';
import { initInput } from './systems/input';

/** Default seed for deterministic testing */
const DEFAULT_TEST_SEED = 12345;

/**
 * Get game seed from URL parameter or use random seed.
 * Use ?seed=12345 for deterministic testing.
 * Use ?seed=random or omit for variety.
 */
function getGameSeed(): number {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  if (seedParam === null || seedParam === 'random') {
    // Use current timestamp for variety in normal play
    return performance.now() | 0;
  }

  const parsed = Number.parseInt(seedParam, 10);
  return Number.isNaN(parsed) ? DEFAULT_TEST_SEED : parsed;
}

/** Initialize and start the game */
function main(): void {
  // Get container
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container not found');
  }

  // Initialize input
  initInput();

  // Create game with seed (configurable via URL ?seed=12345)
  const seed = getGameSeed();
  const game = createGame(seed);

  // Create renderer with same seed for deterministic skybox
  const renderer = createRenderer(container, seed);

  // Create dust particle system
  const dustSystem = createDustSystem(getScene(renderer));

  // Create explosion renderer
  const explosionRenderer = createExplosionRenderer();

  // Create trail renderer for projectiles
  const trailRenderer = createTrailRenderer();

  // Create missile exhaust renderer
  const exhaustRenderer = createExhaustRenderer();

  // Create shield effect renderer
  const shieldEffectRenderer = createShieldEffectRenderer();

  // Create muzzle flash renderer
  const muzzleFlashRenderer = createMuzzleFlashRenderer();

  // Create lightning renderer
  const lightningRenderer = createLightningRenderer(getScene(renderer));

  // Create nuclear lance renderer
  const nuclearLanceRenderer = createNuclearLanceRenderer(getScene(renderer));

  // Create projectile hit renderer
  const projectileHitRenderer = createProjectileHitRenderer();

  // Create HUD
  const hud = createHUD(container);

  // Setup Slice 1 test scene
  setupSlice1Scene(game);

  // Set render callback
  game.onRender = (world, _alpha) => {
    // Sync scene with ECS
    syncScene(renderer, world);

    // Update explosion effects
    updateExplosionRenderer(explosionRenderer, getScene(renderer), world);

    // Update projectile trails
    updateTrailRenderer(trailRenderer, getScene(renderer), world);

    // Update missile exhaust flames
    updateExhaustRenderer(
      exhaustRenderer,
      getScene(renderer),
      world,
      world.systemState.gameTime,
    );

    // Update shield hit effects
    updateShieldEffectRenderer(shieldEffectRenderer, getScene(renderer), world);

    // Update muzzle flash effects
    updateMuzzleFlashRenderer(muzzleFlashRenderer, getScene(renderer), world);

    // Update lightning effects
    updateLightningRenderer(lightningRenderer, getScene(renderer), world);

    // Update nuclear lance effects
    updateNuclearLanceRenderer(nuclearLanceRenderer, getScene(renderer), world);

    // Update projectile hit effects
    updateProjectileHitRenderer(
      projectileHitRenderer,
      getScene(renderer),
      world,
    );

    // Follow player and update dust
    const player = findEntity(world, ['playerControlled', 'transform']);
    if (player !== undefined) {
      followEntity(renderer, world, player);

      // Update dust particles around player position
      const transform = getComponent<Transform>(world, player, 'transform');
      if (transform) {
        updateDustSystem(dustSystem, transform.position);
      }
    }

    // Render (updates all world matrices)
    render(renderer);

    // Update HUD (uses matrices updated by render)
    updateHUD(
      hud,
      world,
      renderer.camera,
      renderer.entityMeshes,
      container.clientWidth,
      container.clientHeight,
    );
  };

  // Mission end disabled for flight testing
  // game.onMissionEnd = (result) => {
  //   if (result === MissionResult.Victory) {
  //     console.log('Victory! All enemies destroyed.');
  //     showMessage('VICTORY', 'green');
  //   } else if (result === MissionResult.Defeat) {
  //     console.log('Defeat! Player destroyed.');
  //     showMessage('DEFEAT', 'red');
  //   }
  // };

  // Start game loop
  startGame(game);

  console.log('Spaceflight Slice 2 - Combat Basics');
  console.log(
    'Flight: WASD = Pitch/Yaw, QE = Roll, Shift = Accelerate, Ctrl = Decelerate, Z = Afterburner',
  );
  console.log(
    'Combat: Space = Fire, T = Target nearest, [ ] = Cycle targets, < > = Cycle weapons',
  );
  console.log('Objective: Destroy all enemy ships!');
}

/** Setup the Slice 1 test scene */
function setupSlice1Scene(game: ReturnType<typeof createGame>): void {
  const { world } = game;

  // Create player ship at origin
  createPlayerShip(world, 'interceptor', new Vector3(0, 0, 0));

  // Create idle enemies for testing (AI disabled)
  createEnemyShip(world, 'scout', new Vector3(100, 20, -200));
  createEnemyShip(world, 'scout', new Vector3(-80, -10, -150));
  createEnemyShip(world, 'interceptor', new Vector3(50, 30, -300));
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
