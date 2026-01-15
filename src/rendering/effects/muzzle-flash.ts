/**
 * Muzzle Flash Rendering - Visual feedback when weapons fire.
 *
 * Shows brief flashes at weapon muzzle positions when projectiles spawn
 * and continuous glow at beam origin points.
 */

import * as THREE from 'three';
import type { WeaponName } from '../../components/projectile';
import type { Transform } from '../../components/transform';
import { getComponent } from '../../core/ecs';
import type { World } from '../../core/types';
import { TICK_SEC } from '../../game';
import { getInterpolatedPosition } from '../renderer';

/** Flash duration in seconds */
const FLASH_DURATION = 0.08;

/** Muzzle flash visual properties */
const MUZZLE_FLASH_OPACITY = 1.0;
const MUZZLE_FLASH_SCALE = 1.0;
const MUZZLE_FLASH_EXPANSION = 2;

/** Flash colors by weapon type (weapon-coded, not faction-coded) */
const WEAPON_FLASH_COLORS: Record<string, THREE.Color> = {
  // Energy weapons - match bolt color
  Plasma: new THREE.Color(0.0, 1.0, 0.0), // Pure green (#0f0)
  Pulse: new THREE.Color(0.3, 0.9, 1.0), // Cyan
  Ion: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
  // Ballistic weapons - explosion-colored (orange/yellow)
  Autocannon: new THREE.Color(1.0, 0.6, 0.2), // Orange
  'Slug Cannon': new THREE.Color(0.9, 0.95, 1.0), // Blue-white (like railgun but cooler)
  Gyrojet: new THREE.Color(1.0, 0.4, 0.1), // Orange-red (rocket ignition)
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
  Torch: new THREE.Color(1.0, 0.6, 0.2), // Orange plasma
};
const DEFAULT_BEAM_GLOW = new THREE.Color(1.0, 1.0, 1.0);

// Reusable vectors for processing pending flashes and interpolation
const flashPosition = new THREE.Vector3();
const interpGlowPos = new THREE.Vector3();

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
  flashPool: FlashVisual[]; // Pooled flashes for reuse (avoids allocation)
  beamGlows: Map<string, BeamGlowVisual>; // Key: "${entity}-${weaponIndex}"
  flashGeometry: THREE.SphereGeometry;
  glowGeometry: THREE.SphereGeometry;
}

