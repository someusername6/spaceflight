/** Star geometry generation for skybox - matches bundle.js */
import * as THREE from 'three';
import { createMT } from '../core/mersenne-twister';

const NSTARS = 100000;
const STAR_DIST = 128.0;
const STAR_SIZE = 0.05;

function randomPointOnSphere(rng: { random: () => number }): [number, number, number] {
  const theta = rng.random() * Math.PI * 2;
  const z = 2 * rng.random() - 1;
  const r = Math.sqrt(1 - z * z);
  return [Math.cos(theta) * r, Math.sin(theta) * r, z];
}

function quatRotBetweenVecs(a: [number, number, number], b: [number, number, number]): THREE.Quaternion {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  let ox = a[1] * b[2] - a[2] * b[1];
  let oy = a[2] * b[0] - a[0] * b[2];
  let oz = a[0] * b[1] - a[1] * b[0];
  const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
  if (len > 0.0001) { ox /= len; oy /= len; oz /= len; }
  const quat = new THREE.Quaternion();
  quat.setFromAxisAngle(new THREE.Vector3(ox, oy, oz), theta);
  return quat;
}

/** Create star geometry - 100k billboard quads (matches bundle.js exactly) */
export function createStarGeometry(seed: string): THREE.BufferGeometry {
  const rng = createMT(seed, 5000);
  const positions = new Float32Array(NSTARS * 6 * 3);
  const colors = new Float32Array(NSTARS * 6 * 3);
  const baseVertices = [
    [-STAR_SIZE, -STAR_SIZE, 0], [STAR_SIZE, -STAR_SIZE, 0], [STAR_SIZE, STAR_SIZE, 0],
    [-STAR_SIZE, -STAR_SIZE, 0], [STAR_SIZE, STAR_SIZE, 0], [-STAR_SIZE, STAR_SIZE, 0],
  ] as const;

  for (let i = 0; i < NSTARS; i++) {
    const pos = randomPointOnSphere(rng);
    const c = Math.pow(rng.random(), 4.0);
    const rot = quatRotBetweenVecs([0, 0, -1], pos);
    const baseIdx = i * 6 * 3;
    for (let v = 0; v < 6; v++) {
      const bv = baseVertices[v]!;
      const vert = new THREE.Vector3(bv[0], bv[1], bv[2]);
      vert.applyQuaternion(rot);
      vert.x += pos[0] * STAR_DIST;
      vert.y += pos[1] * STAR_DIST;
      vert.z += pos[2] * STAR_DIST;
      positions[baseIdx + v * 3 + 0] = vert.x;
      positions[baseIdx + v * 3 + 1] = vert.y;
      positions[baseIdx + v * 3 + 2] = vert.z;
      colors[baseIdx + v * 3 + 0] = c;
      colors[baseIdx + v * 3 + 1] = c;
      colors[baseIdx + v * 3 + 2] = c;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
