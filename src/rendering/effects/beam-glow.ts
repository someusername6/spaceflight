/**
 * Beam Origin Glow Rendering - Visual glow effects at beam weapon muzzle points.
 *
 * Shows continuous glow at active beam origin points with interpolated positions.
 */

import * as THREE from 'three';
import { getComponent } from '../../core/ecs';
import type { World } from '../../core/types';
import { getInterpolatedPosition, type Renderer } from '../renderer';

/** Beam glow colors (match beam colors from beam-helpers.ts) */
const BEAM_GLOW_COLORS: Record<string, THREE.Color> = {
  Red: new THREE.Color(1, 0, 0),
  Green: new THREE.Color(0, 1, 0),
  Blue: new THREE.Color(0, 0, 1),
  Lightning: new THREE.Color(0.6, 0.8, 1.0), // Electric blue-white
  Torch: new THREE.Color(1.0, 0.6, 0.2), // Orange plasma
};
const DEFAULT_BEAM_GLOW = new THREE.Color(1.0, 1.0, 1.0);

// Reusable vector for interpolated glow position
const interpGlowPos = new THREE.Vector3();

// Reusable set for tracking seen glows (cleared each frame)
const seenGlows = new Set<string>();

/** Beam glow visual state */
export interface BeamGlowVisual {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
}

/** Creates a beam glow */
export function createBeamGlow(
  glowGeometry: THREE.SphereGeometry,
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

  const mesh = new THREE.Mesh(glowGeometry.clone(), material);
  scene.add(mesh);

  const light = new THREE.PointLight(color, 0.3, 8);
  scene.add(light);

  return { mesh, light };
}

/** Update beam origin glows with interpolation */
export function updateBeamGlows(
  beamGlows: Map<string, BeamGlowVisual>,
  glowGeometry: THREE.SphereGeometry,
  scene: THREE.Scene,
  world: World,
  gameTime: number,
  renderer?: Renderer,
): void {
  const activeBeams = world.systemState.beams.activeBeams;
  seenGlows.clear();

  for (const [entity, beams] of activeBeams) {
    // Get entity's current and interpolated positions for offset calculation
    const transform = getComponent(world, entity, 'transform');
    const interpEntityPos = renderer
      ? getInterpolatedPosition(renderer, entity)
      : null;
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

      let glow = beamGlows.get(key);
      if (!glow) {
        // Determine color from beam (check weapon name first, then RGB)
        let glowColor = DEFAULT_BEAM_GLOW;
        if (beam.weaponName === 'Lightning') {
          glowColor = BEAM_GLOW_COLORS.Lightning as THREE.Color;
        } else if (beam.weaponName === 'Torch') {
          glowColor = BEAM_GLOW_COLORS.Torch as THREE.Color;
        } else {
          // Pick glow by dominant RGB channel (stable for mixed colors like orange)
          const { r, g, b } = beam.color;
          if (r >= g && r >= b) {
            glowColor = BEAM_GLOW_COLORS.Red as THREE.Color;
          } else if (g >= r && g >= b) {
            glowColor = BEAM_GLOW_COLORS.Green as THREE.Color;
          } else {
            glowColor = BEAM_GLOW_COLORS.Blue as THREE.Color;
          }
        }

        glow = createBeamGlow(glowGeometry, scene, glowColor);
        beamGlows.set(key, glow);
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
  for (const [key, glow] of beamGlows) {
    if (!seenGlows.has(key)) {
      glow.mesh.visible = false;
      glow.light.intensity = 0;
    }
  }
}

/** Hide all beam glows (for reset) */
export function hideBeamGlows(beamGlows: Map<string, BeamGlowVisual>): void {
  for (const glow of beamGlows.values()) {
    glow.mesh.visible = false;
    glow.light.intensity = 0;
  }
}

/** Dispose all beam glow resources */
export function disposeBeamGlows(
  beamGlows: Map<string, BeamGlowVisual>,
  scene: THREE.Scene,
): void {
  for (const glow of beamGlows.values()) {
    scene.remove(glow.mesh);
    scene.remove(glow.light);
    glow.mesh.geometry.dispose();
    (glow.mesh.material as THREE.Material).dispose();
  }
  beamGlows.clear();
}
