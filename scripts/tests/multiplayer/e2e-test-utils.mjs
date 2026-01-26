/**
 * E2E Test Utilities
 *
 * Shared utilities for lobby E2E tests.
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = join(__dirname, '../../..');
export const SIGNALING_DIR = join(PROJECT_ROOT, 'server/signaling');

export const VITE_PORT = 5174;
export const VITE_URL = `http://localhost:${VITE_PORT}`;
export const SIGNALING_PORT = 3001;
export const SIGNALING_URL = `http://localhost:${SIGNALING_PORT}`;

/** @type {import('child_process').ChildProcess | null} */
let viteProcess = null;

/** @type {import('child_process').ChildProcess | null} */
let signalingProcess = null;

/**
 * Sleep utility.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start the Vite dev server.
 */
export async function startViteServer() {
  return new Promise((resolve, reject) => {
    let resolved = false;

    viteProcess = spawn('npx', ['vite', '--port', String(VITE_PORT)], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let startupOutput = '';

    viteProcess.stdout.on('data', (data) => {
      startupOutput += data.toString();
      if (
        !resolved &&
        (startupOutput.includes('Local:') || startupOutput.includes('ready'))
      ) {
        resolved = true;
        resolve(viteProcess);
      }
    });

    viteProcess.stderr.on('data', (data) => {
      startupOutput += data.toString();
    });

    viteProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start Vite: ${error.message}`));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Vite startup timeout. Output: ${startupOutput}`));
        viteProcess?.kill();
      }
    }, 30000);
  });
}

/**
 * Wait for Vite to be ready.
 */
export async function waitForViteReady(timeoutMs = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(VITE_URL);
      if (response.ok) {
        return;
      }
    } catch {
      // Not ready yet
    }
    await sleep(200);
  }

  throw new Error(`Vite not ready after ${timeoutMs}ms`);
}

/**
 * Stop Vite server.
 */
export async function stopViteServer() {
  if (!viteProcess || viteProcess.killed) {
    return;
  }

  return new Promise((resolve) => {
    viteProcess.on('exit', () => {
      resolve();
    });

    viteProcess.kill('SIGTERM');

    setTimeout(() => {
      if (viteProcess && !viteProcess.killed) {
        viteProcess.kill('SIGKILL');
      }
    }, 3000);
  });
}

/**
 * Start the signaling server.
 */
export async function startSignalingServer() {
  return new Promise((resolve, reject) => {
    let resolved = false;

    signalingProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: SIGNALING_DIR,
      env: { ...process.env, PORT: String(SIGNALING_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let startupOutput = '';

    signalingProcess.stdout.on('data', (data) => {
      startupOutput += data.toString();
      if (!resolved && startupOutput.includes('running on')) {
        resolved = true;
        resolve(signalingProcess);
      }
    });

    signalingProcess.stderr.on('data', (data) => {
      startupOutput += data.toString();
    });

    signalingProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start signaling server: ${error.message}`));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `Signaling server startup timeout. Output: ${startupOutput}`,
          ),
        );
        signalingProcess?.kill();
      }
    }, 15000);
  });
}

/**
 * Wait for signaling server to be ready.
 */
export async function waitForSignalingReady(timeoutMs = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${SIGNALING_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Not ready yet
    }
    await sleep(200);
  }

  throw new Error(`Signaling server not ready after ${timeoutMs}ms`);
}

/**
 * Stop signaling server.
 */
export async function stopSignalingServer() {
  if (!signalingProcess || signalingProcess.killed) {
    return;
  }

  return new Promise((resolve) => {
    signalingProcess.on('exit', () => {
      resolve();
    });

    signalingProcess.kill('SIGTERM');

    setTimeout(() => {
      if (signalingProcess && !signalingProcess.killed) {
        signalingProcess.kill('SIGKILL');
      }
    }, 3000);
  });
}

/**
 * Start both servers and wait for them to be ready.
 */
export async function startServers() {
  console.log('Starting Vite dev server...');
  await startViteServer();
  await waitForViteReady();
  console.log('Vite ready!');

  console.log('Starting signaling server...');
  await startSignalingServer();
  await waitForSignalingReady();
  console.log('Signaling server ready!');
}

/**
 * Stop both servers.
 */
export async function stopServers() {
  console.log('\nStopping servers...');
  await stopViteServer();
  await stopSignalingServer();
  console.log('Servers stopped');
}

/**
 * Print test results summary.
 */
export function printResults(results) {
  console.log('\n============================================');
  console.log('   Test Results');
  console.log('============================================\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${result.name}`);
    if (result.passed) passed++;
    else failed++;
  }

  console.log(`\n  Total: ${passed} passed, ${failed} failed\n`);

  return { passed, failed };
}
