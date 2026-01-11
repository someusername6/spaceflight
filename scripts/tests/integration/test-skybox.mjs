/**
 * Test script to render and screenshot the skybox for visual inspection.
 * Runs headless browser, captures the skybox from multiple angles.
 */

import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');
const OUTPUT_DIR = join(__dirname, '..', '..', '..', 'test-output');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

// Simple static file server
function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (_err) {
        res.writeHead(500);
        res.end('Server error');
      }
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

describe('Skybox', () => {
  let server;
  let browser;
  let page;

  before(async () => {
    // Ensure dist exists
    assert.ok(
      existsSync(DIST_DIR),
      'dist/ not found. Run npm run build first.',
    );

    // Create output dir
    mkdirSync(OUTPUT_DIR, { recursive: true });

    server = await startServer(3999);

    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log('Loading game...');
    await page.goto('http://localhost:3999', { waitUntil: 'networkidle0' });

    // Wait for WebGL to render
    await new Promise((r) => setTimeout(r, 2000));
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.close();
    }
  });

  it('should capture skybox screenshot', async () => {
    const screenshotPath = join(OUTPUT_DIR, 'skybox-test.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    assert.ok(existsSync(screenshotPath), 'Screenshot should be saved');
  });

  it('should have WebGL canvas', async () => {
    const hasCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      return !!gl;
    });
    assert.ok(hasCanvas, 'Should have WebGL-enabled canvas');
  });
});
