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
  nextRetryAt: number;
}

/** Maximum retry attempts for failed signals */
export const MAX_SIGNAL_RETRIES = 10;

/**
 * Get retry delay using exponential backoff.
 * Starts at 100ms and doubles each retry, capped at 5000ms.
 */
function getRetryDelay(retryCount: number): number {
  return Math.min(100 * 2 ** retryCount, 5000);
}

/**
 * Queue that manages outgoing signals with automatic retry on failure.
 */
export class SignalQueue {
  private pendingSignals: PendingSignal[] = [];

  /**
   * Add a signal to the queue.
   */
  queue(signal: OutgoingSignal): void {
    this.pendingSignals.push({ ...signal, retryCount: 0, nextRetryAt: 0 });
  }

  /**
   * Flush all pending signals, sending them via the signaling client.
   * Failed signals are re-queued with incremented retry count and exponential backoff.
   */
  async flush(signalingClient: SignalingClient): Promise<void> {
    if (this.pendingSignals.length === 0) return;

    const now = Date.now();
    const signals = [...this.pendingSignals];
    this.pendingSignals = [];

    const failedSignals: PendingSignal[] = [];
    const deferredSignals: PendingSignal[] = [];

    for (const signal of signals) {
      // Skip signals that are not yet ready to retry
      if (now < signal.nextRetryAt) {
        deferredSignals.push(signal);
        continue;
      }

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
          const newRetryCount = signal.retryCount + 1;
          // Log warning at retry 5
          if (newRetryCount === 5) {
            console.warn(
              `Signal to ${signal.toPeerId} has failed 5 times, continuing retries...`,
            );
          }
          failedSignals.push({
            ...signal,
            retryCount: newRetryCount,
            nextRetryAt: now + getRetryDelay(newRetryCount),
          });
        } else {
          console.error(
            `Signal to ${signal.toPeerId} failed after ${MAX_SIGNAL_RETRIES} retries, dropping`,
          );
        }
      }
    }

    // Re-queue deferred and failed signals for next flush cycle
    if (deferredSignals.length > 0 || failedSignals.length > 0) {
      this.pendingSignals.push(...deferredSignals, ...failedSignals);
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
