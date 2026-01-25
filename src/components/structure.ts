/**
 * Structure Component - marks entities as environmental structures.
 *
 * Structures are static (immovable) objects in the world like waypoints,
 * debris, or obstacles. They have hull collision but don't respond to
 * physics impulses - other ships bounce off them instead.
 */

import type { ComponentBase } from '../core/types';
import type { StationType } from '../data/stations';

/** Types of structures in the game */
export type StructureType = 'waypoint' | 'obstacle' | 'station';

/** Structure component - marks entity as a static structure */
export interface Structure extends ComponentBase {
  readonly type: 'structure';
  /** What kind of structure this is */
  structureType: StructureType;
  /** For stations: which station variant (determines mesh) */
  stationType?: StationType;
}

/** Create a Structure component */
export function createStructure(
  structureType: StructureType,
  stationType?: StationType,
): Structure {
  const base: Structure = {
    type: 'structure',
    structureType,
  };
  if (stationType !== undefined) {
    base.stationType = stationType;
  }
  return base;
}

// =============================================================================
// Serialization
// =============================================================================

/** Structure type as numeric */
const StructureTypeToNum: Record<StructureType, number> = {
  waypoint: 0,
  obstacle: 1,
  station: 2,
};
const NumToStructureType: StructureType[] = ['waypoint', 'obstacle', 'station'];

export interface SerializedStructure {
  t: 24; // Component type ID
  st: number; // structureType
  sn?: StationType; // stationType (string enum, keep as-is)
}

export function serializeStructure(c: Structure): SerializedStructure {
  const result: SerializedStructure = {
    t: 24,
    st: StructureTypeToNum[c.structureType],
  };
  if (c.stationType !== undefined) result.sn = c.stationType;
  return result;
}

export function deserializeStructure(s: SerializedStructure): Structure {
  const result: Structure = {
    type: 'structure',
    structureType: NumToStructureType[s.st] ?? 'waypoint',
  };
  if (s.sn !== undefined) result.stationType = s.sn;
  return result;
}
