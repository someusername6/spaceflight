/**
 * Mesh Factory - Creates Three.js meshes for different entity types.
 */

import * as THREE from 'three';
import { Faction } from '../components/faction';
import type { MissileType } from '../components/missile';
import type { StructureType } from '../components/structure';
import type { StationType } from '../data/stations';
import { SHIP_MODEL_SCALE } from './constants';
import { SHIP_GEOMETRIES, type ShipClass } from './ship-geometries';

/** Cached BufferGeometry instances built on demand from embedded data */
const shipGeometries = new Map<ShipClass, THREE.BufferGeometry>();

/** Check if a string is a valid ship class */
function isShipClass(name: string): name is ShipClass {
  return name in SHIP_GEOMETRIES;
}

/**
 * Get or create geometry for a ship class.
 * Geometries are built lazily on first use and cached.
 */
function getShipGeometry(shipClass: ShipClass): THREE.BufferGeometry {
  const cached = shipGeometries.get(shipClass);
  if (cached) return cached;

  const data = SHIP_GEOMETRIES[shipClass];
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(data.positions, 3),
  );

  if (data.normals) {
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(data.normals, 3),
    );
  }

  if (data.indices) {
    const vertexCount = data.positions.length / 3;
    const IndexBuffer =
      vertexCount > 65535
        ? THREE.Uint32BufferAttribute
        : THREE.Uint16BufferAttribute;
    geometry.setIndex(new IndexBuffer(data.indices, 1));
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  shipGeometries.set(shipClass, geometry);

  return geometry;
}

/** Colors for factions: Green=Player, Red=Enemy, Yellow=Neutral */
export const FACTION_COLORS = {
  [Faction.Player]: 0x00ff00,
  [Faction.Enemy]: 0xff0000,
  [Faction.Neutral]: 0xffff00,
};

/** Missile visual configs per type */
const MISSILE_VISUALS: Record<
  MissileType,
  { radius: number; length: number; color: number; emissive?: number }
> = {
  rocket: { radius: 0.6, length: 2.5, color: 0xff4400 },
  starburst: { radius: 0.6, length: 2.5, color: 0xffcc00, emissive: 0xffaa00 },
  seeker: { radius: 0.4, length: 3.0, color: 0x00ffcc },
  dart: { radius: 0.25, length: 3.5, color: 0xaaddff, emissive: 0x4488ff },
  cluster: { radius: 0.35, length: 2.0, color: 0xffaa00 },
  swarm: { radius: 0.2, length: 1.5, color: 0xff8800, emissive: 0xff4400 },
  torpedo: { radius: 0.7, length: 4.0, color: 0x6688aa },
  nuke: { radius: 0.9, length: 5.0, color: 0xff2200, emissive: 0xff0000 },
};

/**
 * Creates a ship mesh.
 * Uses embedded geometry if available, otherwise falls back to cone.
 * @param faction - Ship faction for coloring
 * @param shipClass - Ship class name (e.g., 'fighter', 'bomber') for model selection
 */
export function createShipMesh(
  faction: Faction,
  shipClass?: string,
): THREE.Mesh {
  const color = FACTION_COLORS[faction] ?? 0xffffff;
  const material = new THREE.MeshPhongMaterial({ color });

  // Try to use embedded geometry (built lazily on first use)
  // Map 'freighter' to 'transport' (freighter is a convoy type, not a separate mesh)
  const mappedClass = shipClass === 'freighter' ? 'transport' : shipClass;
  if (mappedClass && isShipClass(mappedClass)) {
    const geometry = getShipGeometry(mappedClass).clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(SHIP_MODEL_SCALE);
    // Models created in top-down view (nose pointing +Y in Blender)
    // Rotate -90° on X to point nose forward (-Z in game)
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  // Fallback to cone geometry
  const geometry = new THREE.ConeGeometry(2, 8, 4);
  geometry.rotateX(Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

/** Creates a missile mesh with type-specific appearance */
export function createMissileMesh(missileType: MissileType): THREE.Group {
  const visual = MISSILE_VISUALS[missileType];
  const group = new THREE.Group();

  // Main body (cone pointing in -Z)
  const bodyGeom = new THREE.ConeGeometry(visual.radius, visual.length, 8);
  bodyGeom.rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshBasicMaterial({
    color: visual.color,
    transparent: true,
    opacity: 0.9,
  });
  if (visual.emissive) {
    bodyMat.color.lerp(new THREE.Color(visual.emissive), 0.3);
  }
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  group.add(body);

  // Add fins for larger missiles (torpedo, nuke)
  if (missileType === 'torpedo' || missileType === 'nuke') {
    const finGeom = new THREE.BoxGeometry(visual.radius * 2.5, 0.1, 0.8);
    const finMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeom, finMat);
      fin.position.z = visual.length * 0.35;
      fin.rotation.z = (i * Math.PI) / 2;
      group.add(fin);
    }
  }

  // Add glow sphere for emissive missiles
  if (visual.emissive) {
    const glowGeom = new THREE.SphereGeometry(visual.radius * 1.3, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: visual.emissive,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.z = -visual.length * 0.3;
    group.add(glow);
  }

  return group;
}

/** Creates a decoy mesh */
export function createDecoyMesh(faction: Faction): THREE.Group {
  const group = new THREE.Group();
  const color = FACTION_COLORS[faction] ?? 0xffff00;
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 12, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(inner, outer);
  return group;
}

/** Structure type to mesh class mapping (non-station structures) */
const STRUCTURE_MESH_CLASSES: Record<StructureType, ShipClass | null> = {
  waypoint: 'waypoint',
  obstacle: null,
  station: null, // Stations use stationType for mesh selection
};

/** Neutral gray color for structures */
const STRUCTURE_COLOR = 0x8888aa;

/**
 * Creates a structure mesh.
 * Uses embedded geometry if available, otherwise falls back to simple shape.
 * @param structureType - Type of structure to create
 * @param stationType - For stations: which station variant mesh to use
 */
export function createStructureMesh(
  structureType: StructureType,
  stationType?: StationType,
): THREE.Mesh {
  // For stations, use the stationType as the mesh class
  let meshClass: ShipClass | null;
  if (structureType === 'station' && stationType) {
    meshClass = stationType as ShipClass; // 'mining', 'refinery', 'military'
  } else {
    meshClass = STRUCTURE_MESH_CLASSES[structureType];
  }

  const material = new THREE.MeshPhongMaterial({
    color: STRUCTURE_COLOR,
    emissive: 0x222244,
    emissiveIntensity: 0.5,
  });

  // Try to use embedded geometry
  if (meshClass && isShipClass(meshClass)) {
    const geometry = getShipGeometry(meshClass).clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(SHIP_MODEL_SCALE);
    // Models created in top-down view (nose pointing +Y in Blender)
    // Rotate -90° on X to point nose forward (-Z in game)
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  // Fallback to simple box for obstacles
  const geometry = new THREE.BoxGeometry(10, 10, 10);
  return new THREE.Mesh(geometry, material);
}
