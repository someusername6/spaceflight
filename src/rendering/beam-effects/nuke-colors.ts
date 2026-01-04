/**
 * Nuke explosion color progression.
 */

import * as THREE from 'three';

// Nuke color progression: white → yellow → orange → red
const NUKE_COLORS = [
  new THREE.Color(1, 1, 1), // White (0%)
  new THREE.Color(1, 1, 0.5), // Yellow-white (25%)
  new THREE.Color(1, 0.7, 0.2), // Orange-yellow (50%)
  new THREE.Color(1, 0.3, 0.1), // Orange-red (75%)
  new THREE.Color(0.5, 0.1, 0.05), // Dark red (100%)
];

/** Interpolate nuke color based on progress */
export function getNukeColor(progress: number): THREE.Color {
  const t = Math.min(1, Math.max(0, progress));
  const segment = t * (NUKE_COLORS.length - 1);
  const index = Math.floor(segment);
  const frac = segment - index;

  if (index >= NUKE_COLORS.length - 1) {
    return NUKE_COLORS[NUKE_COLORS.length - 1] as THREE.Color;
  }

  const c1 = NUKE_COLORS[index] as THREE.Color;
  const c2 = NUKE_COLORS[index + 1] as THREE.Color;
  return new THREE.Color().lerpColors(c1, c2, frac);
}
