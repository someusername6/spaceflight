/**
 * Ship Entity Conversion - ECS entity conversion for multiplayer.
 *
 * Handles converting player-controlled ship entities to AI control
 * during a running mission (when players disconnect or are dropped).
 *
 * Extracted from ship-assignment.ts for file size management.
 */

import type { SkillLevel } from '../campaign/types';
import { createAIControlled } from '../components/ai';
import { addComponent, hasComponents, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { AI_PROFILES } from '../data/ai-profiles';

// =============================================================================
// Mid-Mission Entity Conversion
// =============================================================================

/**
 * Convert a player's ship entity to AI control mid-mission.
 *
 * This handles the ECS entity during a running mission, removing
 * the playerControlled component and adding aiControlled.
 *
 * Note: For campaign state changes, use convertPlayerPilotToAI() instead.
 *
 * @param world - The ECS world
 * @param shipEntity - Entity ID of the ship to convert
 * @param aiSkill - AI skill level for the converted pilot
 * @returns true if conversion succeeded, false if entity was invalid
 */
export function convertPlayerShipToAIMission(
  world: World,
  shipEntity: Entity,
  aiSkill: SkillLevel,
): boolean {
  // Check if entity has playerControlled component
  if (!hasComponents(world, shipEntity, ['playerControlled'])) {
    return false;
  }

  // Get the AI profile for the skill level
  const profile = AI_PROFILES[aiSkill];
  if (!profile) {
    // Fallback to regular if skill not found
    const fallbackProfile = AI_PROFILES.regular;
    if (!fallbackProfile) return false;
  }

  // Remove player control
  removeComponent(world, shipEntity, 'playerControlled');

  // Add AI control with the appropriate profile
  const aiProfile = AI_PROFILES[aiSkill] ?? AI_PROFILES.regular;
  if (!aiProfile) return false;

  const aiComponent = createAIControlled(aiProfile);
  addComponent(world, shipEntity, aiComponent);

  return true;
}

/**
 * Find a player's ship entity by their player ID.
 *
 * @param playerId - The player's ID to search for
 * @param playerEntityMap - Map of player IDs to entity IDs
 * @returns Entity ID if found, undefined otherwise
 */
export function findPlayerShipEntity(
  playerId: string,
  playerEntityMap: Map<string, Entity>,
): Entity | undefined {
  return playerEntityMap.get(playerId);
}