/** Creates the muzzle flash renderer */
export function createMuzzleFlashRenderer(): MuzzleFlashRenderer {
  return {
    flashes: [],
    flashPool: [],
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
    opacity: MUZZLE_FLASH_OPACITY,
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

/** Hide a flash visual (for pooling - doesn't dispose) */
function hideFlashVisual(flash: FlashVisual): void {
  flash.mesh.visible = false;
}

/** Reinitialize a pooled flash visual for reuse */
function reinitializeFlashVisual(
  flash: FlashVisual,
  position: THREE.Vector3,
  weaponName: WeaponName,
  gameTime: number,
): void {
  const color = WEAPON_FLASH_COLORS[weaponName] ?? DEFAULT_FLASH_COLOR;

  flash.mesh.position.copy(position);
  flash.mesh.scale.setScalar(MUZZLE_FLASH_SCALE);
  flash.mesh.visible = true;

  const material = flash.mesh.material as THREE.MeshBasicMaterial;
  material.color.copy(color);
  material.opacity = MUZZLE_FLASH_OPACITY;

  flash.startTime = gameTime;
}

/** Updates muzzle flash visuals */
export function updateMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
): void {
  // Calculate interpolated gameTime for smooth animation
  // Interpolate between previous time (gameTime - TICK_SEC) and current using alpha
  const gameTime = world.systemState.gameTime - TICK_SEC * (1 - alpha);
  const pendingFlashes = world.systemState.muzzleFlashes.pending;

  // Create flashes from pending queue (reuse from pool when available)
  // Skip stale items - they're from before a seek and would appear at wrong positions
  const maxAge = TICK_SEC * 2;
  for (const pending of pendingFlashes) {
    if (gameTime - pending.gameTime > maxAge) continue;

    flashPosition.set(pending.x, pending.y, pending.z);

    // Try to reuse from pool first (avoids allocation)
    const pooled = renderer.flashPool.pop();
    if (pooled) {
      reinitializeFlashVisual(
        pooled,
        flashPosition,
        pending.weaponName as WeaponName,
        gameTime,
      );
      renderer.flashes.push(pooled);
    } else {
      // No pooled flash available, create new one
      const flash: FlashVisual = {
        mesh: createFlashMesh(
          renderer,
          scene,
          flashPosition,
          pending.weaponName as WeaponName,
        ),
        startTime: gameTime,
      };
      renderer.flashes.push(flash);
    }
  }
  pendingFlashes.length = 0;

  // Update existing flashes
  for (let i = renderer.flashes.length - 1; i >= 0; i--) {
    const flash = renderer.flashes[i];
    if (!flash) continue;

    const age = gameTime - flash.startTime;
    const progress = age / FLASH_DURATION;

    if (progress >= 1) {
      // Flash expired - return to pool for reuse
      hideFlashVisual(flash);
      renderer.flashes.splice(i, 1);
      renderer.flashPool.push(flash);
    } else {
      // Update flash - expand and fade
      const scale = MUZZLE_FLASH_SCALE + progress * MUZZLE_FLASH_EXPANSION;
      flash.mesh.scale.setScalar(scale);
      (flash.mesh.material as THREE.MeshBasicMaterial).opacity =
        MUZZLE_FLASH_OPACITY * (1 - progress);
    }
  }

  // Update beam glows
  updateBeamGlows(renderer, scene, world, gameTime);
}

/** Update beam origin glows with interpolation */
function updateBeamGlows(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  world: World,
  gameTime: number,
): void {
  const activeBeams = world.systemState.beams.activeBeams;
  const seenGlows = new Set<string>();

  for (const [entity, beams] of activeBeams) {
    // Get entity's current and interpolated positions for offset calculation
    const transform = getComponent<Transform>(world, entity, 'transform');
    const interpEntityPos = getInterpolatedPosition(entity);
    const entityPos = transform?.position;

    for (const beam of beams) {
      // Skip Nuclear Lance - has dedicated renderer with full visual effects
      if (beam.weaponName === 'Nuclear Lance') continue;

      // Handle instant beam flashes (one-shot flash when fired)
      if (beam.isInstantBeam && beam.lanceFireTime !== undefined) {
        // Other instant beams (if any) can have simple flashes here
        continue; // Instant beams don't show continuous glow
      }

      if (!beam.active) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenGlows.add(key);

      let glow = renderer.beamGlows.get(key);
      if (!glow) {
        // Determine color from beam (check weapon name first, then RGB)
        let glowColor = DEFAULT_BEAM_GLOW;
        if (beam.weaponName === 'Lightning') {
          glowColor = BEAM_GLOW_COLORS.Lightning as THREE.Color;
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

      // Calculate interpolated glow position
      if (interpEntityPos && entityPos) {
        // Apply offset: interpPos = beamOrigin + (interpEntityPos - entityPos)
        interpGlowPos.copy(beam.origin).add(interpEntityPos).sub(entityPos);
        glow.mesh.position.copy(interpGlowPos);
        glow.light.position.copy(interpGlowPos);
      } else {
        glow.mesh.position.copy(beam.origin);
        glow.light.position.copy(beam.origin);
      }
      glow.mesh.visible = true;

      // Slight pulsing effect (uses interpolated gameTime for smooth animation)
      const pulse = 0.8 + 0.2 * Math.sin(gameTime * 20);
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

/**
 * Reset muzzle flash renderer state (for replay seeking).
 * Returns active flashes to pool for reuse.
 */
export function resetMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  _scene: THREE.Scene,
): void {
  // Return active flashes to pool (don't dispose - reuse them)
  for (const flash of renderer.flashes) {
    hideFlashVisual(flash);
    renderer.flashPool.push(flash);
  }
  renderer.flashes.length = 0;

  // Hide beam glows (keep for reuse)
  for (const glow of renderer.beamGlows.values()) {
    glow.mesh.visible = false;
    glow.light.intensity = 0;
  }
}

/** Disposes of muzzle flash renderer resources */
export function disposeMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
): void {
  // Dispose active flashes
  for (const flash of renderer.flashes) {
    scene.remove(flash.mesh);
    flash.mesh.geometry.dispose();
    (flash.mesh.material as THREE.Material).dispose();
  }
  renderer.flashes.length = 0;

  // Dispose pooled flashes
  for (const flash of renderer.flashPool) {
    scene.remove(flash.mesh);
    flash.mesh.geometry.dispose();
    (flash.mesh.material as THREE.Material).dispose();
  }
  renderer.flashPool.length = 0;

  for (const glow of renderer.beamGlows.values()) {
    scene.remove(glow.mesh);
    scene.remove(glow.light);
    glow.mesh.geometry.dispose();
    (glow.mesh.material as THREE.Material).dispose();
  }
  renderer.beamGlows.clear();

  renderer.flashGeometry.dispose();
  renderer.glowGeometry.dispose();
}
