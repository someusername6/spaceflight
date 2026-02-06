/**
 * Campaign state - mission result application functions.
 *
 * Re-exports from split sub-modules for backwards compatibility.
 */

export { applyAmmoUsage } from './state-mission-ammo';
export { applyMissionResults } from './state-mission-results';
export {
  applyPilotStats,
  calculateMissionSalaries,
  type SalaryEntry,
  type SalaryInfo,
} from './state-mission-stats';
