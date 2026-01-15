/**
 * Lightning Bolt Rendering - Procedural lightning effects using midpoint
 * displacement algorithm with dual-layer rendering (glow + core) for
 * convincing electrical arcs.
 */

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { Transform } from '../../components/transform';
import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { TICK_SEC } from '../../game';
import { getInterpolatedPosition } from '../renderer';
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
  entityId: Entity; // For interpolation lookup
}

/** Rendered line pair (glow + core) */
interface RenderedLine {
  glow: Line2;
  core: Line2;
  glowGeometry: LineGeometry;
  coreGeometry: LineGeometry;
}

/** Lightning renderer state */
export interface LightningRenderer {
  bolts: Map<string, LightningBolt>;
  mainLines: RenderedLine[];
  branchLines: RenderedLine[];
}

// Module-level resolution (set by renderer on init and resize)
const resolution = new THREE.Vector2(1, 1);

/** Update resolution for lightning line materials */
export function setLightningResolution(width: number, height: number): void {
  resolution.set(width, height);
}

// Colors
const GLOW_COLOR = 0x6688ff; // Blue-white glow
const CORE_COLOR = 0xffffff; // Bright white core
const BRANCH_GLOW_COLOR = 0x5577dd; // Slightly dimmer blue for branches

// Line widths (in pixels)
const MAIN_GLOW_WIDTH = 8;
const MAIN_CORE_WIDTH = 2.5;
const BRANCH_GLOW_WIDTH = 5;
const BRANCH_CORE_WIDTH = 1.5;

// Opacity
const GLOW_OPACITY = 0.35;
const CORE_OPACITY = 1.0;
const BRANCH_OPACITY_SCALE = 0.7; // Branches are dimmer

// Generation parameters
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
  return {
    bolts: new Map(),
    mainLines: [],
    branchLines: [],
  };
}

/** Create a dual-layer line (glow + core) from points */
function createDualLayerLine(
  points: THREE.Vector3[],
  count: number,
  isMainBolt: boolean,
  opacity: number,
): RenderedLine {
  // Convert points to flat array for LineGeometry
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const p = points[i] as THREE.Vector3;
    positions.push(p.x, p.y, p.z);
  }

  // Glow layer (wide, dim, additive)
  const glowGeometry = new LineGeometry();
  glowGeometry.setPositions(positions);

  const glowMaterial = new LineMaterial({
    color: isMainBolt ? GLOW_COLOR : BRANCH_GLOW_COLOR,
    linewidth: isMainBolt ? MAIN_GLOW_WIDTH : BRANCH_GLOW_WIDTH,
    opacity: GLOW_OPACITY * opacity * (isMainBolt ? 1.0 : BRANCH_OPACITY_SCALE),
    transparent: true,
    resolution,
    depthWrite: false,
  });
  glowMaterial.blending = THREE.AdditiveBlending;

  const glow = new Line2(glowGeometry, glowMaterial);

  // Core layer (thin, bright, additive)
  const coreGeometry = new LineGeometry();
  coreGeometry.setPositions(positions);

  const coreMaterial = new LineMaterial({
    color: CORE_COLOR,
    linewidth: isMainBolt ? MAIN_CORE_WIDTH : BRANCH_CORE_WIDTH,
    opacity: CORE_OPACITY * opacity * (isMainBolt ? 1.0 : BRANCH_OPACITY_SCALE),
    transparent: true,
    resolution,
    depthWrite: false,
  });
  coreMaterial.blending = THREE.AdditiveBlending;

  const core = new Line2(coreGeometry, coreMaterial);

  return { glow, core, glowGeometry, coreGeometry };
}

/** Dispose of a rendered line pair */
function disposeRenderedLine(line: RenderedLine): void {
  line.glowGeometry.dispose();
  line.coreGeometry.dispose();
  (line.glow.material as LineMaterial).dispose();
  (line.core.material as LineMaterial).dispose();
}

