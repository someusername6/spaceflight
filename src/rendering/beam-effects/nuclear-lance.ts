/**
 * Nuclear Lance Rendering - High-powered single-shot beam with nuclear flash.
 *
 * A devastating long-range beam weapon powered by a nuclear explosion.
 * Features bright beam with extended fade and origin flash effect.
 */

import * as THREE from 'three';
import type { World } from '../../core/types';

/** Lance shot visual state */
interface LanceShot {
  origin: THREE.Vector3;
  hitPoint: THREE.Vector3;
  startTime: number;
  active: boolean;
}

/** Nuclear lance renderer state */
export interface NuclearLanceRenderer {
  shots: Map<string, LanceShot>; // Key: "${entity}-${weaponIndex}"
  beamLines: Map<string, THREE.Line>;
  flashMeshes: Map<string, THREE.Mesh>;
  flashLights: Map<string, THREE.PointLight>;
  beamMaterial: THREE.LineBasicMaterial;
  flashGeometry: THREE.SphereGeometry;
  flashMaterial: THREE.MeshBasicMaterial;
}

/** Lance parameters */
const BEAM_FADE_TIME = 0.8; // 800ms beam fade
const FLASH_DURATION = 0.3; // 300ms flash at origin
const FLASH_MAX_SCALE = 8; // Flash expands to this size
const FLASH_LIGHT_INTENSITY = 3; // Point light intensity
const FLASH_LIGHT_DISTANCE = 150; // Light range

/** Lance colors */
const LANCE_BEAM_COLOR = new THREE.Color(1.0, 0.98, 0.9); // Bright white-gold
const LANCE_FLASH_COLOR = new THREE.Color(1.0, 0.95, 0.8); // Nuclear flash

/** Creates the nuclear lance renderer */
export function createNuclearLanceRenderer(
  _scene: THREE.Scene,
): NuclearLanceRenderer {
  const beamMaterial = new THREE.LineBasicMaterial({
    color: LANCE_BEAM_COLOR,
    transparent: true,
    opacity: 1.0,
    linewidth: 3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const flashGeometry = new THREE.SphereGeometry(1, 16, 12);

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: LANCE_FLASH_COLOR,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return {
    shots: new Map(),
    beamLines: new Map(),
    flashMeshes: new Map(),
    flashLights: new Map(),
    beamMaterial,
    flashGeometry,
    flashMaterial,
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
  const seenShots = new Set<string>();

  // Check for new lance shots
  for (const [entity, beams] of activeBeams) {
    for (const beam of beams) {
      // Only process nuclear lance
      if (beam.weaponName !== 'Nuclear Lance') continue;
      if (!beam.hitPoint || !beam.active) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenShots.add(key);

      let shot = renderer.shots.get(key);

      // Check if this is a new shot (beam just became active)
      if (!shot || !shot.active) {
        shot = {
          origin: beam.origin.clone(),
          hitPoint: beam.hitPoint.clone(),
          startTime: gameTime,
          active: true,
        };
        renderer.shots.set(key, shot);

        // Create beam line
        createBeamLine(renderer, scene, key, shot);

        // Create flash effect
        createFlashEffect(renderer, scene, key, shot);
      }
    }
  }

  // Update all shots (fade effects)
  for (const [key, shot] of renderer.shots) {
    const age = gameTime - shot.startTime;

    // Update beam fade
    const beamLine = renderer.beamLines.get(key);
    if (beamLine) {
      const beamProgress = age / BEAM_FADE_TIME;
      if (beamProgress >= 1) {
        // Beam fully faded - remove
        scene.remove(beamLine);
        beamLine.geometry.dispose();
        renderer.beamLines.delete(key);
      } else {
        // Update beam opacity and width (shrink as it fades)
        const opacity = 1 - beamProgress;
        (beamLine.material as THREE.LineBasicMaterial).opacity = opacity;
        // Slight color shift toward cooler as it fades
        const color = (beamLine.material as THREE.LineBasicMaterial).color;
        color.lerp(new THREE.Color(0.6, 0.7, 1.0), beamProgress * 0.3);
      }
    }

    // Update flash effect
    const flashMesh = renderer.flashMeshes.get(key);
    const flashLight = renderer.flashLights.get(key);
    if (flashMesh && flashLight) {
      const flashProgress = age / FLASH_DURATION;
      if (flashProgress >= 1) {
        // Flash complete - remove
        scene.remove(flashMesh);
        scene.remove(flashLight);
        flashMesh.geometry.dispose();
        renderer.flashMeshes.delete(key);
        renderer.flashLights.delete(key);
      } else {
        // Expand and fade flash
        const scale = 1 + flashProgress * (FLASH_MAX_SCALE - 1);
        flashMesh.scale.setScalar(scale);
        (flashMesh.material as THREE.MeshBasicMaterial).opacity =
          1 - flashProgress;
        flashLight.intensity = FLASH_LIGHT_INTENSITY * (1 - flashProgress);
      }
    }

    // Check if shot is fully complete
    if (!renderer.beamLines.has(key) && !renderer.flashMeshes.has(key)) {
      shot.active = false;
      renderer.shots.delete(key);
    }
  }
}

/** Create beam line for lance shot */
function createBeamLine(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
): void {
  // Remove existing if any
  const existing = renderer.beamLines.get(key);
  if (existing) {
    scene.remove(existing);
    existing.geometry.dispose();
  }

  // Create line geometry
  const positions = new Float32Array([
    shot.origin.x,
    shot.origin.y,
    shot.origin.z,
    shot.hitPoint.x,
    shot.hitPoint.y,
    shot.hitPoint.z,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = renderer.beamMaterial.clone();
  const line = new THREE.Line(geometry, material);
  scene.add(line);

  renderer.beamLines.set(key, line);
}

/** Create flash effect at origin */
function createFlashEffect(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
): void {
  // Remove existing if any
  const existingMesh = renderer.flashMeshes.get(key);
  const existingLight = renderer.flashLights.get(key);
  if (existingMesh) {
    scene.remove(existingMesh);
    existingMesh.geometry.dispose();
  }
  if (existingLight) {
    scene.remove(existingLight);
  }

  // Create flash mesh
  const material = renderer.flashMaterial.clone();
  const mesh = new THREE.Mesh(renderer.flashGeometry.clone(), material);
  mesh.position.copy(shot.origin);
  scene.add(mesh);
  renderer.flashMeshes.set(key, mesh);

  // Create point light
  const light = new THREE.PointLight(
    LANCE_FLASH_COLOR,
    FLASH_LIGHT_INTENSITY,
    FLASH_LIGHT_DISTANCE,
  );
  light.position.copy(shot.origin);
  scene.add(light);
  renderer.flashLights.set(key, light);
}

/** Dispose of nuclear lance renderer resources */
export function disposeNuclearLanceRenderer(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
): void {
  for (const line of renderer.beamLines.values()) {
    scene.remove(line);
    line.geometry.dispose();
  }
  for (const mesh of renderer.flashMeshes.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
  }
  for (const light of renderer.flashLights.values()) {
    scene.remove(light);
  }
  renderer.beamMaterial.dispose();
  renderer.flashGeometry.dispose();
  renderer.flashMaterial.dispose();
  renderer.shots.clear();
  renderer.beamLines.clear();
  renderer.flashMeshes.clear();
  renderer.flashLights.clear();
}
