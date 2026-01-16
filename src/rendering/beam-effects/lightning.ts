/**
 * Lightning Bolt Rendering - Procedural lightning effects using midpoint
 * displacement algorithm with dual-layer rendering (glow + core) for
 * convincing electrical arcs.
 */

import * as THREE from 'three';
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
import {
  acquireLine,
  disposeRenderedLine,
  type RenderedLine,
  releaseLine,
  updateRenderedLine,
} from './lightning-lines';

// Re-export setLightningResolution for external use
export { setLightningResolution } from './lightning-lines';

/** Lightning bolt visual state */
interface LightningBolt {
  segments: THREE.Vector3[]; // Main bolt path
  branches: THREE.Vector3[][]; // Secondary branch paths
  startTime: number;
  active: boolean;
  entityId: Entity; // For interpolation lookup
}

/** Lightning renderer state */
export interface LightningRenderer {
  bolts: Map<string, LightningBolt>;
  /** Currently visible main bolt lines */
  mainLines: RenderedLine[];
  /** Currently visible branch lines */
  branchLines: RenderedLine[];
  /** Pool of inactive main bolt lines (for reuse) */
  mainPool: RenderedLine[];
  /** Pool of inactive branch lines (for reuse) */
  branchPool: RenderedLine[];
  /** Scene reference for pool management */
  scene: THREE.Scene | null;
}

// Generation parameters
const BOLT_SUBDIVISIONS = 5;
const DISPLACEMENT_SCALE = 0.15;
const BRANCH_PROBABILITY = 0.25;
const BOLT_FADE_TIME = 0.05;
const OFF_TARGET_RANGE = 120;
const OFF_TARGET_CHAOS = 0.35;

// Reusable Set for tracking seen bolts (avoids per-frame allocation)
const seenBolts = new Set<string>();

// Reusable vector for endpoint (avoids allocation on pulse)
const reusableEndPoint = new THREE.Vector3();

/** Creates the lightning renderer */
export function createLightningRenderer(
  _scene: THREE.Scene,
): LightningRenderer {
  return {
    bolts: new Map(),
    mainLines: [],
    branchLines: [],
    mainPool: [],
    branchPool: [],
    scene: null,
  };
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

  // Clear reusable Set (avoids per-frame allocation)
  seenBolts.clear();

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
          : reusableEndPoint.copy(beam.hitPoint);

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
  // Store scene reference
  renderer.scene = scene;

  // Release all currently visible lines back to pool
  for (const line of renderer.mainLines) {
    releaseLine(renderer.mainPool, line);
  }
  renderer.mainLines.length = 0;

  for (const line of renderer.branchLines) {
    releaseLine(renderer.branchPool, line);
  }
  renderer.branchLines.length = 0;

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
      const line = acquireLine(renderer.mainPool, scene, true);
      updateRenderedLine(line, points, count, opacity, true);
      renderer.mainLines.push(line);
    }

    // Render branches with offset
    for (const branch of bolt.branches) {
      if (branch.length < 2) continue;

      const count = hasOffset
        ? applyOffset(branch, interpOffset)
        : branch.length;
      const points = hasOffset ? offsetPoints : branch;
      const line = acquireLine(renderer.branchPool, scene, false);
      updateRenderedLine(line, points, count, opacity, false);
      renderer.branchLines.push(line);
    }
  }
}

/**
 * Reset lightning renderer state (for replay seeking).
 * Hides all lines and returns them to pool, clears active bolts.
 */
export function resetLightningRenderer(
  renderer: LightningRenderer,
  _scene: THREE.Scene,
): void {
  // Release visible lines back to pool (don't dispose - keep for reuse)
  for (const line of renderer.mainLines) {
    releaseLine(renderer.mainPool, line);
  }
  renderer.mainLines.length = 0;

  for (const line of renderer.branchLines) {
    releaseLine(renderer.branchPool, line);
  }
  renderer.branchLines.length = 0;

  renderer.bolts.clear();
}

/** Dispose of lightning renderer resources (full cleanup) */
export function disposeLightningRenderer(
  renderer: LightningRenderer,
  scene: THREE.Scene,
): void {
  // Dispose visible lines
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

  // Dispose pooled lines
  for (const line of renderer.mainPool) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);
  }
  renderer.mainPool = [];

  for (const line of renderer.branchPool) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);
  }
  renderer.branchPool = [];

  renderer.bolts.clear();
  renderer.scene = null;
}
