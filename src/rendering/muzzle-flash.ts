/**
 * Muzzle Flash Rendering - Visual feedback when weapons fire.
 *
 * Shows brief flashes at weapon muzzle positions when projectiles spawn
 * and continuous glow at beam origin points.
 */

import * as THREE from 'three';
import { Faction, type FactionComponent } from '../components/faction';
import type { Transform } from '../components/transform';
import { getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { getActiveBeams } from '../systems/beams';

/** Flash duration in seconds */
const FLASH_DURATION = 0.08;

/** Flash colors by faction */
const FLASH_COLORS = {
  [Faction.Player]: new THREE.Color(0.2, 1.0, 0.3), // Green
  [Faction.Enemy]: new THREE.Color(1.0, 0.4, 0.1), // Orange
  [Faction.Neutral]: new THREE.Color(1.0, 1.0, 0.3), // Yellow
};

/** Beam glow colors (match beam colors from beams.ts) */
const BEAM_GLOW_COLORS: Record<string, THREE.Color> = {
  Red: new THREE.Color(1.0, 0.3, 0.2),
  Green: new THREE.Color(0.3, 1.0, 0.3),
  Blue: new THREE.Color(0.4, 0.5, 1.0),
};
const DEFAULT_BEAM_GLOW = new THREE.Color(1.0, 1.0, 1.0);

// Track seen projectiles to detect new ones
const seenProjectiles = new Set<Entity>();
const newProjectiles: Array<{ position: THREE.Vector3; faction: Faction }> = [];

/** Flash visual state */
interface FlashVisual {
  mesh: THREE.Mesh;
  startTime: number;
}

/** Beam glow visual state */
interface BeamGlowVisual {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
}

/** Muzzle flash renderer state */
export interface MuzzleFlashRenderer {
  flashes: FlashVisual[];
  beamGlows: Map<string, BeamGlowVisual>; // Key: "${entity}-${weaponIndex}"
  flashGeometry: THREE.SphereGeometry;
  glowGeometry: THREE.SphereGeometry;
}

/** Creates the muzzle flash renderer */
export function createMuzzleFlashRenderer(): MuzzleFlashRenderer {
  return {
    flashes: [],
    beamGlows: new Map(),
    flashGeometry: new THREE.SphereGeometry(1.5, 12, 8),
    glowGeometry: new THREE.SphereGeometry(0.8, 8, 6),
  };
}

/** Creates a flash mesh */
function createFlashMesh(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  position: THREE.Vector3,
  faction: Faction,
): THREE.Mesh {
  const color = FLASH_COLORS[faction] ?? FLASH_COLORS[Faction.Neutral];
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(renderer.flashGeometry.clone(), material);
  mesh.position.copy(position);
  scene.add(mesh);

  return mesh;
}

/** Creates a beam glow */
function createBeamGlow(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  color: THREE.Color,
): BeamGlowVisual {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(renderer.glowGeometry.clone(), material);
  scene.add(mesh);

  const light = new THREE.PointLight(color, 0.3, 8);
  scene.add(light);

  return { mesh, light };
}

/** Updates muzzle flash visuals */
export function updateMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  const gameTime = world.systemState.gameTime;

  // Detect new projectiles
  detectNewProjectiles(world);

  // Create flashes for new projectiles
  for (const proj of newProjectiles) {
    const flash: FlashVisual = {
      mesh: createFlashMesh(renderer, scene, proj.position, proj.faction),
      startTime: gameTime,
    };
    renderer.flashes.push(flash);
  }
  newProjectiles.length = 0;

  // Update existing flashes
  for (let i = renderer.flashes.length - 1; i >= 0; i--) {
    const flash = renderer.flashes[i];
    if (!flash) continue;

    const age = gameTime - flash.startTime;
    const progress = age / FLASH_DURATION;

    if (progress >= 1) {
      // Flash expired - remove
      scene.remove(flash.mesh);
      flash.mesh.geometry.dispose();
      (flash.mesh.material as THREE.Material).dispose();
      renderer.flashes.splice(i, 1);
    } else {
      // Update flash - expand and fade
      const scale = 1 + progress * 2;
      flash.mesh.scale.setScalar(scale);
      (flash.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
    }
  }

  // Update beam glows
  updateBeamGlows(renderer, scene, world);
}

/** Detect newly created projectiles */
function detectNewProjectiles(world: World): void {
  const currentProjectiles = new Set<Entity>();

  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    currentProjectiles.add(entity);

    if (!seenProjectiles.has(entity)) {
      // New projectile!
      const transform = getComponent<Transform>(
        world,
        entity,
        'transform',
      ) as Transform;
      const faction = getComponent<FactionComponent>(world, entity, 'faction');

      newProjectiles.push({
        position: transform.position.clone(),
        faction: faction?.faction ?? Faction.Neutral,
      });
    }
  }

  // Update seen set
  seenProjectiles.clear();
  for (const entity of currentProjectiles) {
    seenProjectiles.add(entity);
  }
}

/** Update beam origin glows */
function updateBeamGlows(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  const activeBeams = getActiveBeams(world);
  const seenGlows = new Set<string>();

  for (const [entity, beams] of activeBeams) {
    for (const beam of beams) {
      if (!beam.active) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenGlows.add(key);

      let glow = renderer.beamGlows.get(key);
      if (!glow) {
        // Determine color from beam
        let glowColor = DEFAULT_BEAM_GLOW;
        for (const [colorName, color] of Object.entries(BEAM_GLOW_COLORS)) {
          if (beam.color.r > 0.5 && colorName === 'Red') glowColor = color;
          if (beam.color.g > 0.5 && colorName === 'Green') glowColor = color;
          if (beam.color.b > 0.5 && colorName === 'Blue') glowColor = color;
        }

        glow = createBeamGlow(renderer, scene, glowColor);
        renderer.beamGlows.set(key, glow);
      }

      // Update glow position
      glow.mesh.position.copy(beam.origin);
      glow.light.position.copy(beam.origin);
      glow.mesh.visible = true;

      // Slight pulsing effect
      const pulse = 0.8 + 0.2 * Math.sin(world.systemState.gameTime * 20);
      glow.mesh.scale.setScalar(pulse);
      glow.light.intensity = 0.2 + 0.2 * pulse;
    }
  }

  // Hide inactive glows
  for (const [key, glow] of renderer.beamGlows) {
    if (!seenGlows.has(key)) {
      glow.mesh.visible = false;
      glow.light.intensity = 0;
    }
  }
}

/** Disposes of muzzle flash renderer resources */
export function disposeMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
): void {
  for (const flash of renderer.flashes) {
    scene.remove(flash.mesh);
    flash.mesh.geometry.dispose();
    (flash.mesh.material as THREE.Material).dispose();
  }
  renderer.flashes.length = 0;

  for (const glow of renderer.beamGlows.values()) {
    scene.remove(glow.mesh);
    scene.remove(glow.light);
    glow.mesh.geometry.dispose();
    (glow.mesh.material as THREE.Material).dispose();
  }
  renderer.beamGlows.clear();

  renderer.flashGeometry.dispose();
  renderer.glowGeometry.dispose();

  seenProjectiles.clear();
}
