/**
 * UI Type Definitions
 *
 * This module exports all type interfaces for campaign UI screens.
 * Use these types when implementing new UI to ensure proper integration
 * with the game's state management.
 */

// Common types
export type {
  BaseScreenActions,
  BaseScreenProps,
  StateUpdater,
} from './common';
// Contracts screen
export type {
  ContractEnemySummary,
  ContractsActions,
  ContractsProps,
} from './contracts';
export { deriveContractsProps, getContractEnemySummary } from './contracts';
// Hangar screen
export type {
  HangarActions,
  HangarProps,
  LoadoutPanelActions,
  LoadoutPanelProps,
} from './hangar';
export { deriveHangarProps } from './hangar';
// Results screen
export type {
  GameOverActions,
  GameOverProps,
  PilotDebriefStats,
  ResultsActions,
  ResultsProps,
  ResultsTab,
  SalvageItem,
  WeaponAccuracy,
} from './results';
export { deriveGameOverProps, deriveResultsProps } from './results';
// Store screen
export type {
  ItemDetails,
  StoreActions,
  StoreCategory,
  StoreItem,
  StoreProps,
} from './store';
export { deriveStoreProps } from './store';
