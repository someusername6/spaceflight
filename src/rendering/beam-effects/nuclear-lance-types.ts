/**
 * Nuclear Lance Types and Constants - Shared types for nuclear lance effects.
 */

import * as THREE from 'three';

/** Lance shot visual state */
export interface LanceShot {
  origin: THREE.Vector3;
  hitPoint: THREE.Vector3;
  startTime: number;
  active: boolean;
  entitySeed: number; // For deterministic particles
}

/** Nuclear lance renderer state */
export interface NuclearLanceRenderer {
  shots: Map<string, LanceShot>;
  // Origin effects
  originFlashMeshes: Map<string, THREE.Mesh>;
  originLights: Map<string, THREE.PointLight>;
  // Beam (cylinder geometry)
  beamCores: Map<string, THREE.Mesh>;
  beamGlows: Map<string, THREE.Mesh>;
  // Impact effects
  impactFlashMeshes: Map<string, THREE.Mesh>;
  impactRings: Map<string, THREE.Mesh>;
  impactLights: Map<string, THREE.PointLight>;
  impactParticles: Map<string, THREE.Points>;
  particleVelocities: Map<string, Float32Array>;
  // Shared geometries
  sphereGeometry: THREE.SphereGeometry;
  ringGeometry: THREE.TorusGeometry;
}

// ============================================================
// Timing Constants (nuke-style extended durations)
// ============================================================
export const ORIGIN_FLASH_DURATION = 1.5; // 1500ms origin flash
export const BEAM_FADE_DURATION = 1.5; // 1500ms beam fade
export const IMPACT_FLASH_DURATION = 1.0; // 1000ms impact flash
export const IMPACT_RING_DURATION = 1.2; // 1200ms shockwave ring
export const IMPACT_PARTICLES_DURATION = 1.2; // 1200ms particles

// ============================================================
// Visual Parameters
// ============================================================
export const ORIGIN_FLASH_MAX_SCALE = 10; // Origin flash expands to 10x
export const IMPACT_FLASH_MAX_SCALE = 5; // Impact flash expands to 5x
export const IMPACT_RING_MAX_SCALE = 8; // Ring expands to 8x

export const BEAM_CORE_WIDTH = 0.8; // Inner bright core
export const BEAM_GLOW_WIDTH = 2.5; // Outer glow layer
export const BEAM_SEGMENTS = 8; // Cylinder segments

export const ORIGIN_LIGHT_INTENSITY = 5;
export const ORIGIN_LIGHT_DISTANCE = 200;
export const IMPACT_LIGHT_INTENSITY = 8;
export const IMPACT_LIGHT_DISTANCE = 150;

export const IMPACT_PARTICLE_COUNT = 24;
export const IMPACT_PARTICLE_SPEED = 6;

// ============================================================
// Colors
// ============================================================
export const ORIGIN_FLASH_COLOR = new THREE.Color(1.0, 0.95, 0.8); // White-gold
export const ORIGIN_FLASH_FADE_COLOR = new THREE.Color(0.4, 0.5, 1.0); // Cool blue
export const BEAM_CORE_COLOR = new THREE.Color(1.0, 1.0, 1.0); // Bright white
export const BEAM_GLOW_COLOR = new THREE.Color(0.6, 0.7, 1.0); // Blue-gold tint
export const BEAM_FADE_COLOR = new THREE.Color(0.3, 0.4, 0.8); // Cool blue fade
export const IMPACT_FLASH_COLOR = new THREE.Color(1.0, 0.9, 0.7); // White-orange
export const IMPACT_RING_COLOR = new THREE.Color(1.0, 1.0, 0.7); // Yellow-white
export const IMPACT_PARTICLE_COLOR = new THREE.Color(1.0, 0.8, 0.4); // Orange-gold

// Reusable vectors (module-level for performance)
export const direction = new THREE.Vector3();
export const quaternion = new THREE.Quaternion();
export const tempColor = new THREE.Color();
