/**
 * Signal Queue - Manages outgoing WebRTC signals with retry logic.
 *
 * Queues signals for sending and retries on failure up to MAX_RETRIES times.
 */

import type { SignalingClient } from './signaling-client';
import type { OutgoingSignal } from './webrtc-mesh';

/** Signal with retry tracking */
export interface PendingSignal extends OutgoingSignal {
  retryCount: number;
}

/** Maximum retry attempts for failed signals */
export const MAX_SIGNAL_RETRIES = 3;

/**
 * Queue that manages outgoing signals with automatic retry on failure.
 */
export class SignalQueue {
  private pendingSignals: PendingSignal[] = [];

  /**
   * Add a signal to the queue.
   */
  queue(signal: OutgoingSignal): void {
    this.pendingSignals.push({ ...signal, retryCount: 0 });
  }

  /**
   * Flush all pending signals, sending them via the signaling client.
   * Failed signals are re-queued with incremented retry count.
   */
  async flush(signalingClient: SignalingClient): Promise<void> {
    if (this.pendingSignals.length === 0) return;

    const signals = [...this.pendingSignals];
    this.pendingSignals = [];

    const failedSignals: PendingSignal[] = [];

    for (const signal of signals) {
      try {
        await signalingClient.postSignal(
          signal.toPeerId,
          signal.type,
          signal.data,
        );
      } catch (error) {
        console.error('Error sending signal:', error);
        // Re-queue with incremented retry count if under max retries
        if (signal.retryCount < MAX_SIGNAL_RETRIES) {
          failedSignals.push({
            ...signal,
            retryCount: signal.retryCount + 1,
          });
        } else {
          console.error(
            `Signal to ${signal.toPeerId} failed after ${MAX_SIGNAL_RETRIES} retries, dropping`,
          );
        }
      }
    }

    // Re-queue failed signals for next flush cycle
    if (failedSignals.length > 0) {
      this.pendingSignals.push(...failedSignals);
    }
  }

  /**
   * Get the current pending signals (for testing).
   */
  getPending(): readonly PendingSignal[] {
    return this.pendingSignals;
  }

  /**
   * Clear all pending signals.
   */
  clear(): void {
    this.pendingSignals = [];
  }

  /**
   * Check if there are pending signals.
   */
  hasPending(): boolean {
    return this.pendingSignals.length > 0;
  }
}
