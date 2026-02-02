/**
 * Seeded pseudo-random number generator using mulberry32.
 *
 * Deterministic: same seed always produces same sequence.
 * Used for all game randomness to ensure multiplayer sync.
 */

/** PRNG state - just the current seed value */
export interface PRNGState {
  seed: number;
}

/** Creates a new PRNG with the given seed */
export function createPRNG(seed: number): PRNGState {
  return { seed: seed >>> 0 }; // Ensure unsigned 32-bit
}

/**
 * Generates next random number in [0, 1) range.
 * Mutates state in place.
 */
export function random(state: PRNGState): number {
  // mulberry32 algorithm
  state.seed += 0x6d2b79f5;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Random integer in [min, max] inclusive */
export function randomInt(state: PRNGState, min: number, max: number): number {
  return Math.floor(random(state) * (max - min + 1)) + min;
}

/** Random float in [min, max) range */
export function randomRange(
  state: PRNGState,
  min: number,
  max: number,
): number {
  return random(state) * (max - min) + min;
}

/** Shuffle array in place (Fisher-Yates) */
export function shuffle<T>(state: PRNGState, array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(state, 0, i);
    const temp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = temp;
  }
  return array;
}

/** Random unit vector (for 3D direction) */
export function randomUnitVector(state: PRNGState): {
  x: number;
  y: number;
  z: number;
} {
  // Uniform distribution on sphere using rejection sampling
  let x: number, y: number, z: number, lengthSq: number;
  do {
    x = randomRange(state, -1, 1);
    y = randomRange(state, -1, 1);
    z = randomRange(state, -1, 1);
    lengthSq = x * x + y * y + z * z;
  } while (lengthSq > 1 || lengthSq === 0);

  const length = Math.sqrt(lengthSq);
  return { x: x / length, y: y / length, z: z / length };
}

/**
 * Derive a deterministic seed from a master seed and context parts.
 * Same inputs always produce same output (pure function).
 * Used for save-scum-proof randomness: derive(seed, 'store', sector) always
 * gives the same result for the same campaign state.
 */
export function deriveKey(
  masterSeed: number,
  ...parts: (string | number)[]
): number {
  let hash = masterSeed >>> 0;
  for (const part of parts) {
    const str = String(part);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
  }
  return hash >>> 0;
}

/**
 * Create a PRNG with a seed derived from master seed + context.
 * Example: createDerivedPRNG(campaignSeed, 'store', sectorNumber)
 */
export function createDerivedPRNG(
  masterSeed: number,
  ...parts: (string | number)[]
): PRNGState {
  return createPRNG(deriveKey(masterSeed, ...parts));
}
