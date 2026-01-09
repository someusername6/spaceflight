/**
 * Nuclear Lance Origin Effects - Flash and light at the firing point.
 */

import * as THREE from 'three';
import type { LanceShot, NuclearLanceRenderer } from './nuclear-lance-types';
import {
  ORIGIN_FLASH_COLOR,
  ORIGIN_FLASH_DURATION,
  ORIGIN_FLASH_FADE_COLOR,
  ORIGIN_FLASH_MAX_SCALE,
  ORIGIN_LIGHT_DISTANCE,
  ORIGIN_LIGHT_INTENSITY,
  tempColor,
} from './nuclear-lance-types';

/** Create origin flash and light effects */
export function createOriginEffects(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
): void {
  // Origin flash sphere
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: ORIGIN_FLASH_COLOR,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(renderer.sphereGeometry.clone(), flashMaterial);
  flash.position.copy(shot.origin);
  flash.scale.setScalar(1);
  scene.add(flash);
  renderer.originFlashMeshes.set(key, flash);

  // Origin point light
  const light = new THREE.PointLight(
    ORIGIN_FLASH_COLOR,
    ORIGIN_LIGHT_INTENSITY,
    ORIGIN_LIGHT_DISTANCE,
  );
  light.position.copy(shot.origin);
  scene.add(light);
  renderer.originLights.set(key, light);
}

/** Update origin effects (expand and fade) */
export function updateOriginEffects(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  age: number,
): void {
  const flash = renderer.originFlashMeshes.get(key);
  const light = renderer.originLights.get(key);

  if (!flash || !light) return;

  const progress = age / ORIGIN_FLASH_DURATION;

  if (progress >= 1) {
    // Remove completed effects
    scene.remove(flash);
    flash.geometry.dispose();
    (flash.material as THREE.Material).dispose();
    renderer.originFlashMeshes.delete(key);

    scene.remove(light);
    renderer.originLights.delete(key);
    return;
  }

  // Expand and fade flash
  const easedProgress = 1 - (1 - progress) ** 2; // Ease out
  const scale = 1 + easedProgress * (ORIGIN_FLASH_MAX_SCALE - 1);
  flash.scale.setScalar(scale);

  // Color shift from white-gold to cool blue
  const material = flash.material as THREE.MeshBasicMaterial;
  tempColor.copy(ORIGIN_FLASH_COLOR);
  tempColor.lerp(ORIGIN_FLASH_FADE_COLOR, progress * 0.7);
  material.color.copy(tempColor);
  material.opacity = 1 - easedProgress;

  // Fade light
  light.intensity = ORIGIN_LIGHT_INTENSITY * (1 - easedProgress);
}
