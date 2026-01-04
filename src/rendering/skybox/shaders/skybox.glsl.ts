/**
 * Skybox Shaders - GLSL shaders for nebulae, halos, and sun rendering.
 */

import { noise4DGLSL } from './noise4d.glsl';

export const skyboxVertexShader = /* glsl */ `
varying vec3 vPosition;
void main() {
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyboxFragmentShader = /* glsl */ `
precision highp float;
varying vec3 vPosition;
uniform vec3 uNebulaColors[5], uNebulaOffsets[5];
uniform float uNebulaScales[5], uNebulaIntensities[5], uNebulaFalloffs[5];
uniform int uNebulaCount;
uniform vec3 uHaloDirections[9], uHaloColors[9];
uniform float uHaloSizes[9], uHaloFalloffs[9];
uniform int uHaloCount;
uniform vec3 uSunDirection, uSunColor;
uniform float uSunSize, uSunFalloff;

${noise4DGLSL}

float noise(vec3 p) {
  return 0.5 * cnoise(vec4(p, 0.0)) + 0.5;
}

float nebula(vec3 p) {
  float scale = 64.0; vec3 displace = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    displace = vec3(noise(p.xyz * scale + displace), noise(p.yzx * scale + displace), noise(p.zxy * scale + displace));
    scale *= 0.5;
  }
  return noise(p * scale + displace);
}

void main() {
  vec3 dir = normalize(vPosition);
  vec3 color = vec3(0.0);

  for (int i = 0; i < 5; i++) { // Nebulae
    if (i >= uNebulaCount) break;
    vec3 posn = dir * uNebulaScales[i];
    float c = min(1.0, nebula(posn + uNebulaOffsets[i]) * uNebulaIntensities[i]);
    color += uNebulaColors[i] * pow(c, uNebulaFalloffs[i]);
  }
  for (int i = 0; i < 9; i++) { // Star halos
    if (i >= uHaloCount) break;
    float d = 1.0 - clamp(dot(dir, uHaloDirections[i]), 0.0, 1.0);
    color += uHaloColors[i] * exp(-(d - uHaloSizes[i]) * uHaloFalloffs[i]);
  }
  // Sun: sharp disc with anti-aliased edge + tight halo
  float sunDot = clamp(dot(dir, uSunDirection), 0.0, 1.0);
  float edge = 1.0 - uSunSize;
  float sunDisc = smoothstep(edge - 0.0003, edge, sunDot); // Tight AA edge
  float sunHalo = pow(sunDot, uSunFalloff) * 0.25; // Small glow
  float sunC = max(sunDisc, sunHalo);
  vec3 sunColor = mix(uSunColor, vec3(1.0), sunDisc); // White core
  color += sunColor * sunC;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const starVertexShader = /* glsl */ `
attribute vec3 color;
varying vec3 vColor;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vColor = color;
}
`;

export const starFragmentShader = /* glsl */ `
precision highp float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;
