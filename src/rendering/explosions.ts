/**
 * Explosion Rendering - Visual effects for explosions.
 *
 * Each explosion has:
 * - An expanding sphere that fades out
 * - Particles that fly outward
 */

import * as THREE from 'three';
import type { Explosion } from '../components/explosion';
import { getExplosionProgress } from '../components/explosion';
import type { Transform } from '../components/transform';
import { getComponent, queryEntities } from '../core/ecs';
import { createPRNG, random } from '../core/prng';
import type { Entity, World } from '../core/types';

/** Particles per explosion */
const PARTICLES_PER_EXPLOSION = 24;

/** Expansion speed multiplier */
const EXPANSION_SPEED = 3;

/** Particle speed multiplier */
const PARTICLE_SPEED = 4;

// Reusable Set for tracking seen explosions (avoid per-frame allocations)
const seenExplosions = new Set<Entity>();

/** Explosion visual state */
interface ExplosionVisual {
  sphere: THREE.Mesh;
  particles: THREE.Points;
  particleVelocities: Float32Array;
}

/** Explosion rendering system state */
export interface ExplosionRenderer {
  visuals: Map<Entity, ExplosionVisual>;
  sphereGeometry: THREE.SphereGeometry;
}

/** Sphere material - additive blending for glow */
function createSphereMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Particle material */
function createParticleMaterial(color: THREE.Color): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color,
    size: 2,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** Create random unit vectors for particle velocities (seeded by entity ID) */
function createParticleVelocities(entitySeed: Entity): Float32Array {
  const velocities = new Float32Array(PARTICLES_PER_EXPLOSION * 3);
  const prng = createPRNG(entitySeed * 31337); // Deterministic seed from entity ID

  for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
    // Random direction on unit sphere
    const theta = random(prng) * Math.PI * 2;
    const phi = Math.acos(2 * random(prng) - 1);

    const idx = i * 3;
    velocities[idx] = Math.sin(phi) * Math.cos(theta);
    velocities[idx + 1] = Math.sin(phi) * Math.sin(theta);
    velocities[idx + 2] = Math.cos(phi);
  }

  return velocities;
}

/** Creates the explosion renderer */
export function createExplosionRenderer(): ExplosionRenderer {
  // Shared sphere geometry (cloned per explosion)
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);

  return {
    visuals: new Map(),
    sphereGeometry,
  };
}

/** Updates explosion visuals */
export function updateExplosionRenderer(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  // Clear reusable Set (avoid per-frame allocations)
  seenExplosions.clear();

  // Update or create visuals for explosion entities
  for (const entity of queryEntities(world, ['explosion', 'transform'])) {
    seenExplosions.add(entity);

    // Query guarantees these components exist
    const explosion = getComponent<Explosion>(
      world,
      entity,
      'explosion',
    ) as Explosion;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const progress = getExplosionProgress(explosion);

    let visual = renderer.visuals.get(entity);

    if (!visual) {
      // Create new visual
      visual = createExplosionVisual(
        renderer,
        scene,
        entity,
        explosion.color,
        transform.position,
      );
      renderer.visuals.set(entity, visual);
    }

    // Update visual based on progress
    updateExplosionVisual(visual, transform.position, explosion, progress);
  }

  // Remove visuals for explosions that no longer exist
  for (const [entity, visual] of renderer.visuals) {
    if (!seenExplosions.has(entity)) {
      scene.remove(visual.sphere);
      scene.remove(visual.particles);
      visual.sphere.geometry.dispose();
      (visual.sphere.material as THREE.Material).dispose();
      visual.particles.geometry.dispose();
      (visual.particles.material as THREE.Material).dispose();
      renderer.visuals.delete(entity);
    }
  }
}

/** Creates visual elements for one explosion */
function createExplosionVisual(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
  entity: Entity,
  color: THREE.Color,
  position: THREE.Vector3,
): ExplosionVisual {
  // Create sphere
  const sphereMaterial = createSphereMaterial(color);
  const sphere = new THREE.Mesh(
    renderer.sphereGeometry.clone(),
    sphereMaterial,
  );
  sphere.position.copy(position);
  sphere.scale.setScalar(0.1); // Start small
  scene.add(sphere);

  // Create particles (positions set by updateExplosionVisual)
  const particlePositions = new Float32Array(PARTICLES_PER_EXPLOSION * 3);
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3),
  );

  const particleMaterial = createParticleMaterial(color);
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Random velocities for particles (seeded by entity ID for determinism)
  const particleVelocities = createParticleVelocities(entity);

  return { sphere, particles, particleVelocities };
}

/** Updates one explosion's visual elements */
function updateExplosionVisual(
  visual: ExplosionVisual,
  position: THREE.Vector3,
  explosion: Explosion,
  progress: number,
): void {
  const { sphere, particles, particleVelocities } = visual;

  // Eased progress for smoother animation
  const easedProgress = 1 - (1 - progress) ** 2; // ease out

  // Update sphere - expand and fade
  const sphereScale = explosion.size * (0.5 + easedProgress * EXPANSION_SPEED);
  sphere.position.copy(position);
  sphere.scale.setScalar(sphereScale);

  // Fade out sphere (faster fade in second half)
  const sphereOpacity = Math.max(0, 0.6 * (1 - easedProgress * 1.5));
  (sphere.material as THREE.MeshBasicMaterial).opacity = sphereOpacity;

  // Update particles - fly outward from center
  const particlePositions = particles.geometry.attributes.position
    ?.array as Float32Array;
  const particleDistance = explosion.size * easedProgress * PARTICLE_SPEED;

  for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
    const idx = i * 3;
    particlePositions[idx] =
      position.x + (particleVelocities[idx] as number) * particleDistance;
    particlePositions[idx + 1] =
      position.y + (particleVelocities[idx + 1] as number) * particleDistance;
    particlePositions[idx + 2] =
      position.z + (particleVelocities[idx + 2] as number) * particleDistance;
  }
  const posAttr = particles.geometry.attributes.position;
  if (posAttr) {
    posAttr.needsUpdate = true;
  }

  // Fade out particles
  const particleOpacity = Math.max(0, 1 - easedProgress);
  (particles.material as THREE.PointsMaterial).opacity = particleOpacity;
}

/** Disposes of explosion renderer resources */
export function disposeExplosionRenderer(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
): void {
  for (const visual of renderer.visuals.values()) {
    scene.remove(visual.sphere);
    scene.remove(visual.particles);
    visual.sphere.geometry.dispose();
    (visual.sphere.material as THREE.Material).dispose();
    visual.particles.geometry.dispose();
    (visual.particles.material as THREE.Material).dispose();
  }
  renderer.visuals.clear();
  renderer.sphereGeometry.dispose();
}