/** Update lightning rendering */
export function updateLightningRenderer(
  renderer: LightningRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
): void {
  // Calculate interpolated gameTime for smooth animation
  const gameTime = world.systemState.gameTime - TICK_SEC * (1 - alpha);
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
        const isOffTarget = distance < OFF_TARGET_RANGE * 0.9;

        // Generate new bolt path
        const displacementScale = isOffTarget
          ? OFF_TARGET_CHAOS
          : DISPLACEMENT_SCALE;
        const endPoint = isOffTarget
          ? generateOffTargetEnd(
              beam.origin,
              beam.direction,
              OFF_TARGET_RANGE,
              world.renderPrng,
            )
          : beam.hitPoint.clone();

        const segments = generateBoltPath(
          beam.origin,
          endPoint,
          BOLT_SUBDIVISIONS,
          displacementScale,
          world.renderPrng,
        );

        const branches = isOffTarget
          ? []
          : generateBranches(
              segments,
              BRANCH_PROBABILITY,
              DISPLACEMENT_SCALE,
              world.renderPrng,
            );

        bolt = {
          segments,
          branches,
          startTime: gameTime,
          active: true,
          entityId: entity,
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

  // Render all active bolts with interpolation
  renderBolts(renderer, scene, world, gameTime);
}

// Reusable vector for interpolation offset
const interpOffset = new THREE.Vector3();
// Reusable array for offset points
const offsetPoints: THREE.Vector3[] = [];

/** Apply interpolation offset to points, returns count of points written */
function applyOffset(points: THREE.Vector3[], offset: THREE.Vector3): number {
  const count = points.length;
  // Reuse or expand array
  while (offsetPoints.length < count) {
    offsetPoints.push(new THREE.Vector3());
  }
  for (let i = 0; i < count; i++) {
    (offsetPoints[i] as THREE.Vector3)
      .copy(points[i] as THREE.Vector3)
      .add(offset);
  }
  return count;
}

/** Render all active lightning bolts with interpolation */
function renderBolts(
  renderer: LightningRenderer,
  scene: THREE.Scene,
  world: World,
  gameTime: number,
): void {
  // Remove existing lines from scene and dispose
  for (const line of renderer.mainLines) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);
  }
  renderer.mainLines = [];

  for (const line of renderer.branchLines) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);
  }
  renderer.branchLines = [];

  // Render all active bolts
  for (const bolt of renderer.bolts.values()) {
    if (!bolt.active) continue;

    // Calculate interpolation offset
    const interpEntityPos = getInterpolatedPosition(bolt.entityId);
    const transform = getComponent<Transform>(
      world,
      bolt.entityId,
      'transform',
    );
    const hasOffset = interpEntityPos && transform;
    if (hasOffset) {
      interpOffset.copy(interpEntityPos).sub(transform.position);
    } else {
      interpOffset.set(0, 0, 0);
    }

    // Calculate opacity based on age
    const age = gameTime - bolt.startTime;
    const opacity = Math.max(0, 1 - age / BOLT_FADE_TIME);

    // Render main bolt with offset
    if (bolt.segments.length > 1) {
      const count = hasOffset
        ? applyOffset(bolt.segments, interpOffset)
        : bolt.segments.length;
      const points = hasOffset ? offsetPoints : bolt.segments;
      const line = createDualLayerLine(points, count, true, opacity);
      scene.add(line.glow);
      scene.add(line.core);
      renderer.mainLines.push(line);
    }

    // Render branches with offset
    for (const branch of bolt.branches) {
      if (branch.length < 2) continue;

      const count = hasOffset
        ? applyOffset(branch, interpOffset)
        : branch.length;
      const points = hasOffset ? offsetPoints : branch;
      const line = createDualLayerLine(points, count, false, opacity);
      scene.add(line.glow);
      scene.add(line.core);
      renderer.branchLines.push(line);
    }
  }
}

/**
 * Reset lightning renderer state (for replay seeking).
 * Removes all active bolts and lines.
 */
export function resetLightningRenderer(
  renderer: LightningRenderer,
  scene: THREE.Scene,
): void {
  for (const line of renderer.mainLines) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);
  }
  renderer.mainLines = [];

  for (const line of renderer.branchLines) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);
  }
  renderer.branchLines = [];

  renderer.bolts.clear();
}

/** Dispose of lightning renderer resources */
export function disposeLightningRenderer(
  renderer: LightningRenderer,
  scene: THREE.Scene,
): void {
  resetLightningRenderer(renderer, scene);
}
