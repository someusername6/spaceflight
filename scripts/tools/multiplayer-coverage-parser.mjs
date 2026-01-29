/**
 * Multiplayer Coverage Parser
 *
 * Parses @mp-* annotations and scans test files for the coverage report.
 */

import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// Configuration
// =============================================================================

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
export const PROTOCOL_FILES = [
  'src/multiplayer/protocol/types.ts',
  'src/multiplayer/protocol/messages.ts',
];
export const E2E_TEST_DIR = 'scripts/tests/multiplayer/e2e';
export const UNIT_TEST_DIR = 'scripts/tests/multiplayer/unit';

// =============================================================================
// Types
// =============================================================================

/**
 * @typedef {Object} MpAnnotation
 * @property {string} name - Interface/type name
 * @property {string} file - Source file path
 * @property {string} operation - @mp-operation value
 * @property {string} actor - @mp-actor value
 * @property {string} permission - @mp-permission value
 * @property {string} flow - @mp-flow value
 * @property {string} ui - @mp-ui value
 * @property {string} tested - @mp-tested value
 * @property {string} status - @mp-status value
 */

// =============================================================================
// Annotation Parser
// =============================================================================

/**
 * Parse @mp-* annotations from a TypeScript file.
 * @param {string} filePath
 * @returns {MpAnnotation[]}
 */
export function parseAnnotations(filePath) {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, filePath), 'utf-8');
  const annotations = [];

  // Match JSDoc blocks followed by interface/type declarations
  const blockRegex =
    /\/\*\*[\s\S]*?\*\/\s*export\s+(?:interface|type)\s+(\w+)/g;

  for (const match of content.matchAll(blockRegex)) {
    const fullMatch = match[0];
    const name = match[1];

    // Extract @mp-* tags
    const annotation = {
      name,
      file: filePath,
      operation: extractTag(fullMatch, 'mp-operation'),
      actor: extractTag(fullMatch, 'mp-actor'),
      permission: extractTag(fullMatch, 'mp-permission'),
      flow: extractTag(fullMatch, 'mp-flow'),
      ui: extractTag(fullMatch, 'mp-ui'),
      tested: extractTag(fullMatch, 'mp-tested'),
      status: extractTag(fullMatch, 'mp-status'),
    };

    // Only include if it has @mp-operation (indicating it's an annotated type)
    if (annotation.operation) {
      annotations.push(annotation);
    }
  }

  return annotations;
}

/**
 * Extract a tag value from a JSDoc block.
 * @param {string} block
 * @param {string} tag
 * @returns {string}
 */
function extractTag(block, tag) {
  const regex = new RegExp(`@${tag}\\s+(.+?)(?:\\n|\\*/)`, 's');
  const match = block.match(regex);
  if (!match) return '';
  // Clean up: remove trailing * and whitespace
  return match[1].replace(/\s*\*\s*$/, '').trim();
}

/**
 * Extract status detail from annotation by re-reading the file.
 * @param {MpAnnotation} ann
 * @returns {string}
 */
export function extractStatusDetail(ann) {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, ann.file), 'utf-8');
  const regex = /@mp-status\s+stub\s*-?\s*(.+?)(?=\n\s*\*|\*\/)/s;
  const blockStart = content.indexOf(`interface ${ann.name}`);
  if (blockStart === -1) return '';

  const blockSearch = content.slice(Math.max(0, blockStart - 1000), blockStart);
  const match = blockSearch.match(regex);
  return match ? match[1].trim() : '';
}

// =============================================================================
// Test Scanner
// =============================================================================

/**
 * Scan test directories for test files and function names.
 * @returns {Map<string, Set<string>>} Map of file path to test function names
 */
export function scanTestFiles() {
  const testMap = new Map();

  // Scan E2E tests
  scanDirectory(E2E_TEST_DIR, testMap);

  // Scan unit tests
  scanDirectory(UNIT_TEST_DIR, testMap);

  return testMap;
}

/**
 * Scan a directory for test files.
 * @param {string} dir
 * @param {Map<string, Set<string>>} testMap
 */
function scanDirectory(dir, testMap) {
  const fullDir = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(fullDir)) return;

  const files = fs.readdirSync(fullDir);
  for (const file of files) {
    if (!file.endsWith('.mjs') && !file.endsWith('.ts')) continue;

    const filePath = path.join(dir, file);
    const content = fs.readFileSync(path.join(PROJECT_ROOT, filePath), 'utf-8');

    // Extract function names (function testXxx, const testXxx, it('xxx'))
    const functions = new Set();

    // Match function declarations
    const funcRegex = /(?:function|const)\s+(test\w+)/g;
    for (const match of content.matchAll(funcRegex)) {
      functions.add(match[1]);
    }

    // Match describe/it blocks
    const itRegex = /(?:it|describe)\s*\(\s*['"]([^'"]+)['"]/g;
    for (const match of content.matchAll(itRegex)) {
      // Convert to function-like name
      const testName = match[1]
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      functions.add(testName);
    }

    if (functions.size > 0) {
      testMap.set(filePath, functions);
    }
  }
}

/**
 * Check if a test reference exists in the test map.
 * @param {string} testRef - e.g., "e2e/state-sync-guest-store.mjs:testGuestBuyWithPermission"
 * @param {Map<string, Set<string>>} testMap
 * @returns {{found: boolean, file: string, func: string}}
 */
export function checkTestReference(testRef, testMap) {
  if (!testRef || testRef === 'none' || testRef.startsWith('none')) {
    return { found: false, file: '', func: '' };
  }

  // Handle multiple tests (comma-separated)
  const refs = testRef.split(',').map((r) => r.trim());
  for (const ref of refs) {
    // Skip parenthetical notes like "(implicit via action tests)"
    if (ref.startsWith('(')) continue;

    // Handle references with function name
    const colonIdx = ref.indexOf(':');
    const fileRef = colonIdx > 0 ? ref.slice(0, colonIdx) : ref;
    const funcName = colonIdx > 0 ? ref.slice(colonIdx + 1) : '';

    if (!fileRef) continue;

    // Normalize file path
    let filePath = fileRef;
    if (!filePath.startsWith('scripts/')) {
      if (filePath.startsWith('e2e/')) {
        filePath = `scripts/tests/multiplayer/${filePath}`;
      } else if (filePath.startsWith('unit/')) {
        filePath = `scripts/tests/multiplayer/${filePath}`;
      }
    }

    // Try to find matching file
    const functions = testMap.get(filePath);
    if (functions) {
      if (!funcName || functions.has(funcName)) {
        return { found: true, file: filePath, func: funcName || '(any)' };
      }
    }

    // Try glob-style matching for patterns like "state-sync-*.mjs"
    if (fileRef.includes('*')) {
      const pattern = fileRef.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      for (const [testFile] of testMap) {
        if (regex.test(testFile)) {
          return { found: true, file: testFile, func: '(pattern match)' };
        }
      }
    }
  }

  return { found: false, file: testRef, func: '' };
}
