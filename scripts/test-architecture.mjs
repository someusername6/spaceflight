/**
 * Architecture tests - enforces code quality rules.
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// Get all .ts files in a directory
function getTypeScriptFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.ts')) {
      files.push(path.join(dir, file));
    }
  }
  return files;
}

// Test: No module-level mutable state in systems
test('Systems have no module-level mutable state (let declarations)', () => {
  const systemFiles = getTypeScriptFiles('src/systems');
  const violations = [];

  for (const file of systemFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for 'let' at start of line (module-level)
      // Ignore 'let' inside functions (indented)
      if (/^let\s+/.test(line)) {
        violations.push(`${path.basename(file)}:${i + 1}: ${line.trim()}`);
      }
    }
  }

  assert(violations.length === 0,
    `Found module-level 'let' declarations:\n  ${violations.join('\n  ')}`);
});

// Test: No Math.random() usage (except in PRNG implementation)
test('No Math.random() usage in game code', () => {
  // Exclude core/ since PRNG implementation (mersenne-twister.ts) legitimately uses Math.random for seeding
  const dirs = ['src/systems', 'src/components'];
  const violations = [];

  for (const dir of dirs) {
    for (const file of getTypeScriptFiles(dir)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('Math.random()')) {
        violations.push(path.basename(file));
      }
    }
  }

  assert(violations.length === 0,
    `Found Math.random() in: ${violations.join(', ')}`);
});

// Test: No Date.now() usage in game logic
test('No Date.now() usage in game logic', () => {
  const dirs = ['src/systems', 'src/components'];
  const violations = [];

  for (const dir of dirs) {
    for (const file of getTypeScriptFiles(dir)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('Date.now()')) {
        violations.push(path.basename(file));
      }
    }
  }

  assert(violations.length === 0,
    `Found Date.now() in: ${violations.join(', ')}`);
});

// Test: All files under 300 lines
test('All .ts files under 300 lines', () => {
  const dirs = ['src/systems', 'src/components', 'src/core', 'src/rendering', 'src/factories'];
  const violations = [];

  for (const dir of dirs) {
    for (const file of getTypeScriptFiles(dir)) {
      const content = fs.readFileSync(file, 'utf8');
      const lineCount = content.split('\n').length;
      if (lineCount > 300) {
        violations.push(`${path.basename(file)}: ${lineCount} lines`);
      }
    }
  }

  assert(violations.length === 0,
    `Files over 300 lines:\n  ${violations.join('\n  ')}`);
});

// Test: Systems REGISTRY.md covers all system files
test('Systems REGISTRY.md covers all system files', () => {
  const registryPath = 'src/systems/REGISTRY.md';
  if (!fs.existsSync(registryPath)) {
    throw new Error('REGISTRY.md not found');
  }

  const registry = fs.readFileSync(registryPath, 'utf8');
  const systemFiles = getTypeScriptFiles('src/systems');
  const missing = [];

  for (const file of systemFiles) {
    const basename = path.basename(file);
    if (!registry.includes(basename)) {
      missing.push(basename);
    }
  }

  assert(missing.length === 0,
    `Systems not in REGISTRY.md: ${missing.join(', ')}`);
});

// Test: Rendering REGISTRY.md covers all rendering files
test('Rendering REGISTRY.md covers all rendering files', () => {
  const registryPath = 'src/rendering/REGISTRY.md';
  if (!fs.existsSync(registryPath)) {
    throw new Error('Rendering REGISTRY.md not found');
  }

  const registry = fs.readFileSync(registryPath, 'utf8');
  const renderFiles = getTypeScriptFiles('src/rendering');
  const missing = [];

  for (const file of renderFiles) {
    const basename = path.basename(file);
    if (!registry.includes(basename)) {
      missing.push(basename);
    }
  }

  assert(missing.length === 0,
    `Rendering files not in REGISTRY.md: ${missing.join(', ')}`);
});

// Test: World.systemState is used instead of module state
test('Systems use world.systemState for persistent state', () => {
  const content = fs.readFileSync('src/core/types.ts', 'utf8');
  assert(content.includes('systemState: SystemState'),
    'World should have systemState field');
  assert(content.includes('interface SystemState'),
    'SystemState interface should be defined');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
