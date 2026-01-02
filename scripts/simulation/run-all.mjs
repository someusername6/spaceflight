#!/usr/bin/env node
/**
 * Run All Simulations
 *
 * Executes all simulation tests and reports results.
 * Run: npm run sim
 * Exit code: 0 if all pass, 1 if any fail
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIMULATIONS = [
  { name: 'Dust Particles', script: 'dust.mjs' },
  // Future simulations:
  // { name: 'Combat Balance', script: 'combat.mjs' },
  // { name: 'Economy', script: 'economy.mjs' },
  // { name: 'AI Behavior', script: 'ai.mjs' },
];

async function runSimulation(sim) {
  return new Promise((resolve) => {
    const scriptPath = join(__dirname, sim.script);
    const proc = spawn('node', [scriptPath], { stdio: 'inherit' });
    proc.on('close', (code) => resolve({ name: sim.name, passed: code === 0 }));
  });
}

async function main() {
  console.log('╔════════════════════════════════════╗');
  console.log('║     SPACEFLIGHT SIMULATIONS        ║');
  console.log('╚════════════════════════════════════╝\n');

  const results = [];
  for (const sim of SIMULATIONS) {
    const result = await runSimulation(sim);
    results.push(result);
    console.log('');
  }

  // Summary
  console.log('════════════════════════════════════');
  console.log('SUMMARY');
  console.log('════════════════════════════════════');

  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}  ${r.name}`);
    if (!r.passed) allPassed = false;
  }

  console.log('');
  if (allPassed) {
    console.log('All simulations passed!');
  } else {
    console.log('Some simulations failed.');
  }

  process.exit(allPassed ? 0 : 1);
}

main();
