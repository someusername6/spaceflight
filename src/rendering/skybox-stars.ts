/** Star geometry generation for skybox - matches bundle.js */
import * as THREE from 'three';
import { createMT } from '../core/mersenne-twister';

// Star generation constants
const STAR_COUNT = 100000;
const STAR_DISTANCE = 128.0;
const STAR_QUAD_SIZE = 0.05;
const STAR_BRIGHTNESS_POWER = 4.0; // Higher = more dim stars
const STAR_RNG_OFFSET = 5000;

/** Generate uniform random point on unit sphere */
function randomPointOnSphere(rng: { random: () => number }): [number, number, number] {
  const theta = rng.random() * Math.PI * 2;
  const z = 2 * rng.random() - 1;
  const r = Math.sqrt(1 - z * z);
  return [Math.cos(theta) * r, Math.sin(theta) * r, z];
}

/** Quaternion rotation from vector a to vector b, handles degenerate cases */
function quatRotBetweenVecs(a: [number, number, number], b: [number, number, number]): THREE.Quaternion {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const quat = new THREE.Quaternion();

  // Handle degenerate case: vectors are nearly opposite
  if (dot < -0.9999) {
    // Pick arbitrary perpendicular axis (use X or Y depending on which is less parallel)
    let ax = 0, ay = 1, az = 0;
    if (Math.abs(a[0]) < 0.9) {
      // Cross with X axis
      ax = 0; ay = -a[2]; az = a[1];
    } else {
      // Cross with Y axis
      ax = a[2]; ay = 0; az = -a[0];
    }
    const len = Math.sqrt(ax * ax + ay * ay + az * az);
    quat.setFromAxisAngle(new THREE.Vector3(ax / len, ay / len, az / len), Math.PI);
    return quat;
  }

  // Normal case: compute rotation via cross product
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  let ox = a[1] * b[2] - a[2] * b[1];
  let oy = a[2] * b[0] - a[0] * b[2];
  let oz = a[0] * b[1] - a[1] * b[0];
  const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
  if (len > 0.0001) { ox /= len; oy /= len; oz /= len; }
  quat.setFromAxisAngle(new THREE.Vector3(ox, oy, oz), theta);
  return quat;
}

/** Create star geometry - 100k billboard quads (matches bundle.js exactly) */
export function createStarGeometry(seed: string): THREE.BufferGeometry {
  const rng = createMT(seed, STAR_RNG_OFFSET);
  const positions = new Float32Array(STAR_COUNT * 6 * 3);
  const colors = new Float32Array(STAR_COUNT * 6 * 3);

  const baseVertices = [
    [-STAR_QUAD_SIZE, -STAR_QUAD_SIZE, 0], [STAR_QUAD_SIZE, -STAR_QUAD_SIZE, 0], [STAR_QUAD_SIZE, STAR_QUAD_SIZE, 0],
    [-STAR_QUAD_SIZE, -STAR_QUAD_SIZE, 0], [STAR_QUAD_SIZE, STAR_QUAD_SIZE, 0], [-STAR_QUAD_SIZE, STAR_QUAD_SIZE, 0],
  ] as const;

  // Reuse Vector3 to avoid 600k allocations
  const vert = new THREE.Vector3();

  for (let i = 0; i < STAR_COUNT; i++) {
    const pos = randomPointOnSphere(rng);
    const brightness = Math.pow(rng.random(), STAR_BRIGHTNESS_POWER);
    const rot = quatRotBetweenVecs([0, 0, -1], pos);
    const baseIdx = i * 6 * 3;

    for (let v = 0; v < 6; v++) {
      const bv = baseVertices[v]!;
      vert.set(bv[0], bv[1], bv[2]);
      vert.applyQuaternion(rot);
      vert.x += pos[0] * STAR_DISTANCE;
      vert.y += pos[1] * STAR_DISTANCE;
      vert.z += pos[2] * STAR_DISTANCE;

      positions[baseIdx + v * 3 + 0] = vert.x;
      positions[baseIdx + v * 3 + 1] = vert.y;
      positions[baseIdx + v * 3 + 2] = vert.z;
      colors[baseIdx + v * 3 + 0] = brightness;
      colors[baseIdx + v * 3 + 1] = brightness;
      colors[baseIdx + v * 3 + 2] = brightness;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
