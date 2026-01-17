/**
 * Hyperspace Jump Effect Shaders - GLSL shaders for jump animation.
 *
 * The effect has three phases:
 * - Phase 1 (0-0.4): Slight compression perpendicular to jump direction
 * - Phase 2 (0.4-0.8): Stretch along jump direction (front stretches more)
 * - Phase 3 (0.8-1.0): Extreme elongation + spiral distortion
 */

export const jumpVertexShader = /* glsl */ `
uniform float uJumpProgress;
uniform vec3 uJumpDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDistortionAmount;

void main() {
  vec3 pos = position;
  vec3 norm = normal;

  // Calculate how far along jump direction this vertex is
  float alongJump = dot(pos, uJumpDirection);

  // Phase 1 (0-0.4): Compression perpendicular to jump direction
  float phase1 = smoothstep(0.0, 0.4, uJumpProgress);
  float compressionAmount = phase1 * 0.3;

  // Project position onto plane perpendicular to jump direction
  vec3 perpComponent = pos - uJumpDirection * alongJump;
  pos = pos - perpComponent * compressionAmount;

  // Phase 2 (0.4-0.8): Stretch along jump direction
  float phase2 = smoothstep(0.4, 0.8, uJumpProgress);

  // Front stretches more (vertices ahead of center stretch further)
  float stretchBias = max(0.0, alongJump) * 2.0 + 1.0;
  float stretchAmount = phase2 * stretchBias * 3.0;
  pos += uJumpDirection * alongJump * stretchAmount;

  // Phase 3 (0.8-1.0): Extreme elongation + spiral
  float phase3 = smoothstep(0.8, 1.0, uJumpProgress);

  // Extreme stretch
  float extremeStretch = phase3 * stretchBias * 10.0;
  pos += uJumpDirection * alongJump * extremeStretch;

  // Spiral distortion in final phase
  float spiralAngle = phase3 * alongJump * 3.14159 * 2.0 + uTime * 10.0;
  float spiralAmount = phase3 * 0.5;
  vec3 spiralOffset = vec3(
    cos(spiralAngle) * perpComponent.x - sin(spiralAngle) * perpComponent.z,
    perpComponent.y,
    sin(spiralAngle) * perpComponent.x + cos(spiralAngle) * perpComponent.z
  ) - perpComponent;
  pos += spiralOffset * spiralAmount;

  // Store distortion for fragment shader
  vDistortionAmount = phase2 + phase3 * 2.0;

  vNormal = normalMatrix * norm;
  vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const jumpFragmentShader = /* glsl */ `
uniform float uJumpProgress;
uniform vec3 uBaseColor;
uniform vec3 uEnergyColor;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDistortionAmount;

// Simple noise function for dissolve effect
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec3 normal = normalize(vNormal);

  // Fresnel effect - edges glow more
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - abs(dot(normal, viewDir));
  fresnel = pow(fresnel, 2.0);

  // Base color fades as jump progresses
  float baseFade = 1.0 - smoothstep(0.0, 0.6, uJumpProgress);

  // Energy color intensifies
  float energyIntensity = smoothstep(0.0, 0.4, uJumpProgress);
  energyIntensity += fresnel * (1.0 + vDistortionAmount);

  // Animated pulse
  float pulse = sin(uTime * 20.0 + vPosition.z * 5.0) * 0.5 + 0.5;
  energyIntensity += pulse * smoothstep(0.3, 0.8, uJumpProgress) * 0.3;

  // Mix colors
  vec3 finalColor = mix(uBaseColor * baseFade, uEnergyColor, energyIntensity);

  // Add bright core in final phase
  float coreGlow = smoothstep(0.7, 1.0, uJumpProgress) * (1.0 - fresnel) * 2.0;
  finalColor += vec3(1.0) * coreGlow;

  // Dissolve effect in final phase
  float dissolveThreshold = smoothstep(0.8, 1.0, uJumpProgress);
  float noiseVal = noise(vPosition.xy * 10.0 + uTime * 2.0);
  if (noiseVal < dissolveThreshold * 0.8) {
    discard;
  }

  // Edge glow on dissolve
  float edgeDist = noiseVal - dissolveThreshold * 0.8;
  if (edgeDist < 0.1 && dissolveThreshold > 0.0) {
    finalColor += uEnergyColor * (1.0 - edgeDist / 0.1) * 2.0;
  }

  // Overall fade at the very end
  float alpha = 1.0 - smoothstep(0.95, 1.0, uJumpProgress);

  gl_FragColor = vec4(finalColor, alpha);
}
`;
