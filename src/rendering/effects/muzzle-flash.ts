/**
 * Muzzle Flash Rendering - Visual feedback when weapons fire.
 *
 * Shows brief flashes at weapon muzzle positions when projectiles spawn
 * and continuous glow at beam origin points.
 */

import * as THREE from 'three';
import type { Projectile, WeaponName } from '../../components/projectile';
import type { Transform } from '../../components/transform';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/** Flash duration in seconds */
const FLASH_DURATION = 0.08;

/** Flash colors by weapon type (weapon-coded, not faction-coded) */
const WEAPON_FLASH_COLORS: Record<string, THREE.Color> = {
  // Energy weapons - match bolt color
  Plasma: new THREE.Color(0.0, 1.0, 0.0), // Pure green (#0f0)
  Pulse: new THREE.Color(0.3, 0.9, 1.0), // Cyan
  Ion: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
  // Ballistic weapons - explosion-colored (orange/yellow)
  Autocannon: new THREE.Color(1.0, 0.6, 0.2), // Orange
  Railgun: new THREE.Color(1.0, 1.0, 1.0), // White
  Flak: new THREE.Color(1.0, 0.5, 0.2), // Orange
  Shrapnel: new THREE.Color(1.0, 0.6, 0.2), // Orange
};

/** Default flash color for unknown weapons */
const DEFAULT_FLASH_COLOR = new THREE.Color(1.0, 0.5, 0.2); // Orange

/** Beam glow colors (match beam colors from beam-helpers.ts) */
const BEAM_GLOW_COLORS: Record<string, THREE.Color> = {
  Red: new THREE.Color(1, 0, 0),
  Green: new THREE.Color(0, 1, 0),
  Blue: new THREE.Color(0, 0, 1),
  Lightning: new THREE.Color(0.6, 0.8, 1.0), // Electric blue-white
  Nuclear: new THREE.Color(1.0, 0.95, 0.8), // Bright white-gold
  Torch: new THREE.Color(1.0, 0.6, 0.2), // Orange plasma
};
const DEFAULT_BEAM_GLOW = new THREE.Color(1.0, 1.0, 1.0);

// Track seen projectiles to detect new ones
const seenProjectiles = new Set<Entity>();
const newProjectiles: Array<{
  position: THREE.Vector3;
  weaponName: WeaponName;
}> = [];

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
  weaponName: WeaponName,
): THREE.Mesh {
  const color = WEAPON_FLASH_COLORS[weaponName] ?? DEFAULT_FLASH_COLOR;
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
      mesh: createFlashMesh(renderer, scene, proj.position, proj.weaponName),
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
      const projectile = getComponent<Projectile>(world, entity, 'projectile');

      newProjectiles.push({
        position: transform.position.clone(),
        weaponName: projectile?.weaponName ?? 'Plasma',
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
  const activeBeams = world.systemState.beams.activeBeams;
  const seenGlows = new Set<string>();

  for (const [entity, beams] of activeBeams) {
    for (const beam of beams) {
      if (!beam.active) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenGlows.add(key);

      let glow = renderer.beamGlows.get(key);
      if (!glow) {
        // Determine color from beam (check weapon name first, then RGB)
        let glowColor = DEFAULT_BEAM_GLOW;
        if (beam.weaponName === 'Lightning') {
          glowColor = BEAM_GLOW_COLORS.Lightning as THREE.Color;
        } else if (beam.weaponName === 'Nuclear Lance') {
          glowColor = BEAM_GLOW_COLORS.Nuclear as THREE.Color;
        } else if (beam.weaponName === 'Torch') {
          glowColor = BEAM_GLOW_COLORS.Torch as THREE.Color;
        } else {
          for (const [colorName, color] of Object.entries(BEAM_GLOW_COLORS)) {
            if (beam.color.r > 0.5 && colorName === 'Red') glowColor = color;
            if (beam.color.g > 0.5 && colorName === 'Green') glowColor = color;
            if (beam.color.b > 0.5 && colorName === 'Blue') glowColor = color;
          }
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
