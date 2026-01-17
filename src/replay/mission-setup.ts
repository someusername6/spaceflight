/**
 * Replay Mission Setup
 *
 * Reconstructs mission state from replay metadata.
 * Unlike launchMission(), this doesn't touch campaign state.
 */

import { Quaternion, Vector3 } from 'three';
import {
  createPrimaryWeaponsFromReplay,
  createSecondaryWeaponsFromReplay,
} from '../campaign/campaign-weapons';
import {
  setFactionBehaviorMode,
  setupEscortMission,
  spawnEscortEnemy,
} from '../campaign/mission/escort-launcher';
import {
  createWaveState,
  initializeFirstWave,
  processWaveTick,
  type WaveState,
} from '../campaign/mission/mission-waves';
import type { Contract, MissionType } from '../campaign/types';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createCollision } from '../components/collision';
import { createCombatStats } from '../components/combat-stats';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createHeat } from '../components/heat';
import {
  createPhysics,
  INITIAL_SPAWN_SPEED,
  setInitialVelocity,
} from '../components/physics';
import { createPlayerControlled } from '../components/player';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import { createShipIdentity } from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import { createTransform } from '../components/transform';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { getProfileForPlaystyle, type ProfileName } from '../data/ai-profiles';
import { SHIP_CLASSES } from '../data/ships';
import { addHullColliderFromClass } from '../factories/ship';
import {
  type EscortMissionState,
  processEscortMissionTick,
} from '../systems/escort-mission';
import { initMatchStats, initWeaponAmmoCounts } from '../systems/stats';
import { getAllMissions } from '../ui/screens/contracts-data';
import type { ReplayShipLoadout, ReplayWingman } from './types';

/**
 * Find mission contract by ID across all sectors.
 * Returns null if not found.
 */
export function findMissionById(missionId: string): Contract | null {
  const allMissions = getAllMissions();
  return allMissions.find((m) => m.id === missionId) ?? null;
}

/**
 * Spawn player ship from replay loadout data.
 * Uses exact weapon configuration from the recorded replay.
 */
function spawnPlayerFromReplayLoadout(
  world: World,
  loadout: ReplayShipLoadout,
  position: Vector3,
  rotation: Quaternion,
): Entity {
  const stats = SHIP_CLASSES[loadout.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${loadout.shipClass}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
      afterburnerHeatRate: stats.afterburnerHeatRate,
      initialSpeed: INITIAL_SPAWN_SPEED,
    }),
  );

  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, rotation, INITIAL_SPAWN_SPEED);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled());
  addComponent(
    world,
    entity,
    createShipIdentity(loadout.shipClass, 'Commander'),
  );
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use exact weapons from replay loadout
  if (loadout.primaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createPrimaryWeaponsFromReplay(loadout.primaryWeapons),
    );
  }

  if (loadout.secondaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromReplay(loadout.secondaryWeapons),
    );
  }

  addComponent(world, entity, createCollision(stats.collisionRadius));
  addHullColliderFromClass(world, entity, loadout.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

  return entity;
}

/**
 * Spawn wingman from replay loadout data.
 * Uses exact weapon configuration from the recorded replay.
 */
function spawnWingmanFromReplayLoadout(
  world: World,
  loadout: ReplayShipLoadout,
  position: Vector3,
  rotation: Quaternion,
  pilotName?: string,
  pilotSkill?: string,
): Entity {
  const stats = SHIP_CLASSES[loadout.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${loadout.shipClass}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
      afterburnerHeatRate: stats.afterburnerHeatRate,
      initialSpeed: INITIAL_SPAWN_SPEED,
    }),
  );

  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, rotation, INITIAL_SPAWN_SPEED);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));

  // Callsign for UI display - use pilot name if available, otherwise generic 'Wingman'
  const callsign = pilotName ?? 'Wingman';
  addComponent(world, entity, createShipIdentity(loadout.shipClass, callsign));

  // AI setup - use pilot skill from replay or default to regular
  // Note: Component order matches live gameplay (ship-spawning.ts)
  const profileName = (pilotSkill ?? 'regular') as ProfileName;
  const profile = getProfileForPlaystyle(profileName, 'brawler');
  const preferredRange = Math.floor(600 * profile.combatRangeMultiplier);
  addComponent(
    world,
    entity,
    createAIControlled(profile, preferredRange, undefined),
  );
  addComponent(world, entity, createAimError(world.prng, profile));

  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use exact weapons from replay loadout
  if (loadout.primaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createPrimaryWeaponsFromReplay(loadout.primaryWeapons),
    );
  }

  if (loadout.secondaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromReplay(loadout.secondaryWeapons),
    );
  }

  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5));
  addHullColliderFromClass(world, entity, loadout.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

  return entity;
}

