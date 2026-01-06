/**
 * Hangar screen type definitions.
 *
 * The Hangar is the central hub for squadron management.
 */

import type {
  CampaignState,
  OwnedShip,
  Pilot,
  StoredAmmo,
  StoredHull,
  StoredWeapon,
} from '../../campaign/types';
import type { BaseScreenActions, BaseScreenProps } from './common';

/** Props for the Hangar screen */
export interface HangarProps extends BaseScreenProps {
  /** Current credit balance */
  credits: number;

  /** Current sector number */
  currentSector: number;

  /** All owned ships (player + wingmen) */
  ships: OwnedShip[];

  /** Unassigned pilots available for deployment */
  pilots: Pilot[];

  /** Ship hulls in storage */
  storedHulls: StoredHull[];

  /** Weapons in storage */
  storedWeapons: StoredWeapon[];

  /** Ammunition in storage */
  storedAmmo: StoredAmmo[];

  /** Scrap by ship class */
  storedScrap: Record<string, number>;

  /** Currently selected ship ID (null if none) */
  selectedShipId: string | null;

  /** Total cost to resupply all ships */
  resupplyCost: number;

  /** Whether player can afford resupply */
  canAffordResupply: boolean;
}

/** Actions the Hangar screen can trigger */
export interface HangarActions extends BaseScreenActions {
  /** Navigate to contracts screen */
  goToContracts: () => void;

  /** Navigate to store screen */
  goToStore: () => void;

  /** Resupply all ships (refill ammo) */
  resupply: () => void;

  /** Select a ship to view/edit loadout */
  selectShip: (shipId: string | null) => void;

  /** Deploy a pilot to a hull, creating a new wingman */
  deployPilot: (pilotIndex: number, hullIndex: number) => void;

  /** Convert scrap to a hull */
  convertScrap: (shipClass: string) => void;

  /** Sell scrap for credits */
  sellScrap: (shipClass: string, count: number) => void;
}

/** Props for the Loadout Panel (sidebar) */
export interface LoadoutPanelProps {
  /** The ship being edited */
  ship: OwnedShip;

  /** Campaign state for storage access */
  state: CampaignState;
}

/** Actions for the Loadout Panel */
export interface LoadoutPanelActions {
  /** Close the loadout panel */
  close: () => void;

  /** Unequip a primary weapon to storage */
  unequipPrimary: (shipId: string, slotIndex: number) => void;

  /** Unequip a secondary weapon to storage */
  unequipSecondary: (shipId: string, slotIndex: number) => void;

  /** Equip a weapon from storage */
  equipWeapon: (
    shipId: string,
    slotIndex: number,
    storageIndex: number,
  ) => void;

  /** Load ammo into a weapon */
  loadAmmo: (shipId: string, slotIndex: number, amount: number) => void;

  /** Unload ammo from a weapon */
  unloadAmmo: (shipId: string, slotIndex: number, amount: number) => void;

  /** Called when state changes */
  onStateUpdate: (newState: CampaignState) => void;
}

/** Derive HangarProps from CampaignState */
export function deriveHangarProps(
  state: CampaignState,
  selectedShipId: string | null,
  resupplyCost: number,
): HangarProps {
  return {
    state,
    credits: state.credits,
    currentSector: state.currentSector,
    ships: state.ships,
    pilots: state.pilots,
    storedHulls: state.storedHulls,
    storedWeapons: state.storedWeapons,
    storedAmmo: state.storedAmmo,
    storedScrap: state.storedScrap,
    selectedShipId,
    resupplyCost,
    canAffordResupply: state.credits >= resupplyCost && resupplyCost > 0,
  };
}
