/**
 * Core type definitions shared across the game.
 */

// Three.js types used in interfaces (import first for use, then re-export)
import type { Color, Vector3 as Vec3 } from 'three';

export { Euler, Quaternion, Vector3 } from 'three';

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

/**
 * Component type names for querying.
 * Note: Using `string` instead of a literal union type is a known limitation.
 * A future improvement could define: type ComponentType = 'transform' | 'health' | ...
 * This would provide compile-time checking but requires updating all component files.
 */
export type ComponentType = string;

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

/** System-specific state stored in World (not module-level) */
export interface SystemState {
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
  };
  /** Ship identity state - callsign counters per prefix */
  shipIdentity: {
    callsignCounters: Record<string, number>;
  };
  /** Projectile hit queue - systems add, rendering consumes */
  projectileHits: {
    pending: Array<{
      x: number;
      y: number;
      z: number;
      category: 'energy' | 'ballistic';
      /** Optional RGB color override (for beam weapons) */
      color?: { r: number; g: number; b: number };
    }>;
  };
  /** Object pool indices - reset each frame */
  pools: {
    beamWeapon: number;
    collidable: number;
    targetCollector: number;
  };
  /** Combat statistics for balance analysis (optional, only tracked in simulation) */
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
