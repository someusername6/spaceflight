/**
 * Test skybox with exact parameters from reference seed "7alzyiphy3k0"
 */

import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const OUTPUT_DIR = join(__dirname, '..', 'test-output');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
};

function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
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
      } catch (err) {
        res.writeHead(500);
        res.end('Server error');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!existsSync(DIST_DIR)) {
    console.error('dist/ not found. Run npm run build first.');
    process.exit(1);
  }

  const server = await startServer(3997);
  console.log('Server running at http://localhost:3997');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 480, height: 480 });

  await page.goto('http://localhost:3997', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const screenshotPath = join(OUTPUT_DIR, 'skybox-reference-seed.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
  server.close();
}

run().catch(console.error);
