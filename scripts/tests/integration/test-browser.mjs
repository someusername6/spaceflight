/**
 * Browser test - captures console output to debug rendering issues.
 */

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import puppeteer from 'puppeteer';

describe('Browser', () => {
  let vite;
  let browser;
  let page;
  const logs = [];

  before(async () => {
    // Start Vite dev server
    console.log('Starting Vite dev server...');
    vite = spawn('npx', ['vite', '--port', '5173'], {
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
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();

    // Capture console messages
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
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (vite) {
      vite.kill();
    }
  });

  it('should have a canvas element', async () => {
    const hasCanvas = await page.evaluate(() => {
      return !!document.querySelector('canvas');
    });
    assert.ok(hasCanvas, 'Should have a canvas element');
  });

  it('should have canvas with dimensions', async () => {
    const dimensions = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        width: canvas?.width,
        height: canvas?.height,
      };
    });
    assert.ok(dimensions.width > 0, 'Canvas should have width');
    assert.ok(dimensions.height > 0, 'Canvas should have height');
  });

  it('should have HUD visible', async () => {
    const hudVisible = await page.evaluate(() => {
      return !!document.getElementById('hud');
    });
    assert.ok(hudVisible, 'HUD should be visible');
  });

  it('should have hull bar', async () => {
    const hullBar = await page.evaluate(() => {
      return document.querySelector('.hull-bar .bar-fill')?.style.width;
    });
    assert.ok(hullBar !== undefined, 'Hull bar should exist');
  });

  it('should have shield bar', async () => {
    const shieldBar = await page.evaluate(() => {
      return document.querySelector('.shield-bar .bar-fill')?.style.width;
    });
    assert.ok(shieldBar !== undefined, 'Shield bar should exist');
  });

  it('should have no critical errors in console', () => {
    console.log('\n=== Console Logs ===');
    for (const log of logs) {
      console.log(log);
    }

    const criticalErrors = logs.filter(
      (log) => log.startsWith('[error]') && !log.includes('ResizeObserver'),
    );
    assert.strictEqual(
      criticalErrors.length,
      0,
      `Should have no critical errors: ${criticalErrors.join(', ')}`,
    );
  });
});
