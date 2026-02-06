/**
 * Mersenne Twister PRNG - exact implementation matching 'rng' npm package.
 *
 * Used for compatibility with wwwtyro/space-2d procedural generation.
 * For general game randomness, use prng.ts (mulberry32) instead.
 */

export class MersenneTwister {
  private _state: number[];
  private _index = 0;

  constructor(seed: number) {
    this._state = new Array<number>(624);
    // Seed is always required - no Math.random() fallback for determinism
    this._state[0] = seed | 0;

    for (let i = 1; i < 624; i++) {
      const prev = this._state[i - 1] as number;
      this._state[i] = prev ^ (prev >>> 30);
      this._state[i] = 0x6c078965 * (this._state[i] as number) + i;
      const curr = this._state[i] as number;
      // In JS, (curr << 32) === curr (shift mod 32), so this computes curr & (curr - 1).
      // Matches rng@0.2.2 npm package. Do not "fix" or sequences will diverge.
      this._state[i] = curr & ((curr << 32) - 1);
    }
  }

  private _generateNumbers(): void {
    const MT = this._state;
    for (let i = 0; i < 624; i++) {
      let y = (MT[i] as number) & 0x80000000;
      y = y + ((MT[(i + 1) % 624] as number) & 0x7fffffff);
      MT[i] = (MT[(i + 397) % 624] as number) ^ (y >>> 1);
      if (y % 2 !== 0) {
        MT[i] = (MT[i] as number) ^ 0x9908b0df;
      }
    }
  }

  random(): number {
    if (this._index === 0) {
      this._generateNumbers();
    }

    let y = this._state[this._index] as number;
    y = y ^ (y >>> 11);
    y = y ^ ((y << 7) & 0x9d2c5680);
    y = y ^ ((y << 15) & 0xefc60000);
    y = y ^ (y >>> 18);

    this._index = (this._index + 1) % 624;
    return (y >>> 0) * (1.0 / 4294967296.0);
  }
}

/** Hash a string to a number */
function hashcode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += (i + 1) * str.charCodeAt(i);
  }
  return hash;
}

/** Create seeded MT RNG from string seed and offset */
export function createMT(seed: string, offset: number): MersenneTwister {
  return new MersenneTwister(hashcode(seed) + offset);
}
