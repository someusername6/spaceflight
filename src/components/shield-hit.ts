/**
 * Shield Hit component - tracks recent shield damage for visual effects.
 *
 * When shields absorb damage, this records the hit for the renderer
 * to display a brief flash/ripple effect.
 */

import type { Vector3 } from 'three';
import type { ComponentBase } from '../core/types';

/** A single shield hit event */
export interface ShieldHitEvent {
  position: Vector3; // World position of hit
  intensity: number; // 0-1 based on damage relative to shield max
  time: number; // Game time when hit occurred
}

/** Maximum number of hits to track (ring buffer) */
const MAX_HITS = 4;

/** How long hits remain visible (seconds) */
export const SHIELD_HIT_DURATION = 0.3;

/** Shield hit tracking component */
export interface ShieldHit extends ComponentBase {
  readonly type: 'shieldHit';
  hits: ShieldHitEvent[];
  writeIndex: number;
}

/** Creates a ShieldHit component */
export function createShieldHit(): ShieldHit {
  return {
    type: 'shieldHit',
    hits: [],
    writeIndex: 0,
  };
}

/** Records a shield hit event */
export function recordShieldHit(
  component: ShieldHit,
  position: Vector3,
  damageAbsorbed: number,
  shieldMax: number,
  gameTime: number,
): void {
  const intensity = Math.min(1, damageAbsorbed / (shieldMax * 0.25));

  // Expand array if needed, otherwise overwrite oldest
  if (component.hits.length < MAX_HITS) {
    component.hits.push({
      position: position.clone(),
      intensity,
      time: gameTime,
    });
  } else {
    const hit = component.hits[component.writeIndex] as ShieldHitEvent;
    hit.position.copy(position);
    hit.intensity = intensity;
    hit.time = gameTime;
    component.writeIndex = (component.writeIndex + 1) % MAX_HITS;
  }
}

/** Gets active (visible) shield hits */
export function getActiveHits(
  component: ShieldHit,
  gameTime: number,
): ShieldHitEvent[] {
  return component.hits.filter(
    (hit) => gameTime - hit.time < SHIELD_HIT_DURATION,
  );
}
