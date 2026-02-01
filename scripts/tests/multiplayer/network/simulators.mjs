/**
 * Network Simulation Utilities
 *
 * Simulators for latency, packet loss, and jitter testing.
 */

import { createTestInput } from '../unit/test-utils.mjs';

export { createTestInput };

/**
 * Generate deterministic inputs for testing.
 */
export function generateInputsForTick(tick) {
  const hostInput = createTestInput(tick < 120, tick % 10 === 0);
  const guestInput = createTestInput(tick < 150, tick % 12 === 0);
  return { hostInput, guestInput };
}

/**
 * Simulate latency by delaying input application.
 * Returns a function that queues inputs and releases them after delay.
 */
export function createLatencySimulator(delayMs) {
  const queue = [];
  let currentTime = 0;

  return {
    /**
     * Queue an input for delayed delivery.
     */
    queueInput(input, targetTime) {
      queue.push({ input, deliveryTime: targetTime + delayMs });
    },

    /**
     * Advance time and get inputs ready for delivery.
     */
    tick(deltaMs) {
      currentTime += deltaMs;
      const ready = [];
      let i = 0;
      while (i < queue.length) {
        if (queue[i].deliveryTime <= currentTime) {
          ready.push(queue[i].input);
          queue.splice(i, 1);
        } else {
          i++;
        }
      }
      return ready;
    },

    getCurrentTime() {
      return currentTime;
    },

    getPendingCount() {
      return queue.length;
    },
  };
}

/**
 * Create a packet loss simulator.
 * Drops packets with given probability.
 */
export function createPacketLossSimulator(lossRate) {
  let droppedCount = 0;
  let totalCount = 0;
  let seed = 12345; // Deterministic PRNG for testing

  function nextRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  return {
    shouldDrop() {
      totalCount++;
      if (nextRandom() < lossRate) {
        droppedCount++;
        return true;
      }
      return false;
    },

    getStats() {
      return {
        dropped: droppedCount,
        total: totalCount,
        actualRate: totalCount > 0 ? droppedCount / totalCount : 0,
      };
    },

    reset() {
      droppedCount = 0;
      totalCount = 0;
      seed = 12345;
    },
  };
}

/**
 * Create a jitter simulator.
 * Adds random delay variation to each packet.
 */
export function createJitterSimulator(baseLatencyMs, jitterMs) {
  let seed = 54321;

  function nextRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  return {
    getDelay() {
      // Random delay between (base - jitter/2) and (base + jitter/2)
      const variation = (nextRandom() - 0.5) * jitterMs;
      return Math.max(0, baseLatencyMs + variation);
    },
  };
}
