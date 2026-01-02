/**
 * Faithful reproduction of wwwtyro's space-2d algorithm.
 *
 * This script reproduces the EXACT algorithm from:
 * https://github.com/wwwtyro/space-2d
 *
 * Using seed "7alzyiphy3k0" to validate correctness.
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'test-output');

// ============================================================================
// Mersenne Twister - exact copy from rng npm package
// ============================================================================

class MersenneTwister {
  constructor(seed) {
    this._state = new Array(624);
    this._index = 0;
    this._state[0] = seed != null ? seed : (Math.random() * 0xffffffff) | 0;

    for (let i = 1; i < 624; i++) {
      this._state[i] = this._state[i - 1] ^ (this._state[i - 1] >>> 30);
      this._state[i] = 0x6c078965 * this._state[i] + i;
      this._state[i] = this._state[i] & ((this._state[i] << 32) - 1);
    }
  }

  _generateNumbers() {
    const MT = this._state;
    for (let i = 0; i < 624; i++) {
      let y = MT[i] & 0x80000000;
      y = y + (MT[(i + 1) % 624] & 0x7fffffff);
      MT[i] = MT[(i + 397) % 624] ^ (y >>> 1);
      if ((y % 2) !== 0) {
        MT[i] = MT[i] ^ 0x9908b0df;
      }
    }
  }

  random() {
    if (this._index === 0) {
      this._generateNumbers();
    }

    let y = this._state[this._index];
    y = y ^ (y >>> 11);
    y = y ^ ((y << 7) & 0x9d2c5680);
    y = y ^ ((y << 15) & 0xefc60000);
    y = y ^ (y >>> 18);

    this._index = (this._index + 1) % 624;
    return (y >>> 0) * (1.0 / 4294967296.0);
  }
}

// Exact hashcode from reference random.js
function hashcode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash += (i + 1) * char;
  }
  return hash;
}

// Create seeded RNG matching reference
function rand(seed, offset) {
  return new MersenneTwister(hashcode(seed) + offset);
}

// ============================================================================
// point-stars.js - EXACT copy from reference
// ============================================================================

function generatePointStars(width, height, density, brightness, prng) {
  // Determine the number of stars we're going to render.
  const count = Math.round(width * height * density);
  // Create a byte array for our texture.
  const data = new Uint8Array(width * height * 3);
  // For each star...
  for (let i = 0; i < count; i++) {
    // Select a random position.
    const r = Math.floor(prng() * width * height);
    // Select an intensity from an exponential distribution.
    const c = Math.round(255 * Math.log(1 - prng()) * -brightness);
    // Set a greyscale color with the intensity we chose at the pixel we selected.
    data[r * 3 + 0] = c;
    data[r * 3 + 1] = c;
    data[r * 3 + 2] = c;
  }
  return data;
}

// ============================================================================
// nebula.js - EXACT algorithm from reference (CPU implementation)
// ============================================================================

// Generate noise texture - the reference uses Math.random(), but we'll seed it
// for determinism. The reference generates random 2D unit vectors.
function generateNoiseTexture(size, prng) {
  const array = new Float32Array(size * size * 2);
  for (let i = 0; i < size * size; i++) {
    // vec2.random([]) generates a random unit vector
    // It uses Math.random() internally - we use our seeded PRNG
    const angle = prng() * Math.PI * 2;
    array[i * 2 + 0] = Math.cos(angle);
    array[i * 2 + 1] = Math.sin(angle);
  }
  return { data: array, size };
}

// Smootherstep - exact from reference
function smootherstep(a, b, r) {
  r = Math.max(0, Math.min(1, r));
  r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);
  return a + (b - a) * r;
}

// Perlin 2D - exact from reference
function perlin2d(noiseTexture, p) {
  const { data, size } = noiseTexture;

  const p0x = Math.floor(p[0]);
  const p0y = Math.floor(p[1]);
  const p1x = p0x + 1;
  const p1y = p0y;
  const p2x = p0x + 1;
  const p2y = p0y + 1;
  const p3x = p0x;
  const p3y = p0y + 1;

  // Sample gradient vectors from noise texture (with wrapping)
  const getGradient = (x, y) => {
    const tx = ((x % size) + size) % size;
    const ty = ((y % size) + size) % size;
    const idx = (ty * size + tx) * 2;
    return [data[idx], data[idx + 1]];
  };

  const d0 = getGradient(p0x, p0y);
  const d1 = getGradient(p1x, p1y);
  const d2 = getGradient(p2x, p2y);
  const d3 = getGradient(p3x, p3y);

  // Vectors from corners to point
  const p0px = p[0] - p0x;
  const p0py = p[1] - p0y;
  const p1px = p[0] - p1x;
  const p1py = p[1] - p1y;
  const p2px = p[0] - p2x;
  const p2py = p[1] - p2y;
  const p3px = p[0] - p3x;
  const p3py = p[1] - p3y;

  // Dot products
  const dp0 = d0[0] * p0px + d0[1] * p0py;
  const dp1 = d1[0] * p1px + d1[1] * p1py;
  const dp2 = d2[0] * p2px + d2[1] * p2py;
  const dp3 = d3[0] * p3px + d3[1] * p3py;

  // Interpolate
  const fx = p[0] - p0x;
  const fy = p[1] - p0y;
  const m01 = smootherstep(dp0, dp1, fx);
  const m32 = smootherstep(dp3, dp2, fx);
  const m01m32 = smootherstep(m01, m32, fy);

  return m01m32;
}

// Normal noise - exact from reference
function normalNoise(noiseTexture, p) {
  return perlin2d(noiseTexture, p) * 0.5 + 0.5;
}

// Noise function with iterative displacement - exact from reference
function noise(noiseTexture, px, py, offset, inputScale) {
  const p = [px * inputScale + offset[0], py * inputScale + offset[1]];
  const steps = 5;
  let scale = Math.pow(2.0, steps); // 32
  let displace = 0.0;
  for (let i = 0; i < steps; i++) {
    displace = normalNoise(noiseTexture, [p[0] * scale + displace, p[1] * scale + displace]);
    scale *= 0.5;
  }
  return normalNoise(noiseTexture, [p[0] + displace, p[1] + displace]);
}

// ============================================================================
// star.js - EXACT algorithm from reference (CPU implementation)
// ============================================================================

function renderStar(imageData, width, height, scale, center, coreRadius, coreColor, haloColor, haloFalloff) {
  const data = imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      // Convert to WebGL coordinates (Y flipped)
      const glY = height - 1 - y;

      // Distance from center (in normalized coordinates, then scaled)
      // Reference: length(gl_FragCoord.xy - center * resolution) / scale
      const d = Math.sqrt(
        Math.pow(x - center[0] * width, 2) +
        Math.pow(glY - center[1] * height, 2)
      ) / scale;

      if (d <= coreRadius) {
        // Inside core - pure white
        data[idx + 0] = Math.min(255, data[idx + 0] + coreColor[0] * 255);
        data[idx + 1] = Math.min(255, data[idx + 1] + coreColor[1] * 255);
        data[idx + 2] = Math.min(255, data[idx + 2] + coreColor[2] * 255);
      } else {
        // Halo - exponential falloff, exact from reference
        const e = 1.0 - Math.exp(-(d - coreRadius) * haloFalloff);
        // mix(coreColor, haloColor, e), then mix(result, black, e)
        let r = coreColor[0] + (haloColor[0] - coreColor[0]) * e;
        let g = coreColor[1] + (haloColor[1] - coreColor[1]) * e;
        let b = coreColor[2] + (haloColor[2] - coreColor[2]) * e;
        r = r * (1 - e);
        g = g * (1 - e);
        b = b * (1 - e);
        // Add to existing
        data[idx + 0] = Math.min(255, data[idx + 0] + r * 255);
        data[idx + 1] = Math.min(255, data[idx + 1] + g * 255);
        data[idx + 2] = Math.min(255, data[idx + 2] + b * 255);
      }
    }
  }
}

// ============================================================================
// scene.js - EXACT orchestration from reference
// ============================================================================

function renderScene(width, height, seed) {
  console.log(`Rendering ${width}x${height} with seed "${seed}"`);
  console.log(`Hashcode: ${hashcode(seed)}`);

  // Create image buffer (RGB)
  let imageData = new Uint8Array(width * height * 3);

  // Scale calculation - exact from reference (shortScale = false by default)
  const scale = Math.max(width, height);
  console.log(`Scale: ${scale}`);

  // === Point Stars ===
  console.log('\n=== Point Stars ===');
  let rng = rand(seed, 0);
  const pointStars = generatePointStars(width, height, 0.05, 0.125, rng.random.bind(rng));
  // Copy point stars to image
  for (let i = 0; i < imageData.length; i++) {
    imageData[i] = pointStars[i];
  }
  console.log('Point stars generated');

  // === Nebulae ===
  console.log('\n=== Nebulae ===');
  rng = rand(seed, 1000);
  const nebulaCount = Math.round(rng.random() * 4 + 1);
  console.log(`Nebula count: ${nebulaCount}`);

  // Generate noise texture for nebulae (seeded for determinism)
  // The reference uses Math.random() here, but we seed it from the same seed
  const noiseRng = rand(seed, 4000);  // Different offset for noise
  const noiseTexture = generateNoiseTexture(256, noiseRng.random.bind(noiseRng));

  for (let i = 0; i < nebulaCount; i++) {
    const offset = [rng.random() * 100, rng.random() * 100];
    const nebulaScale = (rng.random() * 2 + 1) / scale;
    const color = [rng.random(), rng.random(), rng.random()];
    const density = rng.random() * 0.2;
    const falloff = rng.random() * 2.0 + 3.0;

    console.log(`\nNebula ${i}:`);
    console.log(`  offset: [${offset[0].toFixed(4)}, ${offset[1].toFixed(4)}]`);
    console.log(`  scale: ${nebulaScale.toFixed(6)}`);
    console.log(`  color: [${color[0].toFixed(4)}, ${color[1].toFixed(4)}, ${color[2].toFixed(4)}]`);
    console.log(`  density: ${density.toFixed(4)}`);
    console.log(`  falloff: ${falloff.toFixed(4)}`);

    // Apply nebula to image - exact algorithm from reference
    // Note: Reference uses WebGL where Y=0 is at bottom, canvas has Y=0 at top
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        // Convert to WebGL coordinates (Y flipped)
        const glY = height - 1 - y;

        // Noise at this pixel - exact from reference (using gl_FragCoord.xy)
        let n = noise(noiseTexture, x, glY, offset, nebulaScale);
        n = Math.pow(n + density, falloff);

        // Mix with nebula color - exact from reference
        const srcR = imageData[idx + 0] / 255;
        const srcG = imageData[idx + 1] / 255;
        const srcB = imageData[idx + 2] / 255;

        imageData[idx + 0] = Math.min(255, Math.round((srcR + (color[0] - srcR) * n) * 255));
        imageData[idx + 1] = Math.min(255, Math.round((srcG + (color[1] - srcG) * n) * 255));
        imageData[idx + 2] = Math.min(255, Math.round((srcB + (color[2] - srcB) * n) * 255));
      }
    }
  }

  // === Stars (distant) ===
  console.log('\n=== Stars (distant) ===');
  rng = rand(seed, 2000);
  const starCount = Math.round(rng.random() * 8 + 1);
  console.log(`Star count: ${starCount}`);

  for (let i = 0; i < starCount; i++) {
    const center = [rng.random(), rng.random()];
    const coreRadius = rng.random() * 0.0;  // Note: always 0 for distant stars
    const haloColor = [rng.random(), rng.random(), rng.random()];
    const haloFalloff = rng.random() * 1024 + 32;

    console.log(`\nStar ${i}:`);
    console.log(`  center: [${center[0].toFixed(4)}, ${center[1].toFixed(4)}]`);
    console.log(`  coreRadius: ${coreRadius.toFixed(4)}`);
    console.log(`  haloColor: [${haloColor[0].toFixed(4)}, ${haloColor[1].toFixed(4)}, ${haloColor[2].toFixed(4)}]`);
    console.log(`  haloFalloff: ${haloFalloff.toFixed(4)}`);

    renderStar(imageData, width, height, scale, center, coreRadius, [1, 1, 1], haloColor, haloFalloff);
  }

  // === Sun ===
  console.log('\n=== Sun ===');
  rng = rand(seed, 3000);
  const sunCenter = [rng.random(), rng.random()];
  const sunCoreRadius = rng.random() * 0.025 + 0.025;
  const sunHaloColor = [rng.random(), rng.random(), rng.random()];
  const sunHaloFalloff = rng.random() * 32 + 32;

  console.log(`center: [${sunCenter[0].toFixed(4)}, ${sunCenter[1].toFixed(4)}]`);
  console.log(`coreRadius: ${sunCoreRadius.toFixed(4)}`);
  console.log(`haloColor: [${sunHaloColor[0].toFixed(4)}, ${sunHaloColor[1].toFixed(4)}, ${sunHaloColor[2].toFixed(4)}]`);
  console.log(`haloFalloff: ${sunHaloFalloff.toFixed(4)}`);

  renderStar(imageData, width, height, scale, sunCenter, sunCoreRadius, [1, 1, 1], sunHaloColor, sunHaloFalloff);

  return imageData;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const width = 480;
  const height = 480;
  const seed = '7alzyiphy3k0';

  // Render the scene
  const imageData = renderScene(width, height, seed);

  // Create canvas and draw image
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const canvasImageData = ctx.createImageData(width, height);

  // Convert RGB to RGBA
  for (let i = 0; i < width * height; i++) {
    canvasImageData.data[i * 4 + 0] = imageData[i * 3 + 0];
    canvasImageData.data[i * 4 + 1] = imageData[i * 3 + 1];
    canvasImageData.data[i * 4 + 2] = imageData[i * 3 + 2];
    canvasImageData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(canvasImageData, 0, 0);

  // Save to PNG
  const outputPath = join(OUTPUT_DIR, 'space2d-reproduction.png');
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);

  console.log(`\nSaved to: ${outputPath}`);
}

main().catch(console.error);
