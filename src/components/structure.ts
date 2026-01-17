/**
 * Structure Component - marks entities as environmental structures.
 *
 * Structures are static (immovable) objects in the world like waypoints,
 * debris, or obstacles. They have hull collision but don't respond to
 * physics impulses - other ships bounce off them instead.
 */

import type { ComponentBase } from '../core/types';

/** Types of structures in the game */
export type StructureType = 'waypoint' | 'obstacle';

/** Structure component - marks entity as a static structure */
export interface Structure extends ComponentBase {
  readonly type: 'structure';
  /** What kind of structure this is */
  structureType: StructureType;
}

/** Create a Structure component */
export function createStructure(structureType: StructureType): Structure {
  return {
    type: 'structure',
    structureType,
  };
}
