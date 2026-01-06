/**
 * Results screen type definitions.
 *
 * The Results screen shows mission outcome, debrief, and salvage.
 */

import type { CampaignState, Contract } from '../../campaign/types';
import type { BaseScreenProps } from './common';

/** Tab options on the results screen */
export type ResultsTab = 'debrief' | 'salvage';

/** Weapon accuracy stats */
export interface WeaponAccuracy {
  weaponName: string;
  category: 'projectile' | 'beam' | 'missile' | 'decoy';
  shotsFired?: number;
  shotsHit?: number;
  accuracy?: number;
  timeFired?: number;
  timeOnTarget?: number;
  missilesLaunched?: number;
  missilesHit?: number;
}

/** Combat stats for a pilot */
export interface PilotDebriefStats {
  /** Pilot name (or "You" for player) */
  name: string;

  /** Whether this is the player */
  isPlayer: boolean;

  /** Whether this pilot survived */
  survived: boolean;

  /** Kills achieved */
  kills: number;

  /** Assists achieved */
  assists: number;

  /** Total damage dealt */
  damageDealt: number;

  /** Total damage received */
  damageReceived: number;

  /** Time survived (if killed, in seconds) */
  timeSurvived?: number;

  /** Per-weapon accuracy stats */
  weaponStats: WeaponAccuracy[];
}

/** Salvage item */
export interface SalvageItem {
  /** Item type (weapon name, ship class for scrap) */
  type: string;

  /** Category for display */
  category: 'scrap' | 'weapon' | 'ammo';

  /** Count collected */
  count: number;

  /** Estimated credit value */
  estimatedValue: number;
}

/** Props for the Results screen */
export interface ResultsProps extends BaseScreenProps {
  /** Whether mission was won */
  victory: boolean;

  /** The contract that was completed */
  contract: Contract | null;

  /** Credits earned from mission (base reward) */
  creditsEarned: number;

  /** Current total credits */
  totalCredits: number;

  /** Number of ships remaining */
  shipsRemaining: number;

  /** Total missions completed */
  missionsCompleted: number;

  /** Currently selected tab */
  selectedTab: ResultsTab;

  /** Pilot combat statistics */
  pilotStats: PilotDebriefStats[];

  /** Salvage collected */
  salvageItems: SalvageItem[];

  /** Total estimated salvage value */
  salvageTotalValue: number;
}

/** Actions the Results screen can trigger */
export interface ResultsActions {
  /** Switch between debrief and salvage tabs */
  selectTab: (tab: ResultsTab) => void;

  /** Continue to hangar (or game over) */
  continue: () => void;
}

/** Props for the Game Over screen */
export interface GameOverProps {
  /** Final credit balance */
  finalCredits: number;

  /** Total missions completed */
  missionsCompleted: number;

  /** Highest sector reached */
  sectorReached: number;
}

/** Actions for the Game Over screen */
export interface GameOverActions {
  /** Start a new campaign */
  restart: () => void;
}

/** Derive ResultsProps from state and mission data */
export function deriveResultsProps(
  state: CampaignState,
  victory: boolean,
  contract: Contract | null,
  creditsEarned: number,
  selectedTab: ResultsTab,
  pilotStats: PilotDebriefStats[],
  salvageItems: SalvageItem[],
): ResultsProps {
  const salvageTotalValue = salvageItems.reduce(
    (sum, item) => sum + item.estimatedValue,
    0,
  );

  return {
    state,
    victory,
    contract,
    creditsEarned,
    totalCredits: state.credits,
    shipsRemaining: state.ships.length,
    missionsCompleted: state.missionCount,
    selectedTab,
    pilotStats,
    salvageItems,
    salvageTotalValue,
  };
}

/** Derive GameOverProps from state */
export function deriveGameOverProps(state: CampaignState): GameOverProps {
  return {
    finalCredits: state.credits,
    missionsCompleted: state.missionCount,
    sectorReached: state.currentSector,
  };
}
