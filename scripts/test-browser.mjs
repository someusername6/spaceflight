/**
 * Browser test - captures console output to debug rendering issues.
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

// Start Vite dev server
console.log('Starting Vite dev server...');
const vite = spawn('npx', ['vite', '--port', '5173'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});

// Wait for server to be ready
await new Promise((resolve) => {
  vite.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Local:')) {
      resolve();
    }
  });
});

console.log('Server ready, launching browser...');

try {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const logs = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture errors
  page.on('pageerror', (err) => {
    logs.push(`[error] ${err.message}`);
  });

  // Capture request failures
  page.on('requestfailed', (req) => {
    logs.push(`[404] ${req.url()}`);
  });

  // Navigate to game
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Wait a bit for game to initialize
  await new Promise((r) => setTimeout(r, 2000));

  // Check for entities in the scene
  const debugInfo = await page.evaluate(() => {
    // Try to access Three.js scene
    const canvas = document.querySelector('canvas');
    // Check if ships are visible by looking at scene children
    return {
      hasCanvas: !!canvas,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      hudVisible: !!document.getElementById('hud'),
      hullBar: document.querySelector('.hull-bar .bar-fill')?.style.width,
      shieldBar: document.querySelector('.shield-bar .bar-fill')?.style.width,
    };
  });

  console.log('\n=== Browser Debug Info ===');
  console.log('Debug info:', debugInfo);
  console.log('\n=== Console Logs ===');
  logs.forEach((log) => console.log(log));

  await browser.close();
} catch (err) {
  console.error('Browser test failed:', err);
} finally {
  vite.kill();
  process.exit(0);
}
