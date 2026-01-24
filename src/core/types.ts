/**
 * Core type definitions shared across the game.
 */

// Three.js types used in interfaces (import first for use, then re-export)
import type { Color, Vector3 as Vec3 } from 'three';

import type { ComponentType } from './component-registry';

export { Euler, Quaternion, Vector3 } from 'three';

// Re-export component registry types for consumers
export type { ComponentRegistry, ComponentType } from './component-registry';

/** Entity is just a numeric ID */
export type Entity = number;

/** Sentinel value for "no entity" (used when entity parameter is optional) */
export const NO_ENTITY = -1 as Entity;

/** All components must have a type tag for identification */
export interface ComponentBase {
  readonly type: string;
}

/** System function signature - pure function operating on world state */
export type SystemFn = (world: World, dt: number) => void;

/** Map of component type to component data for an entity */
export type ComponentMap = Map<ComponentType, ComponentBase>;

/** Mission result values */
export enum MissionResult {
  InProgress = 'inProgress',
  Victory = 'victory',
  Defeat = 'defeat',
}

/** Active beam state for rendering (defined here to avoid circular dependencies) */
export interface ActiveBeam {
  origin: Vec3;
  direction: Vec3;
  hitPoint: Vec3 | null;
  color: Color;
  active: boolean;
  weaponIndex: number;
  isPulseBeam?: boolean;
  pulseActive?: boolean;
  lastPulseTime?: number;
  isLance?: boolean;
  lanceFireTime?: number;
  isTorch?: boolean;
  weaponName?: string;
  beamWidth?: number;
  /** When fadeout started (null = not fading, beam system manages this) */
  fadeStartTime: number | null;
  /** Last time a hit effect was queued (for throttling continuous beams) */
  lastHitEffectTime?: number;
  /** Instant beam - fires once on press, damages all in path */
  isInstantBeam?: boolean;
  /** Last time this instant beam fired (for cooldown tracking) */
  lastInstantFireTime?: number;
}

/**
 * System-specific state stored in World (not module-level).
 *
 * ## Field Categories for Multiplayer Determinism
 *
 * **Simulation-critical fields** - Must be identical across all clients:
 * - gameTime, weapons, targeting, flightAssist, beams, mission, shipIdentity, pools
 * - These fields affect game logic and must evolve identically on all machines
 *
 * **Transient/local fields** - Do not affect simulation determinism:
 * - projectileHits, muzzleFlashes: Visual effect queues (rendering consumes)
 * - combatStats, matchStats: Statistics/analytics (read at mission end for UI)
 * - inputRecorder: Input capture for replays (write-only, doesn't affect sim)
 */
export interface SystemState {
  // ============================================================================
  // SIMULATION-CRITICAL FIELDS (must be identical across all clients)
  // ============================================================================

  /** Shared game time (used by weapons, shields, damage) */
  gameTime: number;
  /** Weapon system state */
  weapons: {
    prevInput: {
      cyclePrimary: boolean;
      cycleSecondary: boolean;
      fireSecondary: boolean;
      launchDecoy: boolean;
    };
    lastDecoyFireTime: number;
  };
  /** Targeting system state */
  targeting: {
    prevInput: {
      cycleTargetNext: boolean;
      cycleTargetPrev: boolean;
      targetNearest: boolean;
    };
  };
  /** Player flight assist state */
  flightAssist: {
    prevInput: {
      toggleMatchSpeed: boolean;
    };
  };
  /** Beam system state - stores active beams for renderer */
  beams: {
    activeBeams: Map<Entity, ActiveBeam[]>;
    /** Track previous fire state per entity for edge-triggered instant beams */
    prevFireState: Map<Entity, boolean>;
  };
  /** Mission system state */
  mission: {
    result: MissionResult;
    /** Mission type - determines win/lose condition handling */
    missionType:
      | 'elimination'
      | 'escort'
      | 'station-defense'
      | 'ambush'
      | 'attack-station';
  };
  /** Ship identity state - callsign counters per prefix */
  shipIdentity: {
    callsignCounters: Record<string, number>;
  };
  // Note: projectileHits and muzzleFlashes are visual effect queues.
  // They're populated by simulation but consumed by rendering - safe to diverge.

  /** Projectile hit queue - systems add, rendering consumes (visual only) */
  projectileHits: {
    pending: Array<{
      x: number;
      y: number;
      z: number;
      category: 'energy' | 'ballistic';
      /** Optional RGB color override (for beam weapons) */
      color?: { r: number; g: number; b: number };
      /** Game time when created - renderer skips stale items (e.g., after seeking) */
      gameTime: number;
    }>;
  };
  /** Muzzle flash queue - weapon spawning adds, rendering consumes (visual only) */
  muzzleFlashes: {
    pending: Array<{
      /** Entity that fired (for interpolated position tracking) */
      entity: Entity;
      /** Local offset from entity origin (in entity's local space) */
      localOffset: { x: number; y: number; z: number };
      weaponName: string;
      /** Game time when created - renderer skips stale items (e.g., after seeking) */
      gameTime: number;
    }>;
  };
  /** Object pool indices - reset each frame */
  pools: {
    beamWeapon: number;
    collidable: number;
    targetCollector: number;
  };

