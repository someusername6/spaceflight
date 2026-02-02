/**
 * UI Module Index - Re-exports major UI screens and utilities.
 *
 * This serves as a bundling entry point to help with code splitting.
 */

// Common utilities
export {
  createScreenManager,
  endMission,
  getScreenElement,
  goToContracts,
  goToLobby,
  goToSettings,
  goToSquadron,
  goToStore,
  goToTitle,
  Screen,
  startMission,
  updateCampaignState,
} from './common/screens';
// Screen framework
export {
  createScreen,
  type ScreenAPI,
  type ScreenHandle,
} from './framework/screen';
// Modals
export { showAlert } from './screens/alert-modal';
export { showCampaignCreateModal } from './screens/campaign-create';
export { showConfirm } from './screens/confirm-modal';
// Contracts screen
export { createContractsUI, refreshContractsUI } from './screens/contracts';
// Join game screen
export {
  bindJoinGameScreen,
  cleanupJoinGameScreen,
  renderJoinGameScreen,
} from './screens/join-game';
// Load campaign screen
export {
  bindLoadCampaignScreen,
  cleanupLoadCampaignScreen,
  renderLoadCampaignScreen,
} from './screens/load-campaign';
// Lobby screen
export {
  bindLobbyScreen,
  cleanupLobbyScreen,
  forceRenderLobbyScreen,
  renderLobbyScreen,
  updateLobbyState,
} from './screens/lobby';

// Pause menu
export { showPauseMenu } from './screens/pause-menu';
export { showQuitConfirmModal } from './screens/quit-confirm-modal';
// Replay screens
export {
  bindReplaysScreen,
  cleanupReplaysScreen,
  renderReplaysScreen,
} from './screens/replay/replay-list';
export {
  bindReplayViewer,
  cleanupReplayViewer,
  renderReplayViewer,
} from './screens/replay/replay-viewer';
// Results screen
export { createResultsUI } from './screens/results/results';
// Room created screen
export {
  cleanupRoomCreatedScreen,
  renderRoomCreatedScreen,
} from './screens/room-created';
// Settings screen
export {
  bindSettingsScreen,
  cleanupSettingsScreen,
  renderSettingsScreen,
} from './screens/settings';
// Squadron screen
export { createSquadronUI } from './screens/squadron';
// Store screen
export { createStoreUI } from './screens/store/store';
// Title screen
export {
  bindTitleScreen,
  cleanupTitleScreen,
  getBattleSimulationCanvas,
  hasBattleSimulation,
  renderTitleScreen,
  resetTitleScreen,
} from './screens/title';
