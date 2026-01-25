/**
 * Component Serialization Tests - Round-trip tests for all component types.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { AIState, createAIControlled } from '../../../src/components/ai.ts';
import { createAimError } from '../../../src/components/aim-error.ts';
import { createCombatStats } from '../../../src/components/combat-stats.ts';
import { createConvoyAutopilot } from '../../../src/components/convoy.ts';
import { createExplosion } from '../../../src/components/explosion.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createHullCollider } from '../../../src/components/hull-collider.ts';
import {
  createMissile,
  createSecondaryWeaponFromDef,
} from '../../../src/components/missile.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  createDecoyWeapon,
  createPrimaryWeapons,
  createSecondaryWeapons,
} from '../../../src/components/weapons.ts';
import { createPRNG } from '../../../src/core/prng.ts';
import {
  deserializeComponent,
  serializeComponent,
} from '../../../src/core/serialization/index.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';

describe('Component Serialization', () => {
  it('Transform round-trip', () => {
    const original = createTransform(10, 20, 30);
    original.rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.type, 'transform');
    assert.strictEqual(restored.position.x, 10);
    assert.strictEqual(restored.position.y, 20);
    assert.strictEqual(restored.position.z, 30);
    assert.ok(Math.abs(restored.rotation.y - original.rotation.y) < 0.0001);
  });

  it('Physics round-trip', () => {
    const original = createPhysics({
      maxSpeed: 300,
      acceleration: 150,
      drag: 0.8,
      turnRate: 120,
      rollRate: 180,
    });
    original.velocity.set(50, 10, -100);
    original.currentSpeed = 100;
    original.isAfterburning = true;
    original.angularVelocity.set(5, 10, 15);

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.type, 'physics');
    assert.strictEqual(restored.maxSpeed, 300);
    assert.strictEqual(restored.velocity.x, 50);
    assert.strictEqual(restored.isAfterburning, true);
    assert.strictEqual(restored.angularVelocity.z, 15);
  });

  it('Health round-trip with deathDelay', () => {
    const original = createHealth(100, 50);
    original.deathDelay = 0.5;

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.hull, 50);
    assert.strictEqual(restored.maxHull, 100);
    assert.strictEqual(restored.deathDelay, 0.5);
  });

  it('Missile round-trip with resistedDecoys', () => {
    const direction = new THREE.Vector3(0, 0, -1);
    const original = createMissile(
      1,
      2,
      100,
      400,
      90,
      2000,
      direction,
      50,
      false,
      'seeker',
    );
    original.resistedDecoys.add(10);
    original.resistedDecoys.add(20);
    original.resistedDecoys.add(30);

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.type, 'missile');
    assert.strictEqual(restored.owner, 1);
    assert.strictEqual(restored.target, 2);
    assert.ok(restored.resistedDecoys instanceof Set);
    assert.strictEqual(restored.resistedDecoys.size, 3);
    assert.ok(restored.resistedDecoys.has(10));
    assert.ok(restored.resistedDecoys.has(20));
    assert.ok(restored.resistedDecoys.has(30));
  });

  it('AI Controlled round-trip', () => {
    const original = createAIControlled(AI_PROFILES.veteran, 400, 150);
    original.state = AIState.Engage;
    original.target = 5;
    original.stateTimer = 2.5;
    original.behaviorMode = 'convoy-hunter';

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.state, AIState.Engage);
    assert.strictEqual(restored.target, 5);
    assert.strictEqual(restored.stateTimer, 2.5);
    assert.strictEqual(restored.preferredCombatRange, 400);
    assert.strictEqual(restored.fleeDistance, 150);
    assert.strictEqual(restored.behaviorMode, 'convoy-hunter');
  });

  it('AimError round-trip', () => {
    const prng = createPRNG(12345);
    const original = createAimError(prng, AI_PROFILES.regular);
    original.offset.set(0.02, -0.01);
    original.currentBeamDirection.set(0, 0.5, -0.866);

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.type, 'aimError');
    assert.ok(Math.abs(restored.offset.x - 0.02) < 0.0001);
    assert.ok(Math.abs(restored.offset.y - -0.01) < 0.0001);
    assert.ok(Math.abs(restored.currentBeamDirection.y - 0.5) < 0.0001);
  });

  it('CombatStats round-trip with weaponStats Map', () => {
    const original = createCombatStats();
    original.kills = 3;
    original.assists = 5;
    original.damageDealt = 1500;
    original.weaponStats.set('Plasma', {
      weaponName: 'Plasma',
      category: 'projectile',
      shotsFired: 100,
      shotsOnTarget: 60,
      shrapnelHitsOnTarget: 0,
      timeFired: 0,
      timeOnTarget: 0,
      isPulseBeam: false,
      ammoCarried: 0,
      missilesLaunched: 0,
      missilesHit: 0,
      missilesSeduced: 0,
      decoysCarried: 0,
      decoysDeployed: 0,
      missilesSeducedByDecoy: 0,
      damageDealt: 800,
    });

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.kills, 3);
    assert.strictEqual(restored.assists, 5);
    assert.ok(restored.weaponStats instanceof Map);
    assert.ok(restored.weaponStats.has('Plasma'));
    assert.strictEqual(restored.weaponStats.get('Plasma').shotsFired, 100);
    assert.strictEqual(restored.weaponStats.get('Plasma').damageDealt, 800);
  });

  it('Explosion round-trip with Color', () => {
    const color = new THREE.Color(0xff6600);
    const original = createExplosion(10, color, 5, 'nuke');
    original.age = 0.5;

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.type, 'explosion');
    assert.strictEqual(restored.variant, 'nuke');
    assert.strictEqual(restored.sourceEntity, 5);
    assert.ok(restored.color instanceof THREE.Color);
    // Color is normalized to 0-1 range
    assert.ok(Math.abs(restored.color.r - 1) < 0.01);
  });

  it('ConvoyAutopilot round-trip', () => {
    const destination = new THREE.Vector3(1000, 0, -5000);
    const original = createConvoyAutopilot(destination, 500);
    original.input.pitch = 0.5;
    original.input.accelerate = true;

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.destination.x, 1000);
    assert.strictEqual(restored.escapeZoneRadius, 500);
    assert.strictEqual(restored.input.pitch, 0.5);
    assert.strictEqual(restored.input.accelerate, true);
  });

  it('PrimaryWeapons round-trip', () => {
    const original = createPrimaryWeapons([
      { name: 'plasma', size: 2 },
      { name: 'pulse', size: 1 },
    ]);
    original.lastFireTime = 5.5;
    original.linkMode = 1;

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.weapons.length, 2);
    assert.strictEqual(restored.weapons[0].name, 'Plasma');
    assert.strictEqual(restored.weapons[0].bankSize, 2);
    assert.strictEqual(restored.lastFireTime, 5.5);
    assert.strictEqual(restored.linkMode, 1);
  });

  it('SecondaryWeapons round-trip', () => {
    const seeker = createSecondaryWeaponFromDef('seeker', 4);
    const decoy = createDecoyWeapon(2);
    const original = createSecondaryWeapons([seeker, decoy]);
    original.lockTarget = 10;
    original.lockProgress = 0.75;

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.weapons.length, 2);
    assert.strictEqual(restored.lockTarget, 10);
    assert.strictEqual(restored.lockProgress, 0.75);
  });

  it('HullCollider round-trip', () => {
    const planes = [
      { nx: 0, ny: 1, nz: 0, d: 5 },
      { nx: 0, ny: -1, nz: 0, d: 5 },
      { nx: 1, ny: 0, nz: 0, d: 3 },
    ];
    const original = createHullCollider(planes, 10, 500, true);

    const serialized = serializeComponent(original);
    const restored = deserializeComponent(serialized);

    assert.strictEqual(restored.planes.length, 3);
    assert.strictEqual(restored.planes[0].ny, 1);
    assert.strictEqual(restored.boundingRadius, 10);
    assert.strictEqual(restored.mass, 500);
    assert.strictEqual(restored.useHullForWeapons, true);
  });
});
