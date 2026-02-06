/**
 * Jump Effect Renderer - Visual effects for hyperspace jumps.
 *
 * When an entity has a hyperspaceJump component, this renderer:
 * 1. Hides the original ship mesh
 * 2. Creates a shader-based effect mesh
 * 3. Updates uniforms each frame based on jump progress
 * 4. Cleans up when the entity is removed
 */

import * as THREE from 'three';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Faction as FactionEnum } from '../../core/types';
import { getArchetype } from '../../factories/ship';
import { TICK_SEC } from '../../game';
import { SHIP_MODEL_SCALE } from '../constants';
import { FACTION_COLORS } from '../mesh-factory';
import {
  getInterpolatedPosition,
  getInterpolatedRotation,
  type Renderer,
} from '../renderer';
import { SHIP_GEOMETRIES, type ShipClass } from '../ship-geometries';
import {
  jumpFragmentShader,
  jumpVertexShader,
} from './shaders/jump-effect.glsl';

/** Energy color for jump effect (cyan glow) */
const ENERGY_COLOR = new THREE.Color(0x00ffff);

/** Typed uniforms for jump shader */
interface JumpUniforms {
  [uniform: string]: THREE.IUniform;
  uJumpProgress: THREE.IUniform<number>;
  uJumpDirection: THREE.IUniform<THREE.Vector3>;
  uBaseColor: THREE.IUniform<THREE.Color>;
  uEnergyColor: THREE.IUniform<THREE.Color>;
  uTime: THREE.IUniform<number>;
}

/** Tracked jump effect visual */
interface JumpVisual {
  entity: Entity;
  mesh: THREE.Mesh;
  originalMesh: THREE.Object3D | null;
  material: THREE.ShaderMaterial;
  uniforms: JumpUniforms;
  startTime: number;
}

/** Cached geometry per ship class (reused across jump effects) */
const geometryCache = new Map<ShipClass, THREE.BufferGeometry>();

export interface JumpEffectRenderer {
  visuals: Map<Entity, JumpVisual>;
  seenJumps: Set<Entity>;
  scene: THREE.Scene | null;
}

/** Creates the jump effect renderer */
export function createJumpEffectRenderer(): JumpEffectRenderer {
  return {
    visuals: new Map(),
    seenJumps: new Set(),
    scene: null,
  };
}

/** Get or create cached geometry for a ship class */
function getOrCreateGeometry(shipClass: ShipClass): THREE.BufferGeometry {
  let geometry = geometryCache.get(shipClass);
  if (geometry) return geometry;

  const geometryData = SHIP_GEOMETRIES[shipClass];
  if (!geometryData) {
    throw new Error(`No geometry data for ship class: ${shipClass}`);
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(geometryData.positions, 3),
  );
  if (geometryData.normals) {
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(geometryData.normals, 3),
    );
  }
  if (geometryData.indices) {
    const vertexCount = geometryData.positions.length / 3;
    const IndexBuffer =
      vertexCount > 65535
        ? THREE.Uint32BufferAttribute
        : THREE.Uint16BufferAttribute;
    geometry.setIndex(new IndexBuffer(geometryData.indices, 1));
  }

  geometryCache.set(shipClass, geometry);
  return geometry;
}

/** Get ship class for an entity */
function getShipClass(world: World, entity: Entity): ShipClass | null {
  const identity = getComponent(world, entity, 'shipIdentity');
  if (!identity) return null;

  const archetype = getArchetype(identity.archetype);
  const shipClass = archetype?.shipClassName ?? identity.archetype;

  // Check if it's a valid ship class
  if (shipClass && shipClass in SHIP_GEOMETRIES) {
    return shipClass as ShipClass;
  }
  return null;
}

