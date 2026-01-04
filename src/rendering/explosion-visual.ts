/**
 * Explosion Visual Creation - Creates and updates individual explosion visuals.
 */

import * as THREE from 'three';
import type { Explosion } from '../components/explosion';
import { createPRNG, random } from '../core/prng';
import type { Entity } from '../core/types';
import { getNukeColor } from './nuke-colors';

const PARTICLES_PER_EXPLOSION = 24;
const NUKE_PARTICLES = 64;
const EXPANSION_SPEED = 3;
const NUKE_EXPANSION_SPEED = 5;
const PARTICLE_SPEED = 4;
const NUKE_PARTICLE_SPEED = 8;
const NUKE_FLASH_DURATION = 0.1;

export interface ExplosionVisual {
  sphere: THREE.Mesh;
  particles: THREE.Points;
  particleVelocities: Float32Array;
  isNuke: boolean;
  // Nuke-specific elements (undefined for standard explosions)
  flash?: THREE.Mesh;
  ring?: THREE.Mesh;
  light?: THREE.PointLight;
}

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
function createParticleVelocities(
  entitySeed: Entity,
  count: number = PARTICLES_PER_EXPLOSION,
): Float32Array {
  const velocities = new Float32Array(count * 3);
  const prng = createPRNG(entitySeed * 31337); // Deterministic seed from entity ID

  for (let i = 0; i < count; i++) {
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

/** Creates visual elements for one explosion */
export function createExplosionVisual(
  sphereGeometry: THREE.SphereGeometry,
  nukeRingGeometry: THREE.TorusGeometry,
  scene: THREE.Scene,
  entity: Entity,
  explosion: Explosion,
  position: THREE.Vector3,
): ExplosionVisual {
  const isNuke = explosion.variant === 'nuke';
  const particleCount = isNuke ? NUKE_PARTICLES : PARTICLES_PER_EXPLOSION;

  // Create sphere (white for nukes initially, then color shifts)
  const initialColor = isNuke ? new THREE.Color(1, 1, 1) : explosion.color;
  const sphereMaterial = createSphereMaterial(initialColor);
  const sphere = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial);
  sphere.position.copy(position);
  sphere.scale.setScalar(0.1); // Start small
  scene.add(sphere);

  // Create particles (positions set by updateExplosionVisual)
  const particlePositions = new Float32Array(particleCount * 3);
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3),
  );

  const particleMaterial = createParticleMaterial(explosion.color);
  if (isNuke) {
    particleMaterial.size = 3; // Larger particles for nuke
  }
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Random velocities for particles (seeded by entity ID for determinism)
  const particleVelocities = createParticleVelocities(entity, particleCount);

  const visual: ExplosionVisual = {
    sphere,
    particles,
    particleVelocities,
    isNuke,
  };

  // Create nuke-specific elements
  if (isNuke) {
    // Initial bright flash
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flash = new THREE.Mesh(sphereGeometry.clone(), flashMaterial);
    flash.position.copy(position);
    flash.scale.setScalar(explosion.size * 0.5);
    scene.add(flash);
    visual.flash = flash;

    // Shockwave ring
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(nukeRingGeometry.clone(), ringMaterial);
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2; // Flat ring
    ring.scale.setScalar(explosion.size * 0.5);
    scene.add(ring);
    visual.ring = ring;

    // Point light for illumination
    const light = new THREE.PointLight(0xffffcc, 50, explosion.size * 30);
    light.position.copy(position);
    scene.add(light);
    visual.light = light;
  }

  return visual;
}

