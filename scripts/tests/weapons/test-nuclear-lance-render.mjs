/**
 * Nuclear Lance Renderer Tests - verifies the renderer creates effects correctly.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import {
  createNuclearLanceRenderer,
  updateNuclearLanceRenderer,
} from '../../../src/rendering/beam-effects/nuclear-lance.ts';

// Mock scene that tracks what's added
function createMockScene() {
  const objects = [];
  return {
    add: (obj) => {
      objects.push(obj);
    },
    remove: (obj) => {
      const idx = objects.indexOf(obj);
      if (idx >= 0) objects.splice(idx, 1);
    },
    objects,
  };
}

// Create a minimal world with beam data
function createWorld(gameTime, beamsMap) {
  return {
    systemState: {
      gameTime,
      beams: {
        activeBeams: beamsMap,
      },
    },
  };
}

describe('Nuclear Lance Renderer Integration Tests', () => {
  it('createNuclearLanceRenderer creates renderer state', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);

    assert.ok(renderer.shots instanceof Map, 'shots should be a Map');
    assert.ok(renderer.sphereGeometry, 'sphereGeometry should exist');
    assert.ok(renderer.ringGeometry, 'ringGeometry should exist');
  });

  it('updateNuclearLanceRenderer does nothing with no beams', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);
    const world = createWorld(0, new Map());

    updateNuclearLanceRenderer(renderer, scene, world);

    assert.ok(renderer.shots.size === 0, 'No shots should be created');
    assert.ok(scene.objects.length === 0, 'No objects should be added');
  });

  it('updateNuclearLanceRenderer creates effects for Nuclear Lance', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);

    // Create a Nuclear Lance beam like beam-instant.ts does
    const entityId = 1;
    const beamsMap = new Map();
    beamsMap.set(entityId, [
      {
        weaponName: 'Nuclear Lance',
        weaponIndex: 0,
        origin: new THREE.Vector3(0, 0, 0),
        hitPoint: new THREE.Vector3(100, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0.95, 0.8),
        active: false, // Set to false after firing
        fadeStartTime: 1.0,
        lanceFireTime: 1.0, // Key: this triggers detection
        beamWidth: 1,
        isInstantBeam: true,
      },
    ]);

    const world = createWorld(1.0, beamsMap);

    updateNuclearLanceRenderer(renderer, scene, world);

    // Should have created a shot
    assert.ok(
      renderer.shots.size === 1,
      `Expected 1 shot, got ${renderer.shots.size}`,
    );

    // Should have added objects to scene:
    // - Origin flash mesh (1)
    // - Origin light (1)
    // - Beam core mesh (1)
    // - Beam glow mesh (1)
    // - Impact flash mesh (1)
    // - Impact ring mesh (1)
    // - Impact light (1)
    // - Impact particles (1)
    // Total: 8 objects
    assert.ok(
      scene.objects.length === 8,
      `Expected 8 objects in scene, got ${scene.objects.length}`,
    );
  });

  it('updateNuclearLanceRenderer updates effects over time', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);

    const entityId = 1;
    const beamsMap = new Map();
    beamsMap.set(entityId, [
      {
        weaponName: 'Nuclear Lance',
        weaponIndex: 0,
        origin: new THREE.Vector3(0, 0, 0),
        hitPoint: new THREE.Vector3(100, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0.95, 0.8),
        active: false,
        fadeStartTime: 0,
        lanceFireTime: 0,
        beamWidth: 1,
        isInstantBeam: true,
      },
    ]);

    // Frame 1: Create effects at t=0
    let world = createWorld(0, beamsMap);
    updateNuclearLanceRenderer(renderer, scene, world);
    assert.ok(renderer.shots.size === 1, 'Shot should be created');

    // Get the origin flash to check opacity
    const originFlash = renderer.originFlashMeshes.get('1-0');
    assert.ok(originFlash, 'Origin flash should exist');
    const initialOpacity = originFlash.material.opacity;

    // Frame 2: Update at t=0.5 (half through 1.5s duration)
    world = createWorld(0.5, beamsMap);
    updateNuclearLanceRenderer(renderer, scene, world);

    // Opacity should have decreased
    assert.ok(
      originFlash.material.opacity < initialOpacity,
      `Opacity should decrease over time (was ${initialOpacity}, now ${originFlash.material.opacity})`,
    );
  });

  it('updateNuclearLanceRenderer removes effects after duration', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);

    const entityId = 1;
    const beamsMap = new Map();
    beamsMap.set(entityId, [
      {
        weaponName: 'Nuclear Lance',
        weaponIndex: 0,
        origin: new THREE.Vector3(0, 0, 0),
        hitPoint: new THREE.Vector3(100, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0.95, 0.8),
        active: false,
        fadeStartTime: 0,
        lanceFireTime: 0,
        beamWidth: 1,
        isInstantBeam: true,
      },
    ]);

    // Frame 1: Create effects at t=0
    let world = createWorld(0, beamsMap);
    updateNuclearLanceRenderer(renderer, scene, world);
    const initialObjectCount = scene.objects.length;
    assert.ok(
      initialObjectCount === 8,
      `Expected 8 objects, got ${initialObjectCount}`,
    );

    // Frame 2: Update at t=2.0 (past all durations: max is 1.5s)
    world = createWorld(2.0, beamsMap);
    updateNuclearLanceRenderer(renderer, scene, world);

    // All effects should be removed
    assert.ok(
      renderer.shots.size === 0,
      `Shot should be removed after duration, got ${renderer.shots.size}`,
    );
    assert.ok(
      scene.objects.length === 0,
      `All objects should be removed, got ${scene.objects.length}`,
    );
  });

  it('updateNuclearLanceRenderer ignores non-Nuclear Lance beams', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);

    const entityId = 1;
    const beamsMap = new Map();
    beamsMap.set(entityId, [
      {
        weaponName: 'Red Laser', // Different weapon
        weaponIndex: 0,
        origin: new THREE.Vector3(0, 0, 0),
        hitPoint: new THREE.Vector3(100, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0, 0),
        active: true,
        fadeStartTime: null,
        lanceFireTime: 1.0,
        beamWidth: 1,
      },
    ]);

    const world = createWorld(1.0, beamsMap);
    updateNuclearLanceRenderer(renderer, scene, world);

    assert.ok(
      renderer.shots.size === 0,
      'Should not create shot for non-Nuclear Lance',
    );
    assert.ok(
      scene.objects.length === 0,
      'Should not add objects for non-Nuclear Lance',
    );
  });

  it('updateNuclearLanceRenderer handles multiple shots', () => {
    const scene = createMockScene();
    const renderer = createNuclearLanceRenderer(scene);

    const beamsMap = new Map();
    // Entity 1 fires
    beamsMap.set(1, [
      {
        weaponName: 'Nuclear Lance',
        weaponIndex: 0,
        origin: new THREE.Vector3(0, 0, 0),
        hitPoint: new THREE.Vector3(100, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0.95, 0.8),
        active: false,
        fadeStartTime: 0,
        lanceFireTime: 0,
        beamWidth: 1,
        isInstantBeam: true,
      },
    ]);
    // Entity 2 fires
    beamsMap.set(2, [
      {
        weaponName: 'Nuclear Lance',
        weaponIndex: 0,
        origin: new THREE.Vector3(50, 0, 0),
        hitPoint: new THREE.Vector3(150, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0.95, 0.8),
        active: false,
        fadeStartTime: 0,
        lanceFireTime: 0,
        beamWidth: 1,
        isInstantBeam: true,
      },
    ]);

    const world = createWorld(0, beamsMap);
    updateNuclearLanceRenderer(renderer, scene, world);

    assert.ok(
      renderer.shots.size === 2,
      `Expected 2 shots, got ${renderer.shots.size}`,
    );
    assert.ok(
      scene.objects.length === 16,
      `Expected 16 objects (8 per shot), got ${scene.objects.length}`,
    );
  });
});