/** Create jump effect mesh for an entity */
function createJumpEffectMesh(
  world: World,
  entity: Entity,
  scene: THREE.Scene,
  entityMeshes: Map<Entity, THREE.Object3D>,
  renderer?: Renderer,
): JumpVisual | null {
  const jump = getComponent(world, entity, 'hyperspaceJump');
  const transform = getComponent(world, entity, 'transform');
  const faction = getComponent(world, entity, 'faction');

  if (!jump || !transform) return null;

  // Get ship class to use cached geometry
  const shipClass = getShipClass(world, entity);
  if (!shipClass) return null;

  // Get or create cached geometry (shared across all jumps of same ship class)
  const geometry = getOrCreateGeometry(shipClass);

  // Get base color from faction
  const baseColor = new THREE.Color(
    FACTION_COLORS[faction?.faction ?? FactionEnum.Neutral] ?? 0xffffff,
  );

  // Create typed uniforms
  const uniforms: JumpUniforms = {
    uJumpProgress: { value: 0 },
    uJumpDirection: { value: jump.direction.clone() },
    uBaseColor: { value: baseColor },
    uEnergyColor: { value: ENERGY_COLOR.clone() },
    uTime: { value: 0 },
  };

  // Create shader material
  const material = new THREE.ShaderMaterial({
    vertexShader: jumpVertexShader,
    fragmentShader: jumpFragmentShader,
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(SHIP_MODEL_SCALE);
  mesh.rotation.x = -Math.PI / 2; // Same rotation as ship meshes

  // Position at entity location
  const interpPos = renderer ? getInterpolatedPosition(renderer, entity) : null;
  const interpRot = renderer ? getInterpolatedRotation(renderer, entity) : null;
  if (interpPos) {
    mesh.position.copy(interpPos);
  } else {
    mesh.position.copy(transform.position);
  }
  if (interpRot) {
    mesh.quaternion.copy(interpRot);
  } else {
    mesh.quaternion.copy(transform.rotation);
  }

  scene.add(mesh);

  // Hide original mesh
  const originalMesh = entityMeshes.get(entity) ?? null;
  if (originalMesh) {
    originalMesh.visible = false;
  }

  return {
    entity,
    mesh,
    originalMesh,
    material,
    uniforms,
    startTime: jump.startTime,
  };
}

/** Updates jump effect visuals */
export function updateJumpEffectRenderer(
  jumpRenderer: JumpEffectRenderer,
  scene: THREE.Scene,
  world: World,
  entityMeshes: Map<Entity, THREE.Object3D>,
  alpha = 1,
  renderer?: Renderer,
): void {
  jumpRenderer.scene = scene;
  jumpRenderer.seenJumps.clear();

  const gameTime = world.systemState.gameTime;
  const interpolatedTime = gameTime - TICK_SEC * (1 - alpha);

  // Update or create visuals for entities with hyperspace jump
  for (const entity of queryEntities(world, ['hyperspaceJump', 'transform'])) {
    jumpRenderer.seenJumps.add(entity);

    const jump = getComponent(world, entity, 'hyperspaceJump');
    if (!jump) continue;

    const visual = jumpRenderer.visuals.get(entity);

    if (!visual) {
      const newVisual = createJumpEffectMesh(
        world,
        entity,
        scene,
        entityMeshes,
        renderer,
      );
      if (newVisual) {
        jumpRenderer.visuals.set(entity, newVisual);
      }
      continue;
    }

    // Update uniforms using typed accessors
    // Interpolate progress for smooth animation
    const elapsed = interpolatedTime - visual.startTime;
    const interpolatedProgress = Math.min(
      1,
      Math.max(0, elapsed / jump.duration),
    );

    visual.uniforms.uJumpProgress.value = interpolatedProgress;
    visual.uniforms.uTime.value = interpolatedTime;

    // Update position/rotation
    const interpPos = renderer
      ? getInterpolatedPosition(renderer, entity)
      : null;
    const interpRot = renderer
      ? getInterpolatedRotation(renderer, entity)
      : null;
    if (interpPos) visual.mesh.position.copy(interpPos);
    if (interpRot) visual.mesh.quaternion.copy(interpRot);
  }

  // Remove visuals for entities that no longer have jump component
  for (const [entity, visual] of jumpRenderer.visuals) {
    if (!jumpRenderer.seenJumps.has(entity)) {
      scene.remove(visual.mesh);
      visual.material.dispose();
      // Note: geometry is cached and shared, don't dispose it here

      // Restore original mesh visibility (though entity is likely being removed)
      if (visual.originalMesh) {
        visual.originalMesh.visible = true;
      }

      jumpRenderer.visuals.delete(entity);
    }
  }
}

/** Reset jump effect renderer (for replay seeking) */
export function resetJumpEffectRenderer(renderer: JumpEffectRenderer): void {
  if (!renderer.scene) return;

  for (const visual of renderer.visuals.values()) {
    renderer.scene.remove(visual.mesh);
    visual.material.dispose();
    // Note: geometry is cached and shared, don't dispose it here

    if (visual.originalMesh) {
      visual.originalMesh.visible = true;
    }
  }
  renderer.visuals.clear();
  renderer.seenJumps.clear();
}

/** Dispose jump effect renderer */
export function disposeJumpEffectRenderer(
  renderer: JumpEffectRenderer,
  scene: THREE.Scene,
): void {
  for (const visual of renderer.visuals.values()) {
    scene.remove(visual.mesh);
    visual.material.dispose();
    // Note: geometry is cached and shared, don't dispose it here
  }
  renderer.visuals.clear();
  renderer.seenJumps.clear();
  renderer.scene = null;

  // Dispose cached geometries (full cleanup)
  for (const geometry of geometryCache.values()) {
    geometry.dispose();
  }
  geometryCache.clear();
}
