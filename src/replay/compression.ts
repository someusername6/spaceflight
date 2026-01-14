/**
 * RLE Compression for Input Sequences
 *
 * Run-length encoding compresses repeated values efficiently.
 * Format: [value, count, value, count, ...]
 *
 * Example: [64, 64, 64, 512, 512] → [64, 3, 512, 2]
 *
 * Typical compression ratios for gameplay:
 * - Cruising (accelerate only): 90%+ compression
 * - Combat (varied inputs): 60-80% compression
 * - Chaotic input: May not compress (returns original)
 */

/**
 * Maximum decoded size to prevent memory exhaustion attacks.
 * 10 million ticks = ~166 minutes at 60Hz, far exceeds any reasonable replay.
 */
const MAX_DECODED_SIZE = 10_000_000;

/**
 * Result of RLE encoding.
 */
export interface RLEResult {
  /** Encoded (or original if compression unhelpful) data */
  data: number[];
  /** Whether RLE was actually applied */
  compressed: boolean;
}

/**
 * Encode input array using run-length encoding.
 * Returns original array if RLE would be larger.
 */
export function encodeRLE(inputs: number[]): RLEResult {
  if (inputs.length === 0) {
    return { data: [], compressed: false };
  }

  if (inputs.length === 1) {
    return { data: [inputs[0] ?? 0, 1], compressed: true };
  }

  const encoded: number[] = [];
  let currentValue = inputs[0] ?? 0;
  let count = 1;

  for (let i = 1; i < inputs.length; i++) {
    const value = inputs[i] ?? 0;
    if (value === currentValue) {
      count++;
    } else {
      encoded.push(currentValue, count);
      currentValue = value;
      count = 1;
    }
  }
  // Push final run
  encoded.push(currentValue, count);

  // Only use RLE if it's actually smaller
  if (encoded.length < inputs.length) {
    return { data: encoded, compressed: true };
  }

  return { data: inputs, compressed: false };
}

/**
 * Decode RLE-encoded array back to original.
 * If the input wasn't actually compressed, returns a copy.
 * Throws if decoded size exceeds MAX_DECODED_SIZE to prevent memory exhaustion.
 */
export function decodeRLE(encoded: number[], wasCompressed: boolean): number[] {
  if (!wasCompressed) {
    if (encoded.length > MAX_DECODED_SIZE) {
      throw new Error(
        `Replay too large: ${encoded.length} ticks exceeds maximum ${MAX_DECODED_SIZE}`,
      );
    }
    return [...encoded];
  }

  if (encoded.length === 0) {
    return [];
  }

  // Pre-calculate total size to catch malicious data early
  let totalSize = 0;
  for (let i = 1; i < encoded.length; i += 2) {
    totalSize += encoded[i] ?? 0;
    if (totalSize > MAX_DECODED_SIZE) {
      throw new Error(
        `Replay too large: decoded size exceeds maximum ${MAX_DECODED_SIZE}`,
      );
    }
  }

  const result: number[] = [];
  for (let i = 0; i < encoded.length; i += 2) {
    const value = encoded[i] ?? 0;
    const count = encoded[i + 1] ?? 0;
    for (let j = 0; j < count; j++) {
      result.push(value);
    }
  }
  return result;
}

/**
 * Calculate compression ratio.
 * Returns a value > 1 if compression was effective.
 * Example: ratio of 4 means original was 4x larger.
 */
export function getCompressionRatio(
  originalLength: number,
  compressedLength: number,
  wasCompressed: boolean,
): number {
  if (!wasCompressed || compressedLength === 0) {
    return 1.0;
  }
  return originalLength / compressedLength;
}

/**
 * Estimate compressed size without actually compressing.
 * Useful for UI warnings about large replays.
 */
export function estimateCompressedSize(inputs: number[]): number {
  if (inputs.length === 0) return 0;

  let runs = 1;
  let currentValue = inputs[0] ?? 0;

  for (let i = 1; i < inputs.length; i++) {
    const value = inputs[i] ?? 0;
    if (value !== currentValue) {
      runs++;
      currentValue = value;
    }
  }

  // RLE uses 2 numbers per run
  const rleSize = runs * 2;

  // Return smaller of RLE or original
  return Math.min(rleSize, inputs.length);
}
