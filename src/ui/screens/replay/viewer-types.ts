/**
 * Replay Viewer Types
 *
 * Shared type definitions for replay viewer modules.
 */

import type { ReplayHelpModalState } from './replay-help-modal';

// Re-export for convenience
export type { ReplayHelpModalState };

/** Screen state for replay viewer */
export interface ViewerState {
  loading: boolean;
  error: string | null;
  playing: boolean;
  speed: number;
  currentTick: number;
  totalTicks: number;
  seeking: boolean;
  hudVisible: boolean;
  helpModal: ReplayHelpModalState;
}

/** UI update callbacks for input handlers */
export interface UICallbacks {
  updatePlayPauseButton: (playing: boolean) => void;
  updateSpeedButton: (speed: number) => void;
  updateSeekingIndicator: (seeking: boolean) => void;
  updateTimelineUI: (currentTick: number, totalTicks: number) => void;
  openHelpModal: () => void;
  onBack: () => void;
}
