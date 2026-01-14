/**
 * Gzip Compression Utilities
 *
 * Uses native CompressionStream API for compressing replay data.
 * Provides functions for compressing/decompressing and format detection.
 *
 * Browser Support:
 * - Chrome 80+ (March 2020)
 * - Firefox 113+ (May 2023)
 * - Safari 16.4+ (March 2023)
 *
 * Use isCompressionSupported() to check availability. Falls back to
 * uncompressed storage when not supported.
 */

/** Gzip magic bytes for format detection */
const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

/**
 * Check if data appears to be gzip compressed.
 * Checks for gzip magic bytes at start.
 */
export function isGzipCompressed(data: Uint8Array): boolean {
  return (
    data.length >= 2 && data[0] === GZIP_MAGIC_0 && data[1] === GZIP_MAGIC_1
  );
}

/**
 * Check if CompressionStream API is available.
 * Falls back to uncompressed storage if not supported.
 */
export function isCompressionSupported(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

/**
 * Compress a string using gzip.
 * Returns compressed bytes as Uint8Array.
 */
export async function compressString(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input);

  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(inputBytes);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks into single array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Decompress gzip data to string.
 * Returns the decompressed string.
 */
export async function decompressToString(
  compressed: Uint8Array,
): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  // Copy to new Uint8Array with dedicated ArrayBuffer to satisfy TypeScript's
  // BufferSource requirement (avoids ArrayBufferLike vs ArrayBuffer mismatch)
  const buffer = new Uint8Array(compressed.length);
  buffer.set(compressed);
  writer.write(buffer);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks and decode
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  const decoder = new TextDecoder();
  return decoder.decode(result);
}

/**
 * Compress JSON-serializable data.
 * Returns compressed bytes.
 */
export async function compressJSON<T>(data: T): Promise<Uint8Array> {
  const json = JSON.stringify(data);
  return compressString(json);
}

/**
 * Decompress and parse JSON data.
 * Returns parsed object.
 */
export async function decompressJSON<T>(compressed: Uint8Array): Promise<T> {
  const json = await decompressToString(compressed);
  return JSON.parse(json) as T;
}
