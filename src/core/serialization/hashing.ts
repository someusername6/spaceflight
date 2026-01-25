/**
 * World Hash - Deterministic state hashing for desync detection.
 *
 * Computes a 32-bit hash of all simulation-critical state.
 * Two worlds with identical state will produce identical hashes.
 * Used by rollback netcode to detect when clients have diverged.
 *
 * Design:
 * - Uses FNV-1a hash (fast, good distribution)
 * - Hashes in deterministic order (entities sorted by ID)
 * - Only includes simulation-critical fields
 * - Skips transient/visual-only state
 */

import type { World } from '../types';
import { hashComponent } from './component-hashers';

// =============================================================================
// FNV-1a Hash Implementation
// =============================================================================

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * FNV-1a hash state.
 * Maintains running hash value across multiple updates.
 */
export class HashState {
  private hash: number = FNV_OFFSET_BASIS;

  /** Add a byte to the hash */
  addByte(b: number): void {
    this.hash ^= b & 0xff;
    this.hash = Math.imul(this.hash, FNV_PRIME) >>> 0;
  }

  /** Add a 32-bit integer to the hash */
  addInt32(n: number): void {
    this.addByte(n & 0xff);
    this.addByte((n >>> 8) & 0xff);
    this.addByte((n >>> 16) & 0xff);
    this.addByte((n >>> 24) & 0xff);
  }

  /** Add a 64-bit float to the hash (as IEEE 754 bytes) */
  addFloat64(n: number): void {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, n, true); // little-endian
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < 8; i++) {
      this.addByte(bytes[i] as number);
    }
  }

  /** Add a boolean to the hash */
  addBool(b: boolean): void {
    this.addByte(b ? 1 : 0);
  }

  /** Add a string to the hash */
  addString(s: string): void {
    this.addInt32(s.length);
    for (let i = 0; i < s.length; i++) {
      this.addInt32(s.charCodeAt(i));
    }
  }

  /** Get the final hash value */
  finalize(): number {
    return this.hash >>> 0;
  }
}

// =============================================================================
// System State Hashing
// =============================================================================

function hashSystemState(
  hash: HashState,
  state: import('../types').SystemState,
): void {
  hash.addFloat64(state.gameTime);

  // Weapons
  hash.addBool(state.weapons.prevInput.cyclePrimary);
  hash.addBool(state.weapons.prevInput.cycleSecondary);
  hash.addBool(state.weapons.prevInput.fireSecondary);
  hash.addBool(state.weapons.prevInput.launchDecoy);
  hash.addFloat64(state.weapons.lastDecoyFireTime);

  // Targeting
  hash.addBool(state.targeting.prevInput.cycleTargetNext);
  hash.addBool(state.targeting.prevInput.cycleTargetPrev);
  hash.addBool(state.targeting.prevInput.targetNearest);

  // Flight assist
  hash.addBool(state.flightAssist.prevInput.toggleMatchSpeed);

  // Beams (sorted by entity ID for determinism)
  const beamEntityIds = Array.from(state.beams.activeBeams.keys()).sort(
    (a, b) => a - b,
  );
  hash.addInt32(beamEntityIds.length);
  for (const entityId of beamEntityIds) {
    hash.addInt32(entityId);
    const beams = state.beams.activeBeams.get(entityId);
    if (!beams) continue;
    hash.addInt32(beams.length);
    for (const beam of beams) {
      hash.addBool(beam.active);
      hash.addInt32(beam.weaponIndex);
      hash.addFloat64(beam.origin.x);
      hash.addFloat64(beam.origin.y);
      hash.addFloat64(beam.origin.z);
      hash.addFloat64(beam.direction.x);
      hash.addFloat64(beam.direction.y);
      hash.addFloat64(beam.direction.z);
    }
  }

  // prevFireState (sorted)
  const prevFireEntityIds = Array.from(state.beams.prevFireState.keys()).sort(
    (a, b) => a - b,
  );
  hash.addInt32(prevFireEntityIds.length);
  for (const entityId of prevFireEntityIds) {
    hash.addInt32(entityId);
    hash.addBool(state.beams.prevFireState.get(entityId) ?? false);
  }

  // Mission
  hash.addString(state.mission.result);
  hash.addString(state.mission.missionType);

  // Ship identity callsign counters (sorted keys)
  const counterKeys = Object.keys(state.shipIdentity.callsignCounters).sort();
  hash.addInt32(counterKeys.length);
  for (const key of counterKeys) {
    hash.addString(key);
    hash.addInt32(state.shipIdentity.callsignCounters[key] ?? 0);
  }

  // Pools
  hash.addInt32(state.pools.beamWeapon);
  hash.addInt32(state.pools.collidable);
  hash.addInt32(state.pools.targetCollector);
}

// =============================================================================
// World Hash
// =============================================================================

/**
 * Compute a deterministic hash of the world state.
 * Two worlds with identical simulation state will produce identical hashes.
 *
 * @param world - The world to hash
 * @returns A 32-bit unsigned integer hash
 */
export function computeWorldHash(world: World): number {
  const hash = new HashState();

  // Hash PRNG state first (critical for determinism)
  hash.addInt32(world.prng.seed);

  // Hash entity ID allocator
  hash.addInt32(world.nextEntityId);

  // Hash pending removals (sorted)
  const toRemoveArray = Array.from(world.toRemove).sort((a, b) => a - b);
  hash.addInt32(toRemoveArray.length);
  for (const e of toRemoveArray) {
    hash.addInt32(e);
  }

  // Hash entities in deterministic order (sorted by ID)
  const entityIds = Array.from(world.entities).sort((a, b) => a - b);
  hash.addInt32(entityIds.length);

  for (const entityId of entityIds) {
    hash.addInt32(entityId);

    const componentMap = world.components.get(entityId);
    if (!componentMap) {
      hash.addInt32(0); // No components
      continue;
    }

    // Sort component types for deterministic order
    const componentTypes = Array.from(componentMap.keys()).sort();
    hash.addInt32(componentTypes.length);

    for (const componentType of componentTypes) {
      const component = componentMap.get(componentType);
      if (component) {
        hashComponent(hash, component);
      }
    }
  }

  // Hash system state
  hashSystemState(hash, world.systemState);

  return hash.finalize();
}

/**
 * Check if two worlds have identical simulation state.
 * Convenience wrapper around hash comparison.
 */
export function worldsEqual(world1: World, world2: World): boolean {
  return computeWorldHash(world1) === computeWorldHash(world2);
}
