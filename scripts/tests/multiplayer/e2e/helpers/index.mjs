/**
 * E2E Test Helpers - Re-exports
 *
 * Centralizes all helper exports for easy importing.
 */

// Connection helpers
export {
  joinGuestToLobby,
  setupHostAndGuest,
  setupHostInLobby,
} from './connection.mjs';
// Loadout helpers
export {
  equipPrimarySlot,
  selectWingman,
  selectWingmanById,
  unequipPrimarySlot,
  waitForSlotEmpty,
  waitForSlotFilled,
} from './loadout.mjs';
// Lobby helpers
export {
  changeCallsign,
  closeCallsignPopover,
  closeHostPopover,
  getCallsignError,
  getPlayerCallsigns,
  openHostPopover,
  setShipEditPermission,
  togglePermission,
} from './lobby.mjs';
// Mission helpers
export {
  clickReadyToResume,
  getCountdownNumber,
  getPauseReason,
  getPlayerCallsign,
  getShipSpeed,
  getWingmanCallsigns,
  holdKey,
  isCountdownVisible,
  isReadyToResume,
  isSpectatorMode,
  launchMissionAndWait,
  playerHasShipAssigned,
  triggerPause,
  waitForMissionScreen,
  waitForPauseModal,
  waitForResume,
} from './mission.mjs';
// Navigation helpers
export {
  acceptFirstContract,
  getChatMessages,
  getDisplayedCredits,
  goToContractsFromLobby,
  isAcceptMissionDisabled,
  isButtonDisabled,
  isPlayerReady,
  isRefreshDisabled,
  navigateTo,
  readyBothPlayers,
  selectContract,
  waitForCreditsToEqual,
  waitForSync,
  waitForSystemMessage,
} from './navigation.mjs';
