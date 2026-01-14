/**
 * Replay Validation and Migration
 *
 * Validates imported replay data and migrates older versions.
 * Separated from storage.ts to keep files under 400 lines.
 */

import { REPLAY_VERSION } from './types';

/**
 * Migrate replay data from older versions to current format.
 * Each migration function handles one version increment.
 *
 * Migration history:
 * - v1 -> v2: Added inputsCompressed field, stats to metadata
 * - v2 -> v3: Added playerLoadout and wingmen for deterministic replay
 */
export function migrateReplay(
  data: Record<string, unknown>,
): Record<string, unknown> {
  let current = { ...data };
  let version = current.version as number;

  // v1 -> v2: Add missing fields with defaults
  if (version === 1) {
    // inputsCompressed didn't exist in v1, inputs were always uncompressed
    if (current.inputsCompressed === undefined) {
      current.inputsCompressed = false;
    }
    // stats didn't exist in v1 metadata
    const metadata = current.metadata as Record<string, unknown>;
    if (metadata.stats === undefined) {
      metadata.stats = { kills: 0, damageDealt: 0, damageTaken: 0 };
    }
    current.version = 2;
    version = 2;
    current = { ...current, metadata: { ...metadata } };
  }

  // v2 -> v3: playerLoadout and wingmen are optional
  // v2 replays don't have these fields - they'll use archetype defaults
  // which may not match exactly (this is expected for old replays)
  if (version === 2) {
    // No automatic migration needed - fields are optional for backwards compat
    // Just bump the version so we know the replay has been processed
    current.version = 3;
  }

  return current;
}

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
 */
export function validateVersion(replay: Record<string, unknown>): void {
  if (typeof replay.version !== 'number') {
    throw new Error('Invalid replay: missing version');
  }
  if (replay.version > REPLAY_VERSION) {
    throw new Error(
      `Replay version ${replay.version} is newer than supported (${REPLAY_VERSION})`,
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
  // Validate inputsCompressed if present
  if (
    replay.inputsCompressed !== undefined &&
    typeof replay.inputsCompressed !== 'boolean'
  ) {
    throw new Error('Invalid replay: inputsCompressed must be a boolean');
  }
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

  // Validate stats if present
  validateStats(metadata);
}

/**
 * Validate stats object if present.
 */
function validateStats(metadata: Record<string, unknown>): void {
  if (metadata.stats === undefined) return;

  if (typeof metadata.stats !== 'object' || metadata.stats === null) {
    throw new Error('Invalid replay: stats must be an object');
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