/**
 * Result of setting up a replay world.
 */
export interface ReplayWorldSetup {
  world: World;
  mission: Contract;
  missionType: MissionType;
  /** Wave state for elimination missions */
  waveState?: WaveState;
  /** Escort state for escort missions */
  escortState?: EscortMissionState;
}

/**
 * Set up world for replay playback.
 * Creates player ship and wingmen using exact loadout from replay data.
 */
export function setupReplayWorld(
  seed: number,
  missionId: string,
  playerLoadout: ReplayShipLoadout,
  wingmen: ReplayWingman[],
  playerAutoaim: number,
  missionType?: MissionType,
): ReplayWorldSetup {
  // Find mission definition
  const mission = findMissionById(missionId);
  if (!mission) {
    throw new Error(`Mission not found: ${missionId}`);
  }

  // Create world with replay seed
  const world = createWorld(seed);

  // Set replay autoaim override (affects weapon-firing.ts)
  world.replayAutoaim = playerAutoaim;

  // Initialize match stats (for damage tracking)
  initMatchStats(world);

  // Spawn player at origin facing -Z
  const playerPos = new Vector3(0, 0, 0);
  const playerRot = new Quaternion();
  spawnPlayerFromReplayLoadout(world, playerLoadout, playerPos, playerRot);

  // Spawn wingmen from replay data
  for (const wingman of wingmen) {
    const pos = new Vector3(
      wingman.position.x,
      wingman.position.y,
      wingman.position.z,
    );
    spawnWingmanFromReplayLoadout(
      world,
      wingman.loadout,
      pos,
      playerRot,
      wingman.pilotName,
      wingman.pilotSkill,
    );
  }

  // Determine mission type (from replay metadata or contract, defaults to elimination)
  const effectiveMissionType =
    missionType ?? mission.missionType ?? 'elimination';

  if (effectiveMissionType === 'escort' && mission.escortData) {
    // Set wingmen to defensive mode (same as live gameplay)
    setFactionBehaviorMode(world, Faction.Player, 'defensive');

    // Setup escort mission (spawns convoy, initial enemies)
    const escortState = setupEscortMission(world, mission);

    return { world, mission, missionType: 'escort', escortState };
  }

  // Default: elimination mission with wave-based spawning
  const waves = mission.waves ?? [];
  const waveState = createWaveState(waves.length);
  initializeFirstWave(world, waveState, waves);

  return { world, mission, missionType: 'elimination', waveState };
}

/**
 * Process wave logic during replay tick.
 * Uses shared processWaveTick for determinism with live gameplay.
 */
export function tickReplayWaves(
  world: World,
  waveState: WaveState,
  mission: Contract,
  dt: number,
): void {
  // Use shared wave tick logic (identical to live gameplay)
  processWaveTick(world, waveState, mission, dt);
}

/**
 * Process escort mission logic during replay tick.
 * Uses shared processEscortMissionTick for determinism with live gameplay.
 */
export function tickReplayEscort(
  world: World,
  escortState: EscortMissionState,
  mission: Contract,
  dt: number,
): void {
  if (!mission.escortData) return;

  const escortData = mission.escortData;
  const escapeZonePosition = escortState.escapeZonePosition.clone();

  // Use shared escort tick logic (identical to live gameplay)
  processEscortMissionTick(world, escortState, dt, () => {
    spawnEscortEnemy(world, escortData, escapeZonePosition);
  });
}

/**
 * Check if the replay mission is complete (elimination missions).
 */
export function isReplayMissionComplete(waveState: WaveState): boolean {
  return (
    waveState.waveCleared && waveState.currentWave >= waveState.totalWaves - 1
  );
}

/**
 * Check if the escort replay mission is complete.
 */
export function isReplayEscortComplete(
  escortState: EscortMissionState,
): boolean {
  return escortState.completed;
}
