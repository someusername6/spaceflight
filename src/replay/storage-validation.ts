/**
 * Replay Validation
 *
 * Validates imported replay data.
 * Separated from storage.ts to keep files under 400 lines.
 */

import { isValidPlayerAutoaim } from '../settings/game-settings';
import { MIN_REPLAY_VERSION, REPLAY_VERSION } from './types';

/**
 * Validate basic replay structure.
 * Throws descriptive errors on invalid data.
 */
export function validateReplayStructure(
  data: unknown,
): asserts data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid replay: not an object');
  }
}

/**
 * Validate replay version.
 * Accepts replays between MIN_REPLAY_VERSION and REPLAY_VERSION.
 */
export function validateVersion(replay: Record<string, unknown>): void {
  if (typeof replay.version !== 'number') {
    throw new Error('Invalid replay: missing version');
  }
  if (replay.version < MIN_REPLAY_VERSION || replay.version > REPLAY_VERSION) {
    throw new Error(
      `Replay version ${replay.version} is not supported (supported: ${MIN_REPLAY_VERSION}-${REPLAY_VERSION})`,
    );
  }
}

/**
 * Validate core replay fields (seed, inputs, tickCount).
 */
export function validateCoreFields(replay: Record<string, unknown>): void {
  if (typeof replay.seed !== 'number') {
    throw new Error('Invalid replay: missing seed');
  }
  if (!Array.isArray(replay.inputs)) {
    throw new Error('Invalid replay: missing inputs array');
  }
  // Validate inputs array contains only numbers
  for (let i = 0; i < replay.inputs.length; i++) {
    if (typeof replay.inputs[i] !== 'number') {
      throw new Error(`Invalid replay: inputs[${i}] is not a number`);
    }
  }
  if (typeof replay.tickCount !== 'number' || replay.tickCount < 0) {
    throw new Error('Invalid replay: missing or invalid tickCount');
  }
  if (typeof replay.inputsCompressed !== 'boolean') {
    throw new Error('Invalid replay: inputsCompressed must be a boolean');
  }
  // Validate playerAutoaim
  if (!isValidPlayerAutoaim(replay.playerAutoaim)) {
    throw new Error('Invalid replay: invalid playerAutoaim value');
  }
  // Validate playerLoadout
  validateShipLoadout(replay.playerLoadout, 'playerLoadout');
  // Validate wingmen
  validateWingmen(replay.wingmen);
}

/**
 * Validate replay metadata.
 */
export function validateMetadata(replay: Record<string, unknown>): void {
  if (typeof replay.metadata !== 'object' || replay.metadata === null) {
    throw new Error('Invalid replay: missing metadata');
  }

  const metadata = replay.metadata as Record<string, unknown>;
  if (typeof metadata.missionId !== 'string') {
    throw new Error('Invalid replay: missing missionId');
  }
  if (typeof metadata.missionName !== 'string') {
    throw new Error('Invalid replay: missing missionName');
  }
  if (typeof metadata.sector !== 'number' || metadata.sector < 1) {
    throw new Error('Invalid replay: missing or invalid sector');
  }
  if (typeof metadata.shipType !== 'string') {
    throw new Error('Invalid replay: missing shipType');
  }
  if (
    metadata.outcome !== 'victory' &&
    metadata.outcome !== 'defeat' &&
    metadata.outcome !== 'timeout'
  ) {
    throw new Error(
      'Invalid replay: outcome must be "victory", "defeat", or "timeout"',
    );
  }
  if (
    typeof metadata.durationTicks !== 'number' ||
    metadata.durationTicks < 0
  ) {
    throw new Error('Invalid replay: missing or invalid durationTicks');
  }
  if (typeof metadata.recordedAt !== 'number') {
    throw new Error('Invalid replay: missing recordedAt timestamp');
  }
  if (typeof metadata.gameVersion !== 'string') {
    throw new Error('Invalid replay: missing gameVersion');
  }

  // Validate stats
  validateStats(metadata);
}

/**
 * Validate stats object.
 */
function validateStats(metadata: Record<string, unknown>): void {
  if (typeof metadata.stats !== 'object' || metadata.stats === null) {
    throw new Error('Invalid replay: missing stats');
  }
  const stats = metadata.stats as Record<string, unknown>;
  if (typeof stats.kills !== 'number') {
    throw new Error('Invalid replay: stats.kills must be a number');
  }
  if (typeof stats.damageDealt !== 'number') {
    throw new Error('Invalid replay: stats.damageDealt must be a number');
  }
  if (typeof stats.damageTaken !== 'number') {
    throw new Error('Invalid replay: stats.damageTaken must be a number');
  }
}

/**
 * Validate ship loadout structure.
 */
