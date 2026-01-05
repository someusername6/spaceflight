/**
 * Target Camera - Renders a small view of the currently targeted ship.
 * Uses WebGLRenderTarget for picture-in-picture effect.
 */

import * as THREE from 'three';
import type { Targeting } from '../../components/targeting';
import type { Transform } from '../../components/transform';
import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/** Target camera display dimensions */
const CAMERA_WIDTH = 160;
const CAMERA_HEIGHT = 120;

/** Camera offset from target (behind and above) */
const CAMERA_DISTANCE = 20;
const CAMERA_HEIGHT_OFFSET = 5;

/** Target camera state */
export interface TargetCamera {
  camera: THREE.PerspectiveCamera;
  renderTarget: THREE.WebGLRenderTarget;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pixelBuffer: Uint8Array;
}

// Reusable vectors for camera positioning
const cameraPos = new THREE.Vector3();
const targetPos = new THREE.Vector3();
const offset = new THREE.Vector3();

/** Create target camera system */
export function createTargetCamera(): TargetCamera {
  // Create a camera with narrow FOV for target view
  const camera = new THREE.PerspectiveCamera(
    40, // Narrow FOV for less distortion
    CAMERA_WIDTH / CAMERA_HEIGHT,
    1,
    10000, // Must match main camera for skybox to render
  );

  // Create render target
  const renderTarget = new THREE.WebGLRenderTarget(
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    },
  );

  // Create canvas for display in HUD
  const canvas = document.createElement('canvas');
  canvas.width = CAMERA_WIDTH;
  canvas.height = CAMERA_HEIGHT;
  canvas.className = 'target-camera-canvas';

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for target camera canvas');
  }

  // Buffer to read pixels from render target
  const pixelBuffer = new Uint8Array(CAMERA_WIDTH * CAMERA_HEIGHT * 4);

  return {
    camera,
    renderTarget,
    canvas,
    ctx,
    pixelBuffer,
  };
}

/** Update and render target camera */
export function updateTargetCamera(
  targetCamera: TargetCamera,
  webglRenderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  world: World,
  player: Entity | undefined,
): void {
  if (player === undefined) {
    clearTargetCamera(targetCamera);
    return;
  }

  const targeting = getComponent<Targeting>(world, player, 'targeting');
  const target = targeting?.currentTarget;

  if (target === undefined) {
    clearTargetCamera(targetCamera);
    return;
  }

  const targetTransform = getComponent<Transform>(world, target, 'transform');
  if (!targetTransform) {
    clearTargetCamera(targetCamera);
    return;
  }

  // Position camera behind and above target
  targetPos.copy(targetTransform.position);

  // Get target's forward direction to position camera behind it
  offset.set(0, CAMERA_HEIGHT_OFFSET, CAMERA_DISTANCE);
  offset.applyQuaternion(targetTransform.rotation);
  cameraPos.copy(targetPos).add(offset);

  targetCamera.camera.position.copy(cameraPos);
  targetCamera.camera.lookAt(targetPos);

  // Render to target (must explicitly clear for skybox to render)
  const currentRenderTarget = webglRenderer.getRenderTarget();
  webglRenderer.setRenderTarget(targetCamera.renderTarget);
  webglRenderer.clear();
  webglRenderer.render(scene, targetCamera.camera);
  webglRenderer.setRenderTarget(currentRenderTarget);

  // Read pixels and draw to canvas
  webglRenderer.readRenderTargetPixels(
    targetCamera.renderTarget,
    0,
    0,
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
    targetCamera.pixelBuffer,
  );

  // Create ImageData and draw (flip vertically since WebGL is bottom-up)
  const imageData = targetCamera.ctx.createImageData(
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
  );
  const src = targetCamera.pixelBuffer;
  const dst = imageData.data;
  for (let y = 0; y < CAMERA_HEIGHT; y++) {
    const srcRow = (CAMERA_HEIGHT - 1 - y) * CAMERA_WIDTH * 4;
    const dstRow = y * CAMERA_WIDTH * 4;
    for (let x = 0; x < CAMERA_WIDTH * 4; x++) {
      dst[dstRow + x] = src[srcRow + x] as number;
    }
  }
  targetCamera.ctx.putImageData(imageData, 0, 0);
}

/** Clear the target camera display */
function clearTargetCamera(targetCamera: TargetCamera): void {
  targetCamera.ctx.fillStyle = '#111';
  targetCamera.ctx.fillRect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT);
  targetCamera.ctx.fillStyle = '#333';
  targetCamera.ctx.font = '12px monospace';
  targetCamera.ctx.textAlign = 'center';
  targetCamera.ctx.fillText(
    'NO TARGET',
    CAMERA_WIDTH / 2,
    CAMERA_HEIGHT / 2 + 4,
  );
}

/** Get CSS styles for target camera */
export function getTargetCameraStyles(): string {
  return `
    .target-camera-canvas {
      width: 160px;
      height: 120px;
      border: 1px solid #600;
      margin-bottom: 8px;
      image-rendering: pixelated;
    }
    .target-stats.has-target .target-camera-canvas {
      border-color: #f00;
    }
  `;
}

/** Dispose target camera resources */
export function disposeTargetCamera(targetCamera: TargetCamera): void {
  targetCamera.renderTarget.dispose();
}
