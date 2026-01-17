/**
 * Convex hull computation utilities for mesh bundling.
 * Computes hull planes, volume, and bounding radius.
 */

import convexHull from 'incremental-convex-hull';

/**
 * Simple seeded PRNG (mulberry32) for deterministic jitter.
 * Using a fixed seed ensures hull generation is reproducible,
 * which matters for replay compatibility - regenerating geometries
 * won't change hull plane order or values.
 */
function createSeededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute convex hull from mesh vertices.
 * Returns hull as array of face planes (normal + distance from origin).
 *
 * @param positions - Flat array of vertex positions [x,y,z,x,y,z,...]
 * @param seed - Seed for deterministic jitter (use mesh index or hash of name)
 */
export function computeConvexHull(positions, seed = 12345) {
  // Convert flat array to array of [x, y, z] points
  const originalPoints = [];
  for (let i = 0; i < positions.length; i += 3) {
    originalPoints.push([positions[i], positions[i + 1], positions[i + 2]]);
  }

  if (originalPoints.length < 4) {
    return null; // Need at least 4 points for a 3D hull
  }

  // Add tiny perturbation to avoid degenerate cases (coplanar points)
  // Use seeded PRNG for deterministic results across rebuilds
  const random = createSeededRandom(seed);
  const jitter = 1e-8;
  const jitteredPoints = originalPoints.map((p) => [
    p[0] + (random() - 0.5) * jitter,
    p[1] + (random() - 0.5) * jitter,
    p[2] + (random() - 0.5) * jitter,
  ]);

  // Compute convex hull - returns array of face indices (triangles)
  let faces;
  try {
    faces = convexHull(jitteredPoints, true); // true = random insertion order
  } catch (e) {
    console.warn(`    Convex hull failed: ${e.message}`);
    return null;
  }

  // Convert faces to planes using ORIGINAL points (not jittered)
  const planes = [];
  for (const face of faces) {
    const p0 = originalPoints[face[0]];
    const p1 = originalPoints[face[1]];
    const p2 = originalPoints[face[2]];

    // Compute face normal (cross product of edges)
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];

    // Normalize
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-10) continue; // Degenerate face

    const normal = [nx / len, ny / len, nz / len];

    // Distance from origin (dot product of normal with any point on face)
    const distance = normal[0] * p0[0] + normal[1] * p0[1] + normal[2] * p0[2];

    planes.push({ normal, distance });
  }

  return { planes, faces, points: originalPoints };
}

/**
 * Compute volume of convex hull using the divergence theorem.
 * Sum of signed tetrahedron volumes from origin to each face.
 */
export function computeHullVolume(hull) {
  if (!hull) return 0;

  const { faces, points } = hull;
  let volume = 0;

  for (const face of faces) {
    const p0 = points[face[0]];
    const p1 = points[face[1]];
    const p2 = points[face[2]];

    // Signed volume of tetrahedron from origin to this face
    // V = (1/6) * |a · (b × c)|
    const v =
      (p0[0] * (p1[1] * p2[2] - p1[2] * p2[1]) +
        p0[1] * (p1[2] * p2[0] - p1[0] * p2[2]) +
        p0[2] * (p1[0] * p2[1] - p1[1] * p2[0])) /
      6;

    volume += v;
  }

  return Math.abs(volume);
}

/**
 * Compute bounding radius of hull (max distance from origin to any vertex).
 */
export function computeBoundingRadius(hull) {
  if (!hull) return 0;

  let maxDistSq = 0;
  for (const p of hull.points) {
    const distSq = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    if (distSq > maxDistSq) maxDistSq = distSq;
  }

  return Math.sqrt(maxDistSq);
}