function validateShipLoadout(loadout: unknown, context: string): void {
  if (typeof loadout !== 'object' || loadout === null) {
    throw new Error(`Invalid replay: ${context} must be an object`);
  }
  const obj = loadout as Record<string, unknown>;
  if (typeof obj.shipClass !== 'string') {
    throw new Error(`Invalid replay: ${context}.shipClass must be a string`);
  }
  if (!Array.isArray(obj.primaryWeapons)) {
    throw new Error(`Invalid replay: ${context}.primaryWeapons must be array`);
  }
  if (!Array.isArray(obj.secondaryWeapons)) {
    throw new Error(
      `Invalid replay: ${context}.secondaryWeapons must be array`,
    );
  }
  // Validate each primary weapon
  for (let i = 0; i < obj.primaryWeapons.length; i++) {
    validatePrimaryWeapon(
      obj.primaryWeapons[i],
      `${context}.primaryWeapons[${i}]`,
    );
  }
  // Validate each secondary weapon
  for (let i = 0; i < obj.secondaryWeapons.length; i++) {
    validateSecondaryWeapon(
      obj.secondaryWeapons[i],
      `${context}.secondaryWeapons[${i}]`,
    );
  }
}

/**
 * Validate primary weapon structure.
 */
function validatePrimaryWeapon(weapon: unknown, context: string): void {
  if (typeof weapon !== 'object' || weapon === null) {
    throw new Error(`Invalid replay: ${context} must be an object`);
  }
  const obj = weapon as Record<string, unknown>;
  if (typeof obj.weaponId !== 'string') {
    throw new Error(`Invalid replay: ${context}.weaponId must be a string`);
  }
  if (typeof obj.bankSize !== 'number' || obj.bankSize < 1) {
    throw new Error(
      `Invalid replay: ${context}.bankSize must be a positive number`,
    );
  }
  // ammo and maxAmmo are optional for primary weapons (energy weapons don't have them)
  if (obj.ammo !== undefined && typeof obj.ammo !== 'number') {
    throw new Error(`Invalid replay: ${context}.ammo must be a number`);
  }
  if (obj.maxAmmo !== undefined && typeof obj.maxAmmo !== 'number') {
    throw new Error(`Invalid replay: ${context}.maxAmmo must be a number`);
  }
}

/**
 * Validate secondary weapon structure.
 */
function validateSecondaryWeapon(weapon: unknown, context: string): void {
  if (typeof weapon !== 'object' || weapon === null) {
    throw new Error(`Invalid replay: ${context} must be an object`);
  }
  const obj = weapon as Record<string, unknown>;
  if (typeof obj.weaponId !== 'string') {
    throw new Error(`Invalid replay: ${context}.weaponId must be a string`);
  }
  if (typeof obj.bankSize !== 'number' || obj.bankSize < 1) {
    throw new Error(
      `Invalid replay: ${context}.bankSize must be a positive number`,
    );
  }
  // ammo and maxAmmo are required for secondary weapons (missiles)
  if (typeof obj.ammo !== 'number') {
    throw new Error(`Invalid replay: ${context}.ammo must be a number`);
  }
  if (typeof obj.maxAmmo !== 'number') {
    throw new Error(`Invalid replay: ${context}.maxAmmo must be a number`);
  }
}

/**
 * Validate wingmen array.
 */
function validateWingmen(wingmen: unknown): void {
  if (!Array.isArray(wingmen)) {
    throw new Error('Invalid replay: wingmen must be an array');
  }
  for (let i = 0; i < wingmen.length; i++) {
    validateWingman(wingmen[i], `wingmen[${i}]`);
  }
}

/**
 * Validate wingman structure.
 */
function validateWingman(wingman: unknown, context: string): void {
  if (typeof wingman !== 'object' || wingman === null) {
    throw new Error(`Invalid replay: ${context} must be an object`);
  }
  const obj = wingman as Record<string, unknown>;
  // Validate loadout
  validateShipLoadout(obj.loadout, `${context}.loadout`);
  // Validate position
  if (typeof obj.position !== 'object' || obj.position === null) {
    throw new Error(`Invalid replay: ${context}.position must be an object`);
  }
  const pos = obj.position as Record<string, unknown>;
  if (typeof pos.x !== 'number') {
    throw new Error(`Invalid replay: ${context}.position.x must be a number`);
  }
  if (typeof pos.y !== 'number') {
    throw new Error(`Invalid replay: ${context}.position.y must be a number`);
  }
  if (typeof pos.z !== 'number') {
    throw new Error(`Invalid replay: ${context}.position.z must be a number`);
  }
  // pilotSkill is optional
  if (obj.pilotSkill !== undefined && typeof obj.pilotSkill !== 'string') {
    throw new Error(`Invalid replay: ${context}.pilotSkill must be a string`);
  }
}
