/**
 * Campaign ID Generator - Pure function for deterministic ID generation.
 *
 * IDs are stored in CampaignState.nextId to ensure:
 * - Determinism: same campaign always produces same IDs
 * - No save-scum issues: counter persists with save
 * - No global state: fully testable
 */

/**
 * Generate a unique campaign ID.
 * Returns the ID string and the next counter value.
 *
 * @param nextId - Current counter value from CampaignState.nextId
 * @param prefix - Optional prefix for the ID (default: 'id')
 * @returns Tuple of [generated ID, new nextId value]
 *
 * @example
 * const [shipId, newNextId] = generateCampaignId(state.nextId, 'ship');
 * // shipId = 'ship_1', newNextId = 2
 */
export function generateCampaignId(
  nextId: number,
  prefix = 'id',
): [string, number] {
  return [`${prefix}_${nextId}`, nextId + 1];
}
