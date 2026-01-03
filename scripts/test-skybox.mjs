/**
 * Test script to render and screenshot the skybox for visual inspection.
 * Runs headless browser, captures the skybox from multiple angles.
 */

import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const OUTPUT_DIR = join(__dirname, '..', 'test-output');

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

async function captureScreenshot() {
  // Ensure dist exists
  if (!existsSync(DIST_DIR)) {
    console.error('dist/ not found. Run npm run build first.');
    process.exit(1);
  }

  // Create output dir
  const { mkdirSync } = await import('node:fs');
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const server = await startServer(3999);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Loading game...');
  await page.goto('http://localhost:3999', { waitUntil: 'networkidle0' });

  // Wait for WebGL to render
  await new Promise((r) => setTimeout(r, 2000));

  // Take screenshot
  const screenshotPath = join(OUTPUT_DIR, 'skybox-test.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
  server.close();

  console.log('Done!');
}

captureScreenshot().catch(console.error);
