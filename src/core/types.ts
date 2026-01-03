/**
 * Core type definitions shared across the game.
 */

// Three.js vector/quaternion types (re-exported for convenience)
export { Euler, Quaternion, Vector3 } from 'three';

/** Entity is just a numeric ID */
export type Entity = number;

/** All components must have a type tag for identification */
export interface ComponentBase {
  readonly type: string;
}

/** System function signature - pure function operating on world state */
export type SystemFn = (world: World, dt: number) => void;

/** Component type names for querying */
export type ComponentType = string;

/** Map of component type to component data for an entity */
export type ComponentMap = Map<ComponentType, ComponentBase>;

/** Mission result values */
export enum MissionResult {
  InProgress = 'inProgress',
  Victory = 'victory',
  Defeat = 'defeat',
}

/** System-specific state stored in World (not module-level) */
export interface SystemState {
  /** Shared game time (used by weapons, shields, damage) */
  gameTime: number;
  /** Weapon system state */
  weapons: {
    prevInput: {
      cycleWeaponNext: boolean;
      cycleWeaponPrev: boolean;
      fireSecondary: boolean;
      toggleLink: boolean;
    };
  };
  /** Beam system state - stores active beams for renderer */
  beams: {
    activeBeams: Map<Entity, import('../systems/beams').ActiveBeam[]>;
  };
  /** Mission system state */
  mission: {
    result: MissionResult;
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
  /** Seeded PRNG for deterministic randomness */
  prng: import('../core/prng').PRNGState;
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
  cycleWeaponNext: boolean;
  cycleWeaponPrev: boolean;
  cycleTargetNext: boolean;
  cycleTargetPrev: boolean;
  targetNearest: boolean;
  fireDecoy: boolean;
  toggleLink: boolean;
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
    cycleWeaponNext: false,
    cycleWeaponPrev: false,
    cycleTargetNext: false,
    cycleTargetPrev: false,
    targetNearest: false,
    fireDecoy: false,
    toggleLink: false,
  };
}