/** Updates one explosion's visual elements */
export function updateExplosionVisual(
  visual: ExplosionVisual,
  position: THREE.Vector3,
  explosion: Explosion,
  progress: number,
): void {
  const { sphere, particles, particleVelocities, isNuke } = visual;

  // Eased progress for smoother animation
  const easedProgress = 1 - (1 - progress) ** 2; // ease out

  // Select expansion and particle speeds based on type
  const expansionSpeed = isNuke ? NUKE_EXPANSION_SPEED : EXPANSION_SPEED;
  const particleSpeed = isNuke ? NUKE_PARTICLE_SPEED : PARTICLE_SPEED;
  const particleCount = isNuke ? NUKE_PARTICLES : PARTICLES_PER_EXPLOSION;

  // Update sphere - expand and fade
  const sphereScale = explosion.size * (0.5 + easedProgress * expansionSpeed);
  sphere.position.copy(position);
  sphere.scale.setScalar(sphereScale);

  // Update sphere color and opacity
  const sphereMaterial = sphere.material as THREE.MeshBasicMaterial;
  if (isNuke) {
    // Color progression for nukes
    sphereMaterial.color.copy(getNukeColor(progress));
    // Fade out slower for nukes
    sphereMaterial.opacity = Math.max(0, 0.8 * (1 - easedProgress * 1.2));
  } else {
    // Standard fade
    sphereMaterial.opacity = Math.max(0, 0.6 * (1 - easedProgress * 1.5));
  }

  // Update particles - fly outward from center
  const particlePositions = particles.geometry.attributes.position
    ?.array as Float32Array;
  const particleDistance = explosion.size * easedProgress * particleSpeed;

  for (let i = 0; i < particleCount; i++) {
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
  if (isNuke) {
    // Color progression for nuke particles too
    (particles.material as THREE.PointsMaterial).color.copy(
      getNukeColor(progress * 0.8), // Slightly ahead of sphere
    );
  }

  // Update nuke-specific elements
  if (isNuke) {
    // Flash - very bright initially, fades quickly
    if (visual.flash) {
      visual.flash.position.copy(position);
      const flashProgress = progress / NUKE_FLASH_DURATION;
      if (flashProgress < 1) {
        visual.flash.visible = true;
        const flashScale = explosion.size * (1 + flashProgress * 2); // Expand quickly
        visual.flash.scale.setScalar(flashScale);
        const flashOpacity = 1 - flashProgress;
        (visual.flash.material as THREE.MeshBasicMaterial).opacity =
          flashOpacity;
      } else {
        visual.flash.visible = false;
      }
    }

    // Shockwave ring - expands outward faster than sphere
    if (visual.ring) {
      visual.ring.position.copy(position);
      const ringScale = explosion.size * (1 + easedProgress * 10); // Expands much faster
      visual.ring.scale.setScalar(ringScale);
      // Ring fades as it expands
      const ringOpacity = Math.max(0, 0.8 * (1 - easedProgress));
      (visual.ring.material as THREE.MeshBasicMaterial).opacity = ringOpacity;
    }

    // Point light - starts bright, fades with explosion
    if (visual.light) {
      visual.light.position.copy(position);
      // Intensity peaks early then fades
      const lightProgress = Math.min(1, progress * 3);
      const lightIntensity =
        lightProgress < 0.3 ? 80 : 80 * (1 - lightProgress);
      visual.light.intensity = Math.max(0, lightIntensity);
    }
  }
}

/** Cleanup visual resources */
export function disposeExplosionVisual(
  visual: ExplosionVisual,
  scene: THREE.Scene,
): void {
  scene.remove(visual.sphere);
  scene.remove(visual.particles);
  visual.sphere.geometry.dispose();
  (visual.sphere.material as THREE.Material).dispose();
  visual.particles.geometry.dispose();
  (visual.particles.material as THREE.Material).dispose();
  // Cleanup nuke-specific elements
  if (visual.flash) {
    scene.remove(visual.flash);
    visual.flash.geometry.dispose();
    (visual.flash.material as THREE.Material).dispose();
  }
  if (visual.ring) {
    scene.remove(visual.ring);
    visual.ring.geometry.dispose();
    (visual.ring.material as THREE.Material).dispose();
  }
  if (visual.light) {
    scene.remove(visual.light);
  }
}
