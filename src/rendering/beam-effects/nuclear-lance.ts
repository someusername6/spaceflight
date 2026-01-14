/**
 * Nuclear Lance Rendering - High-powered single-shot beam with nuclear effects.
 *
 * A devastating long-range beam weapon powered by a nuclear explosion.
 * Features volumetric beam with origin flash and impact effects (flash, ring, particles).
 */

import * as THREE from 'three';
import type { World } from '../../core/types';
import { createBeamCylinders, updateBeamCylinders } from './nuclear-lance-beam';
import {
  createImpactEffects,
  updateImpactEffects,
} from './nuclear-lance-impact';
import {
  createOriginEffects,
  updateOriginEffects,
} from './nuclear-lance-origin';
import {
  BEAM_FADE_DURATION,
  IMPACT_RING_DURATION,
  type NuclearLanceRenderer,
  ORIGIN_FLASH_DURATION,
} from './nuclear-lance-types';

// Re-export types for external use
export type { NuclearLanceRenderer } from './nuclear-lance-types';

/** Creates the nuclear lance renderer */
export function createNuclearLanceRenderer(
  _scene: THREE.Scene,
): NuclearLanceRenderer {
  return {
    shots: new Map(),
    originFlashMeshes: new Map(),
    originLights: new Map(),
    beamCores: new Map(),
    beamGlows: new Map(),
    impactFlashMeshes: new Map(),
    impactRings: new Map(),
    impactLights: new Map(),
    impactParticles: new Map(),
    particleVelocities: new Map(),
    sphereGeometry: new THREE.SphereGeometry(1, 16, 12),
    ringGeometry: new THREE.TorusGeometry(1, 0.15, 8, 32),
  };
}

/** Update nuclear lance rendering */
export function updateNuclearLanceRenderer(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  const gameTime = world.systemState.gameTime;
  const activeBeams = world.systemState.beams.activeBeams;

  // Check for new lance shots
  for (const [entity, beams] of activeBeams) {
    for (const beam of beams) {
      if (beam.weaponName !== 'Nuclear Lance') continue;
      if (!beam.hitPoint) continue;
      // Instant beams use lanceFireTime to track when they were fired
      if (beam.lanceFireTime === undefined) continue;

      const key = `${entity}-${beam.weaponIndex}`;

      let shot = renderer.shots.get(key);

      // Check if this is a new shot (different lanceFireTime than what we tracked)
      const isNewShot = !shot || shot.startTime !== beam.lanceFireTime;
      if (isNewShot) {
        shot = {
          origin: beam.origin.clone(),
          hitPoint: beam.hitPoint.clone(),
          startTime: beam.lanceFireTime,
          active: true,
          entitySeed: entity * 31337 + Math.floor(beam.lanceFireTime * 1000),
        };
        renderer.shots.set(key, shot);

        // Create all visual elements
        createOriginEffects(renderer, scene, key, shot);
        createBeamCylinders(renderer, scene, key, shot);
        createImpactEffects(renderer, scene, key, shot);
      }
    }
  }

  // Update all shots
  for (const [key, shot] of renderer.shots) {
    const age = gameTime - shot.startTime;
    updateOriginEffects(renderer, scene, key, age);
    updateBeamCylinders(renderer, scene, key, age);
    updateImpactEffects(renderer, scene, key, shot, age);

    // Check if shot is fully complete (all effects done)
    const maxDuration = Math.max(
      ORIGIN_FLASH_DURATION,
      BEAM_FADE_DURATION,
      IMPACT_RING_DURATION,
    );
    if (age >= maxDuration) {
      shot.active = false;
      renderer.shots.delete(key);
    }
  }
}

/**
 * Reset nuclear lance renderer state (for replay seeking).
 * Removes active visuals without disposing shared geometries.
 */
export function resetNuclearLanceRenderer(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
): void {
  // Origin effects
  for (const mesh of renderer.originFlashMeshes.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  for (const light of renderer.originLights.values()) {
    scene.remove(light);
  }

  // Beam cylinders
  for (const mesh of renderer.beamCores.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  for (const mesh of renderer.beamGlows.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }

  // Impact effects
  for (const mesh of renderer.impactFlashMeshes.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  for (const mesh of renderer.impactRings.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  for (const light of renderer.impactLights.values()) {
    scene.remove(light);
  }
  for (const points of renderer.impactParticles.values()) {
    scene.remove(points);
    points.geometry.dispose();
    (points.material as THREE.Material).dispose();
  }

  // Clear all maps (keep shared geometries)
  renderer.shots.clear();
  renderer.originFlashMeshes.clear();
  renderer.originLights.clear();
  renderer.beamCores.clear();
  renderer.beamGlows.clear();
  renderer.impactFlashMeshes.clear();
  renderer.impactRings.clear();
  renderer.impactLights.clear();
  renderer.impactParticles.clear();
  renderer.particleVelocities.clear();
}

/** Dispose of nuclear lance renderer resources */
export function disposeNuclearLanceRenderer(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
): void {
  // Use reset to clear active visuals
  resetNuclearLanceRenderer(renderer, scene);

  // Dispose shared geometries
  renderer.sphereGeometry.dispose();
  renderer.ringGeometry.dispose();
}
