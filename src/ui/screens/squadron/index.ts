/**
 * Squadron Screen - barrel exports.
 */

// Re-export types for external use
export type { NavDestination } from '../../common/nav-bar';
export type { ListSelection } from './list';
export {
  createSquadronUI,
  isSquadronUIActive,
  refreshSquadronUI,
  type SquadronUI,
  updateSquadronUI,
} from './squadron-screen';
