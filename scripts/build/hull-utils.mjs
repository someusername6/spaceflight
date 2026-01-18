/**
 * Convex hull computation utilities for mesh bundling.
 * Computes hull planes, volume, and bounding radius.
 *
 * For non-convex meshes (like rings with holes), uses CoACD via Python
 * for proper convex decomposition.
 */

import convexHull from 'incremental-convex-hull';

// Re-export CoACD decomposition from separate module
export { decomposeWithCoACD } from './coacd-decompose.mjs';

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

  // Compute centroid for normal direction validation
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const p of originalPoints) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  cx /= originalPoints.length;
  cy /= originalPoints.length;
  cz /= originalPoints.length;

  // Convert faces to planes using ORIGINAL points (not jittered)
  const planes = [];
  for (const face of faces) {
    const p0 = originalPoints[face[0]];
    const p1 = originalPoints[face[1]];
    const p2 = originalPoints[face[2]];

    // Compute face normal (cross product of edges)
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];

    // Normalize
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-10) continue; // Degenerate face

    nx /= len;
    ny /= len;
    nz /= len;

    // Ensure normal points outward (away from centroid)
    // Vector from centroid to face center
    const faceCenterX = (p0[0] + p1[0] + p2[0]) / 3;
    const faceCenterY = (p0[1] + p1[1] + p2[1]) / 3;
    const faceCenterZ = (p0[2] + p1[2] + p2[2]) / 3;
    const toCenterX = faceCenterX - cx;
    const toCenterY = faceCenterY - cy;
    const toCenterZ = faceCenterZ - cz;

    // If normal points toward centroid, flip it
    const dot = nx * toCenterX + ny * toCenterY + nz * toCenterZ;
    if (dot < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    const normal = [nx, ny, nz];

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

/**
 * Union-Find data structure for grouping triangles by connectivity.
 */
class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }
}

/**
 * Hash a vertex position for deduplication.
 * Uses fixed precision to handle floating point tolerance.
 */
function hashVertex(x, y, z) {
  const precision = 1e-6;
  const rx = Math.round(x / precision);
  const ry = Math.round(y / precision);
  const rz = Math.round(z / precision);
  return `${rx},${ry},${rz}`;
}

/**
 * Decompose a mesh into connected components.
 *
 * Uses Union-Find to group triangles that share vertices.
 * Each component is returned as a separate set of positions/indices.
 *
 * @param indices - Triangle indices (triplets)
 * @param positions - Flat array of vertex positions [x,y,z,x,y,z,...]
 * @returns Array of components, each with positions and indices
 */
export function decomposeIntoConnectedComponents(indices, positions) {
  if (!indices || indices.length === 0) {
    return [{ positions: Array.from(positions), indices: null }];
  }

  const numTriangles = indices.length / 3;
  const numVertices = positions.length / 3;

  // Build vertex position to canonical index mapping
  // This handles duplicate vertices at the same position
  const vertexToCanonical = new Map();
  const canonicalIndices = [];

  for (let i = 0; i < numVertices; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const hash = hashVertex(x, y, z);

    if (!vertexToCanonical.has(hash)) {
      vertexToCanonical.set(hash, i);
    }
    canonicalIndices.push(vertexToCanonical.get(hash));
  }

  // Union-Find over triangles
  const uf = new UnionFind(numTriangles);

  // Build edge-to-triangle mapping
  const edgeToTriangle = new Map();

  function edgeKey(a, b) {
    const ca = canonicalIndices[a];
    const cb = canonicalIndices[b];
    return ca < cb ? `${ca}-${cb}` : `${cb}-${ca}`;
  }

  for (let t = 0; t < numTriangles; t++) {
    const i0 = indices[t * 3];
    const i1 = indices[t * 3 + 1];
    const i2 = indices[t * 3 + 2];

    const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];

    for (const edge of edges) {
      if (edgeToTriangle.has(edge)) {
        const otherTriangle = edgeToTriangle.get(edge);
        uf.union(t, otherTriangle);
      } else {
        edgeToTriangle.set(edge, t);
      }
    }
  }

  // Group triangles by component
  const componentMap = new Map();
  for (let t = 0; t < numTriangles; t++) {
    const root = uf.find(t);
    if (!componentMap.has(root)) {
      componentMap.set(root, []);
    }
    componentMap.get(root).push(t);
  }

  // Build output components
  const components = [];
  for (const triangles of componentMap.values()) {
    // Collect unique vertices used by this component
    const vertexSet = new Set();
    for (const t of triangles) {
      vertexSet.add(indices[t * 3]);
      vertexSet.add(indices[t * 3 + 1]);
      vertexSet.add(indices[t * 3 + 2]);
    }

    // Create new vertex array and index mapping
    const oldToNew = new Map();
    const newPositions = [];
    let newIndex = 0;

    for (const oldIdx of vertexSet) {
      oldToNew.set(oldIdx, newIndex++);
      newPositions.push(
        positions[oldIdx * 3],
        positions[oldIdx * 3 + 1],
        positions[oldIdx * 3 + 2],
      );
    }

    // Remap indices
    const newIndices = [];
    for (const t of triangles) {
      newIndices.push(
        oldToNew.get(indices[t * 3]),
        oldToNew.get(indices[t * 3 + 1]),
        oldToNew.get(indices[t * 3 + 2]),
      );
    }

    components.push({
      positions: newPositions,
      indices: newIndices,
    });
  }

  return components;
}
