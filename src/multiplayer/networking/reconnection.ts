/**
 * Reconnection Manager - Handles exponential backoff retry logic for peer connections.
 *
 * Schedules reconnection attempts with increasing delays to avoid overwhelming
 * the network when connections fail.
 */

import { logDebug } from '../../core/logger';

/** Configuration for reconnection behavior */
export interface ReconnectionConfig {
  /** Maximum number of reconnection attempts before giving up */
  maxAttempts: number;
  /** Initial delay in milliseconds before first retry */
  initialDelayMs: number;
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number;
}

/** Default reconnection configuration */
export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 16000,
};

/** Tracks reconnection state for a single peer */
interface PeerReconnectionState {
  attempts: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

/**
 * Manages reconnection attempts for peer connections with exponential backoff.
 */
export class ReconnectionManager {
  private readonly config: ReconnectionConfig;
  private readonly peerStates = new Map<string, PeerReconnectionState>();

  constructor(config: Partial<ReconnectionConfig> = {}) {
    this.config = { ...DEFAULT_RECONNECTION_CONFIG, ...config };
  }

  /**
   * Get the delay for the next reconnection attempt for a peer.
   * Uses exponential backoff with jitter: initialDelay * 2^attempts * (1 + 0-50% jitter).
   * Jitter prevents "thundering herd" when multiple peers reconnect simultaneously.
   */
  getDelay(peerId: string): number {
    const state = this.peerStates.get(peerId);
    const attempts = state?.attempts ?? 0;

    const baseDelay = this.config.initialDelayMs * 2 ** attempts;
    const cappedDelay = Math.min(baseDelay, this.config.maxDelayMs);
    // Add 0-50% jitter to prevent synchronized reconnection attempts.
    // Note: Math.random() is acceptable here - this is networking infrastructure,
    // not game simulation logic. Jitter doesn't affect gameplay determinism.
    const jitter = cappedDelay * Math.random() * 0.5;
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Check if another reconnection attempt should be made for a peer.
   */
  shouldRetry(peerId: string): boolean {
    const state = this.peerStates.get(peerId);
    const attempts = state?.attempts ?? 0;
    return attempts < this.config.maxAttempts;
  }

  /**
   * Get the current attempt count for a peer.
   */
  getAttemptCount(peerId: string): number {
    return this.peerStates.get(peerId)?.attempts ?? 0;
  }

  /**
   * Schedule a reconnection attempt for a peer.
   * Returns true if scheduled, false if max attempts exceeded.
   */
  scheduleRetry(peerId: string, callback: () => void): boolean {
    if (!this.shouldRetry(peerId)) {
      return false;
    }

    let state = this.peerStates.get(peerId);
    if (!state) {
      state = { attempts: 0, timeoutId: null };
      this.peerStates.set(peerId, state);
    }

    // Clear any existing timeout
    if (state.timeoutId !== null) {
      clearTimeout(state.timeoutId);
    }

    const delay = this.getDelay(peerId);
    state.attempts++;

    logDebug(
      `[Mesh] Reconnect: scheduling attempt ${state.attempts}/${this.config.maxAttempts} ` +
        `to ${peerId} in ${delay}ms`,
    );

    // Capture state reference for closure
    const capturedState = state;
    capturedState.timeoutId = setTimeout(() => {
      capturedState.timeoutId = null;
      callback();
    }, delay);

    return true;
  }

  /**
   * Clear reconnection state for a peer (call on successful connection).
   */
  clearPeer(peerId: string): void {
    const state = this.peerStates.get(peerId);
    if (state) {
      if (state.timeoutId !== null) {
        clearTimeout(state.timeoutId);
      }
      this.peerStates.delete(peerId);
    }
  }

  /**
   * Reset all reconnection state (call on dispose).
   */
  reset(): void {
    for (const state of this.peerStates.values()) {
      if (state.timeoutId !== null) {
        clearTimeout(state.timeoutId);
      }
    }
    this.peerStates.clear();
  }
}