  // ============================================================================
  // TRANSIENT/LOCAL FIELDS (do not affect simulation determinism)
  // ============================================================================

  /** Input recording state (null if not recording) - write-only, doesn't affect sim */
  inputRecorder: import('../input/input-recorder').InputRecorder | null;
  /** Combat statistics for balance analysis (optional, read at mission end for UI) */
  combatStats?: {
    /** Shots fired by weapon name */
    shotsFired: Record<string, number>;
    /** Shots that hit targets by weapon name */
    shotsHit: Record<string, number>;
    /** Damage dealt by weapon name */
    damageDealt: Record<string, number>;
    /** Shrapnel pieces that hit targets (for flak) */
    shrapnelHit: Record<string, number>;
    /** Total shrapnel projectiles spawned */
    shrapnelSpawned: number;
    /** Missiles fired by type */
    missilesFired: Record<string, number>;
    /** Missiles that hit targets */
    missilesHit: Record<string, number>;
    /** Damage dealt by missiles */
    missileDamage: Record<string, number>;
    /** Missiles that expired (ran out of range) */
    missilesExpired: number;
    /** Missiles that collided with owner */
    missilesHitOwner: number;
    /** Missiles seduced by decoys */
    missilesSeduced: number;
    /** Beam damage dealt (continuous weapons) */
    beamDamage: Record<string, number>;
    /** Decoys launched */
    decoysLaunched: number;
    /** Decoys that successfully seduced a missile */
    decoysSuccessful: number;
  };
  /** Match statistics for debrief screen (per-ship stats, assists, kills) */
  matchStats?: {
    /** Track who damaged each ship (for assist calculation) */
    damageSources: Map<Entity, Set<Entity>>;
    /** Track last damage source for each ship (for kill attribution) */
    lastDamageSource: Map<Entity, Entity>;
    /** Stats for destroyed ships (preserved after entity removal) */
    destroyedShips: import('../components/combat-stats').DestroyedShipRecord[];
    /** All destroyed ships for salvage calculation (enemies and allies) */
    salvageableShips: import('../components/combat-stats').SalvageableShip[];
    /** Mission start time (gameTime when mission started) */
    missionStartTime: number;
    /** Mission end time (gameTime when mission ended) */
    missionEndTime: number;
  };
}

/** Forward declaration - full definition in ecs.ts */
export interface World {
  entities: Set<Entity>;
  components: Map<Entity, ComponentMap>;
  nextEntityId: Entity;
  toRemove: Set<Entity>;
  /** System-specific state (replaces module-level variables) */
  systemState: SystemState;
  /** Seeded PRNG for deterministic randomness (simulation only) */
  prng: import('../core/prng').PRNGState;
  /** Separate PRNG for rendering effects (does not affect simulation determinism) */
  renderPrng: import('../core/prng').PRNGState;
  /** Override autoaim setting during replay (undefined = use game settings) */
  replayAutoaim?: number;
}

/** Team/faction identifiers */
export enum Faction {
  Player = 0,
  Enemy = 1,
  Neutral = 2,
}

/** Game state for the main loop */
export enum GameState {
  Loading = 'loading',
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  Victory = 'victory',
  Defeat = 'defeat',
}

/** Input intent flags set by input system, read by other systems */
export interface InputState {
  // Movement
  pitchUp: boolean;
  pitchDown: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  accelerate: boolean;
  decelerate: boolean;
  afterburner: boolean;

  // Combat
  firePrimary: boolean;
  fireSecondary: boolean;
  launchDecoy: boolean;
  cyclePrimary: boolean;
  cycleSecondary: boolean;
  cycleTargetNext: boolean;
  cycleTargetPrev: boolean;
  targetNearest: boolean;
  toggleMatchSpeed: boolean;
}

/** Creates default input state with all flags false */
export function createInputState(): InputState {
  return {
    pitchUp: false,
    pitchDown: false,
    yawLeft: false,
    yawRight: false,
    rollLeft: false,
    rollRight: false,
    accelerate: false,
    decelerate: false,
    afterburner: false,
    firePrimary: false,
    fireSecondary: false,
    launchDecoy: false,
    cyclePrimary: false,
    cycleSecondary: false,
    cycleTargetNext: false,
    cycleTargetPrev: false,
    targetNearest: false,
    toggleMatchSpeed: false,
  };
}
