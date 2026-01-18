/**
 * CoACD (Collision-Aware Convex Decomposition) integration.
 *
 * Uses Python script for convex decomposition of non-convex meshes.
 * CoACD is the modern replacement for V-HACD, specifically designed
 * to preserve holes and fine details.
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Decompose a mesh into convex parts using CoACD (via Python).
 *
 * @param positions - Flat array of vertex positions [x,y,z,x,y,z,...]
 * @param indices - Flat array of triangle indices
 * @returns Array of convex mesh parts, each with positions and indices
 */
export async function decomposeWithCoACD(positions, indices) {
  const scriptPath = join(__dirname, 'convex-decompose.py');
  const input = JSON.stringify({ positions, indices });

  return new Promise((resolve, reject) => {
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`CoACD failed (exit ${code}): ${stderr || stdout}`));
        return;
      }

      try {
        // CoACD logs to stdout, so we need to find the JSON at the end
        // Look for the last line that starts with '{'
        const lines = stdout.trim().split('\n');
        let jsonLine = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith('{') && line.endsWith('}')) {
            jsonLine = line;
            break;
          }
        }

        if (!jsonLine) {
          reject(new Error(`CoACD: No JSON output found`));
          return;
        }

        const result = JSON.parse(jsonLine);
        if (result.error) {
          reject(new Error(`CoACD error: ${result.error}`));
          return;
        }
        resolve(result.hulls || []);
      } catch (e) {
        reject(new Error(`CoACD invalid output: ${e.message}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    // Send input and close stdin
    python.stdin.write(input);
    python.stdin.end();
  });
}
