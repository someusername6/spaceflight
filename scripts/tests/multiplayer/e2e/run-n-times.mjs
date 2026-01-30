#!/usr/bin/env npx tsx
/**
 * Run a test file multiple times to check for flakiness.
 * Usage: npx tsx scripts/tests/multiplayer/e2e/run-n-times.mjs <test-file> [count]
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const testFile = process.argv[2];
const count = parseInt(process.argv[3] || '3', 10);

if (!testFile) {
  console.error('Usage: npx tsx run-n-times.mjs <test-file> [count]');
  process.exit(1);
}

const testPath = resolve(process.cwd(), testFile);

async function runTest(runNumber) {
  return new Promise((resolve) => {
    console.log(`\n=== Run ${runNumber} ===`);
    const proc = spawn('npx', ['tsx', testPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      // Extract relevant lines
      const lines = output
        .split('\n')
        .filter((line) => /DEBUG|PASSED|FAILED|Total:/.test(line));
      for (const line of lines) {
        console.log(line);
      }
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log(`Running ${testPath} ${count} times...\n`);

  const results = [];
  for (let i = 1; i <= count; i++) {
    const passed = await runTest(i);
    results.push(passed);
  }

  console.log('\n=== Summary ===');
  const passCount = results.filter(Boolean).length;
  console.log(`Passed: ${passCount}/${count}`);
  if (passCount < count) {
    console.log(
      'Flaky runs:',
      results
        .map((p, i) => (p ? null : i + 1))
        .filter(Boolean)
        .join(', '),
    );
  }
}

main().catch(console.error);
