/**
 * Lightning Bolt Generation - Procedural bolt path generation using
 * midpoint displacement algorithm with branch generation.
 */

import * as THREE from 'three';

// Reusable vectors for calculations
const tempVec = new THREE.Vector3();
const perpendicular = new THREE.Vector3();
const midpoint = new THREE.Vector3();

// Generation parameters
const BRANCH_LENGTH_SCALE = 0.4;
const BRANCH_SUBDIVISIONS = 3;

/**
 * Generate a lightning bolt path using midpoint displacement.
 * @param start - Start point of the bolt
 * @param end - End point of the bolt
 * @param subdivisions - Number of recursive subdivisions
 * @param displacementScale - How much to displace (fraction of segment length)
 * @returns Array of points forming the bolt path
 */
export function generateBoltPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  subdivisions: number,
  displacementScale: number,
): THREE.Vector3[] {
  // Start with just the endpoints
  let points: THREE.Vector3[] = [start.clone(), end.clone()];

  // Recursively subdivide
  for (let level = 0; level < subdivisions; level++) {
    const newPoints: THREE.Vector3[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i] as THREE.Vector3;
      const p2 = points[i + 1] as THREE.Vector3;

      // Add first point
      newPoints.push(p1);

      // Calculate midpoint
      midpoint.copy(p1).add(p2).multiplyScalar(0.5);

      // Calculate perpendicular direction (use cross with arbitrary axis)
      tempVec.copy(p2).sub(p1);
      const segmentLength = tempVec.length();

      // Find a perpendicular vector
      if (Math.abs(tempVec.x) < 0.9) {
        perpendicular.set(1, 0, 0);
      } else {
        perpendicular.set(0, 1, 0);
      }
      perpendicular.cross(tempVec).normalize();

      // Apply random displacement
      const displacement =
        (Math.random() - 0.5) * segmentLength * displacementScale;
      midpoint.addScaledVector(perpendicular, displacement);

      // Also add some displacement in another perpendicular direction
      const perp2 = tempVec.clone().cross(perpendicular).normalize();
      const displacement2 =
        (Math.random() - 0.5) * segmentLength * displacementScale;
      midpoint.addScaledVector(perp2, displacement2);

      newPoints.push(midpoint.clone());
    }

    // Add last point
    newPoints.push(points[points.length - 1] as THREE.Vector3);
    points = newPoints;
  }

  return points;
}

/**
 * Generate branches from a main bolt path.
 * @param mainPath - The main bolt path
 * @param branchProbability - Probability of branch at each segment
 * @param displacementScale - Displacement scale for branch generation
 * @returns Array of branch paths
 */
export function generateBranches(
  mainPath: THREE.Vector3[],
  branchProbability: number,
  displacementScale: number,
): THREE.Vector3[][] {
  const branches: THREE.Vector3[][] = [];

  // Skip first and last few points (no branches at very start/end)
  const startIdx = Math.floor(mainPath.length * 0.2);
  const endIdx = Math.floor(mainPath.length * 0.8);

  for (let i = startIdx; i < endIdx; i++) {
    if (Math.random() > branchProbability) continue;

    const branchStart = mainPath[i] as THREE.Vector3;
    const mainEnd = mainPath[mainPath.length - 1] as THREE.Vector3;

    // Branch direction: mostly perpendicular to main path with slight forward bias
    const toEnd = tempVec.copy(mainEnd).sub(branchStart);
    const remainingDist = toEnd.length();

    // Random perpendicular direction
    if (Math.abs(toEnd.x) < 0.9) {
      perpendicular.set(1, 0, 0);
    } else {
      perpendicular.set(0, 1, 0);
    }
    perpendicular.cross(toEnd).normalize();

    // Rotate perpendicular randomly
    const angle = Math.random() * Math.PI * 2;
    const perp2 = toEnd.clone().normalize();
    perpendicular.applyAxisAngle(perp2, angle);

    // Branch end point: perpendicular with slight forward bias
    const branchLength =
      remainingDist * BRANCH_LENGTH_SCALE * (0.5 + Math.random() * 0.5);
    const branchEnd = branchStart
      .clone()
      .addScaledVector(perpendicular, branchLength * 0.8)
      .addScaledVector(toEnd.normalize(), branchLength * 0.3);

    // Generate branch path with fewer subdivisions
    const branchPath = generateBoltPath(
      branchStart,
      branchEnd,
      BRANCH_SUBDIVISIONS,
      displacementScale * 1.2,
    );

    branches.push(branchPath);
  }

  return branches;
}

/**
 * Generate an off-target end point (Tesla arc into nothingness).
 * @param origin - Starting point
 * @param direction - Forward direction
 * @param range - Maximum range for the arc
 * @returns End point for the arc
 */
export function generateOffTargetEnd(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  range: number,
): THREE.Vector3 {
  // Start with direction but add random deviation
  const end = origin.clone();
  const deviated = direction.clone();

  // Add random angular deviation (up to 30 degrees)
  const deviationAngle = ((Math.random() - 0.5) * Math.PI) / 3;
  const deviationAngle2 = ((Math.random() - 0.5) * Math.PI) / 3;

  // Find perpendicular axes
  if (Math.abs(deviated.x) < 0.9) {
    perpendicular.set(1, 0, 0);
  } else {
    perpendicular.set(0, 1, 0);
  }
  const perp1 = perpendicular.clone().cross(deviated).normalize();
  const perp2a = deviated.clone().cross(perp1).normalize();

  deviated.applyAxisAngle(perp1, deviationAngle);
  deviated.applyAxisAngle(perp2a, deviationAngle2);

  // Random length (shorter than max range)
  const length = range * (0.4 + Math.random() * 0.4);
  end.addScaledVector(deviated, length);

  return end;
}
