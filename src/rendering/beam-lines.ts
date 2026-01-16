/**
 * Beam Line Rendering - Cross-platform beam lines using Line2.
 *
 * Uses Line2 from three.js examples for consistent line width across platforms
 * (standard THREE.Line linewidth only works on some platforms).
 */

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { getComponent } from '../core/ecs';
import type { ActiveBeam, Entity, World } from '../core/types';
import { getInterpolatedPosition } from './renderer';

/** Beam fade-out duration in seconds */
const BEAM_FADE_DURATION = 0.15;

/** Base line width in pixels */
const BASE_LINE_WIDTH = 3;

/** Entry for a single beam line */
export interface BeamLineEntry {
  line: Line2;
  material: LineMaterial;
  geometry: LineGeometry;
  entityId: Entity;
}

/** Resolution for LineMaterial (set by renderer on init and resize) */
const resolution = new THREE.Vector2(1, 1);

/** Update resolution for all beam materials */
export function setBeamResolution(width: number, height: number): void {
  resolution.set(width, height);
}

/** Create a beam line entry */
export function createBeamLine(
  scene: THREE.Scene,
  entityId: Entity,
  color: THREE.Color,
  beamWidth: number,
): BeamLineEntry {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 1]); // Initial dummy positions

  const material = new LineMaterial({
    color: color.getHex(),
    linewidth: BASE_LINE_WIDTH * beamWidth,
    opacity: 1.0,
    transparent: true,
    resolution,
  });

  const line = new Line2(geometry, material);
  scene.add(line);

  return { line, material, geometry, entityId };
}

/** Update beam line positions and appearance */
export function updateBeamLine(
  entry: BeamLineEntry,
  beam: ActiveBeam,
  gameTime: number,
): void {
  // Caller guarantees hitPoint exists, but guard anyway
  if (!beam.hitPoint) return;

  // Update geometry positions
  entry.geometry.setPositions([
    beam.origin.x,
    beam.origin.y,
    beam.origin.z,
    beam.hitPoint.x,
    beam.hitPoint.y,
    beam.hitPoint.z,
  ]);

  // Calculate fade opacity
  let opacity = 1.0;
  if (beam.fadeStartTime !== null) {
    const fadeAge = gameTime - beam.fadeStartTime;
    const fadeProgress = fadeAge / BEAM_FADE_DURATION;
    opacity = 1 - fadeProgress;
  }

  // Update material
  entry.material.color.setHex(beam.color.getHex());
  entry.material.opacity = opacity;
  entry.material.linewidth = BASE_LINE_WIDTH * (beam.beamWidth ?? 1);
  entry.material.resolution = resolution;
  entry.line.visible = true;
}

/** Update beam line with interpolated positions */
function updateBeamLineInterpolated(
  entry: BeamLineEntry,
  origin: THREE.Vector3,
  hitPoint: THREE.Vector3,
  beam: ActiveBeam,
  gameTime: number,
): void {
  // Update geometry positions with interpolated values
  entry.geometry.setPositions([
    origin.x,
    origin.y,
    origin.z,
    hitPoint.x,
    hitPoint.y,
    hitPoint.z,
  ]);

  // Calculate fade opacity
  let opacity = 1.0;
  if (beam.fadeStartTime !== null) {
    const fadeAge = gameTime - beam.fadeStartTime;
    const fadeProgress = fadeAge / BEAM_FADE_DURATION;
    opacity = 1 - fadeProgress;
  }

  // Update material
  entry.material.color.setHex(beam.color.getHex());
  entry.material.opacity = opacity;
  entry.material.linewidth = BASE_LINE_WIDTH * (beam.beamWidth ?? 1);
  entry.material.resolution = resolution;
  entry.line.visible = true;
}

/** Dispose of a beam line entry */
export function disposeBeamLine(
  scene: THREE.Scene,
  entry: BeamLineEntry,
): void {
  scene.remove(entry.line);
  entry.material.dispose();
  entry.geometry.dispose();
}

// Reusable set for tracking seen beams
const seenBeams = new Set<string>();
// Reusable vectors for interpolation
const interpOrigin = new THREE.Vector3();
const interpHitPoint = new THREE.Vector3();

/** Update all beam lines from world state with interpolation */
export function updateAllBeamLines(
  world: World,
  scene: THREE.Scene,
  beamLines: Map<string, BeamLineEntry>,
  gameTime: number,
): void {
  const activeBeams = world.systemState.beams.activeBeams;
  seenBeams.clear();

  // Process all beams (active and fading)
  for (const [entity, beams] of activeBeams) {
    // Get entity's current and interpolated positions for offset calculation
    const transform = getComponent(world, entity, 'transform');
    const interpEntityPos = getInterpolatedPosition(entity);
    const entityPos = transform?.position;

    for (const beam of beams) {
      // Skip beams with no hitPoint (not yet fired)
      if (!beam.hitPoint) continue;

      // Skip weapons with dedicated renderers
      if (beam.weaponName === 'Nuclear Lance') continue;
      if (beam.weaponName === 'Lightning') continue;

      // Skip fully faded beams
      if (beam.fadeStartTime !== null) {
        const fadeAge = gameTime - beam.fadeStartTime;
        if (fadeAge >= BEAM_FADE_DURATION) continue;
      }

      const key = `${entity}-${beam.weaponIndex}`;
      seenBeams.add(key);

      let entry = beamLines.get(key);
      if (!entry) {
        entry = createBeamLine(scene, entity, beam.color, beam.beamWidth ?? 1);
        beamLines.set(key, entry);
      }

      // Interpolate beam positions if entity interpolation is available
      if (interpEntityPos && entityPos) {
        // Calculate offset: interpOrigin = beam.origin + (interpEntityPos - entityPos)
        interpOrigin.copy(beam.origin).add(interpEntityPos).sub(entityPos);
        // Keep hitPoint direction consistent - move it by the same offset
        interpHitPoint.copy(beam.hitPoint).add(interpEntityPos).sub(entityPos);
        updateBeamLineInterpolated(
          entry,
          interpOrigin,
          interpHitPoint,
          beam,
          gameTime,
        );
      } else {
        updateBeamLine(entry, beam, gameTime);
      }
    }
  }

  // Clean up beam lines for destroyed entities or fully faded beams
  for (const [key, entry] of beamLines) {
    if (!seenBeams.has(key)) {
      disposeBeamLine(scene, entry);
      beamLines.delete(key);
    }
  }
}
