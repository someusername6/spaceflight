/**
 * Lightning Bolt Rendering - Procedural lightning effects using midpoint
 * displacement algorithm with branch generation for secondary arcs.
 */

import * as THREE from 'three';
import type { World } from '../../core/types';
import {
  generateBoltPath,
  generateBranches,
  generateOffTargetEnd,
} from './lightning-bolt';

/** Lightning bolt visual state */
interface LightningBolt {
  segments: THREE.Vector3[]; // Main bolt path
  branches: THREE.Vector3[][]; // Secondary branch paths
  startTime: number;
  active: boolean;
}

/** Lightning renderer state */
export interface LightningRenderer {
  bolts: Map<string, LightningBolt>; // Key: "${entity}-${weaponIndex}"
  mainLine: THREE.Line | null;
  branchLines: THREE.Line[];
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  branchMaterial: THREE.LineBasicMaterial;
}

// Colors and parameters
const LIGHTNING_COLOR = new THREE.Color(0.7, 0.85, 1.0);
const LIGHTNING_CORE_COLOR = new THREE.Color(1.0, 1.0, 1.0);
const BOLT_SUBDIVISIONS = 5;
const DISPLACEMENT_SCALE = 0.15;
const BRANCH_PROBABILITY = 0.25;
const BOLT_FADE_TIME = 0.05;
const OFF_TARGET_RANGE = 120;
const OFF_TARGET_CHAOS = 0.35;

/** Creates the lightning renderer */
export function createLightningRenderer(
  _scene: THREE.Scene,
): LightningRenderer {
  const geometry = new THREE.BufferGeometry();

  const material = new THREE.LineBasicMaterial({
    color: LIGHTNING_CORE_COLOR,
    transparent: true,
    opacity: 1.0,
    linewidth: 2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const branchMaterial = new THREE.LineBasicMaterial({
    color: LIGHTNING_COLOR,
    transparent: true,
    opacity: 0.7,
    linewidth: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return {
    bolts: new Map(),
    mainLine: null,
    branchLines: [],
    geometry,
    material,
    branchMaterial,
  };
}

/** Update lightning rendering */
export function updateLightningRenderer(
  renderer: LightningRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  const gameTime = world.systemState.gameTime;
  const activeBeams = world.systemState.beams.activeBeams;
  const seenBolts = new Set<string>();

  // Update active lightning bolts
  for (const [entity, beams] of activeBeams) {
    for (const beam of beams) {
      // Only process lightning weapons
      if (beam.weaponName !== 'Lightning') continue;
      if (!beam.hitPoint) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenBolts.add(key);

      let bolt = renderer.bolts.get(key);

      // Check if we need to generate a new bolt (on pulse)
      if (beam.pulseActive) {
        // Determine if on-target or off-target
        const distance = beam.origin.distanceTo(beam.hitPoint);
        const isOffTarget = distance < OFF_TARGET_RANGE * 0.9; // Close = off-target arc

        // Generate new bolt path
        const displacementScale = isOffTarget
          ? OFF_TARGET_CHAOS
          : DISPLACEMENT_SCALE;
        const endPoint = isOffTarget
          ? generateOffTargetEnd(
              beam.origin,
              beam.direction,
              OFF_TARGET_RANGE,
              world.prng,
            )
          : beam.hitPoint.clone();

        const segments = generateBoltPath(
          beam.origin,
          endPoint,
          BOLT_SUBDIVISIONS,
          displacementScale,
          world.prng,
        );

        const branches = isOffTarget
          ? [] // No branches for off-target arcs
          : generateBranches(
              segments,
              BRANCH_PROBABILITY,
              DISPLACEMENT_SCALE,
              world.prng,
            );

        bolt = {
          segments,
          branches,
          startTime: gameTime,
          active: true,
        };
        renderer.bolts.set(key, bolt);
      } else if (bolt) {
        // Fade out existing bolt
        const age = gameTime - bolt.startTime;
        if (age > BOLT_FADE_TIME) {
          bolt.active = false;
        }
      }
    }
  }

  // Remove inactive bolts
  for (const [key, bolt] of renderer.bolts) {
    if (!seenBolts.has(key) || !bolt.active) {
      renderer.bolts.delete(key);
    }
  }

  // Render all active bolts
  renderBolts(renderer, scene, gameTime);
}

/** Render all active lightning bolts */
function renderBolts(
  renderer: LightningRenderer,
  scene: THREE.Scene,
  gameTime: number,
): void {
  // Remove existing lines
  if (renderer.mainLine) {
    scene.remove(renderer.mainLine);
    renderer.mainLine.geometry.dispose();
    renderer.mainLine = null;
  }
  for (const line of renderer.branchLines) {
    scene.remove(line);
    line.geometry.dispose();
  }
  renderer.branchLines = [];

  // Collect all segments for rendering
  for (const bolt of renderer.bolts.values()) {
    if (!bolt.active) continue;

    // Calculate opacity based on age
    const age = gameTime - bolt.startTime;
    const opacity = Math.max(0, 1 - age / BOLT_FADE_TIME);

    // Render main bolt
    if (bolt.segments.length > 1) {
      const positions = new Float32Array(bolt.segments.length * 3);
      for (let i = 0; i < bolt.segments.length; i++) {
        const p = bolt.segments[i] as THREE.Vector3;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3),
      );

      const material = renderer.material.clone();
      material.opacity = opacity;

      const line = new THREE.Line(geometry, material);
      scene.add(line);
      renderer.mainLine = line;
    }

    // Render branches
    for (const branch of bolt.branches) {
      if (branch.length < 2) continue;

      const positions = new Float32Array(branch.length * 3);
      for (let i = 0; i < branch.length; i++) {
        const p = branch[i] as THREE.Vector3;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3),
      );

      const material = renderer.branchMaterial.clone();
      material.opacity = opacity * 0.7;

      const line = new THREE.Line(geometry, material);
      scene.add(line);
      renderer.branchLines.push(line);
    }
  }
}

/** Dispose of lightning renderer resources */
export function disposeLightningRenderer(
  renderer: LightningRenderer,
  scene: THREE.Scene,
): void {
  if (renderer.mainLine) {
    scene.remove(renderer.mainLine);
    renderer.mainLine.geometry.dispose();
  }
  for (const line of renderer.branchLines) {
    scene.remove(line);
    line.geometry.dispose();
  }
  renderer.geometry.dispose();
  renderer.material.dispose();
  renderer.branchMaterial.dispose();
  renderer.bolts.clear();
}
