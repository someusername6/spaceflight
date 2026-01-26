/**
 * Signaling Server Test Utilities
 *
 * Provides functions to start, stop, and wait for the signaling server
 * for integration tests.
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(__dirname, '../../../server/signaling');

/** Default signaling server port */
export const DEFAULT_PORT = 3001;

/**
 * Start the signaling server process.
 *
 * @param {number} port - Port to run the server on (default 3001)
 * @returns {Promise<import('child_process').ChildProcess>} - The server process
 */
export async function startSignalingServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: String(port),
    };

    const serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: SERVER_DIR,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let startupOutput = '';

    // Collect output for debugging
    serverProcess.stdout.on('data', (data) => {
      startupOutput += data.toString();
      // Check if server has started by looking for the ready message
      if (startupOutput.includes('running on')) {
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      startupOutput += data.toString();
    });

    serverProcess.on('error', (error) => {
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}: ${startupOutput}`));
      }
    });

    // Timeout if server doesn't start within 10 seconds
    setTimeout(() => {
      if (!serverProcess.killed) {
        reject(new Error(`Server startup timeout. Output: ${startupOutput}`));
        serverProcess.kill();
      }
    }, 10000);
  });
}

/**
 * Wait for the server to be ready by polling the health endpoint.
 *
 * @param {number} port - Port the server is running on
 * @param {number} timeoutMs - Maximum time to wait (default 5000ms)
 * @returns {Promise<void>}
 */
export async function waitForServerReady(
  port = DEFAULT_PORT,
  timeoutMs = 5000,
) {
  const startTime = Date.now();
  const url = `http://localhost:${port}/health`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet, continue polling
    }
    await sleep(100);
  }

  throw new Error(`Server not ready after ${timeoutMs}ms`);
}

/**
 * Stop the signaling server process.
 *
 * @param {import('child_process').ChildProcess} serverProcess - The server process to stop
 * @returns {Promise<void>}
 */
export async function stopSignalingServer(serverProcess) {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  return new Promise((resolve) => {
    serverProcess.on('exit', () => {
      resolve();
    });

    // Send SIGTERM for graceful shutdown
    serverProcess.kill('SIGTERM');

    // Force kill after 3 seconds if still running
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }, 3000);
  });
}

/**
 * Sleep utility.
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a signaling client configuration for tests.
 *
 * @param {number} port - Server port
 * @returns {import('../../../src/multiplayer/networking/types.ts').SignalingClientConfig}
 */
export function createTestConfig(port = DEFAULT_PORT) {
  return {
    serverUrl: `http://localhost:${port}`,
    gameVersion: '1.0.0-test',
    pollIntervalMs: 50,
  };
}
