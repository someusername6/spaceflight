/**
 * Nuclear Lance Beam Effects - Volumetric cylinder beam with core and glow.
 */

import * as THREE from 'three';
import type { LanceShot, NuclearLanceRenderer } from './nuclear-lance-types';
import {
  BEAM_CORE_COLOR,
  BEAM_CORE_WIDTH,
  BEAM_FADE_COLOR,
  BEAM_FADE_DURATION,
  BEAM_GLOW_COLOR,
  BEAM_GLOW_WIDTH,
  BEAM_SEGMENTS,
  direction,
  quaternion,
  tempColor,
} from './nuclear-lance-types';

// Reusable vectors to avoid per-frame allocations
const _tempMidpoint = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Create beam cylinder meshes (inner core + outer glow) */
export function createBeamCylinders(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
): void {
  // Calculate beam direction and length
  direction.copy(shot.hitPoint).sub(shot.origin);
  const length = direction.length();
  direction.normalize();

  // Calculate midpoint and orientation
  _tempMidpoint.copy(shot.origin).addScaledVector(direction, length / 2);
  quaternion.setFromUnitVectors(UP, direction);

  // Inner core cylinder
  const coreGeometry = new THREE.CylinderGeometry(
    BEAM_CORE_WIDTH,
    BEAM_CORE_WIDTH,
    length,
    BEAM_SEGMENTS,
    1,
    true,
  );
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: BEAM_CORE_COLOR,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.copy(_tempMidpoint);
  core.quaternion.copy(quaternion);
  scene.add(core);
  renderer.beamCores.set(key, core);

  // Outer glow cylinder
  const glowGeometry = new THREE.CylinderGeometry(
    BEAM_GLOW_WIDTH,
    BEAM_GLOW_WIDTH,
    length,
    BEAM_SEGMENTS,
    1,
    true,
  );
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: BEAM_GLOW_COLOR,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(_tempMidpoint);
  glow.quaternion.copy(quaternion);
  scene.add(glow);
  renderer.beamGlows.set(key, glow);
}

/** Update beam cylinders (fade opacity, shift color, shrink width) */
export function updateBeamCylinders(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  age: number,
): void {
  const core = renderer.beamCores.get(key);
  const glow = renderer.beamGlows.get(key);

  if (!core || !glow) return;

  const progress = age / BEAM_FADE_DURATION;

  if (progress >= 1) {
    // Remove completed beams
    scene.remove(core);
    core.geometry.dispose();
    (core.material as THREE.Material).dispose();
    renderer.beamCores.delete(key);

    scene.remove(glow);
    glow.geometry.dispose();
    (glow.material as THREE.Material).dispose();
    renderer.beamGlows.delete(key);
    return;
  }

  const easedProgress = 1 - (1 - progress) ** 2;

  // Fade core opacity and shift color
  const coreMaterial = core.material as THREE.MeshBasicMaterial;
  coreMaterial.opacity = 1 - easedProgress * 0.8;
  tempColor.copy(BEAM_CORE_COLOR);
  tempColor.lerp(BEAM_FADE_COLOR, progress * 0.5);
  coreMaterial.color.copy(tempColor);

  // Fade glow opacity and shift color
  const glowMaterial = glow.material as THREE.MeshBasicMaterial;
  glowMaterial.opacity = 0.5 * (1 - easedProgress);
  tempColor.copy(BEAM_GLOW_COLOR);
  tempColor.lerp(BEAM_FADE_COLOR, progress * 0.6);
  glowMaterial.color.copy(tempColor);

  // Shrink beam width as it fades
  const widthScale = 1 - easedProgress * 0.5;
  core.scale.set(widthScale, 1, widthScale);
  glow.scale.set(widthScale, 1, widthScale);
}
