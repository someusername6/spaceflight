#!/usr/bin/env npx tsx
/**
 * Multiplayer Coverage Report Generator
 *
 * Parses @mp-* annotations from protocol files and cross-references
 * with E2E test files to generate a coverage report.
 *
 * Usage: npx tsx scripts/tools/multiplayer-coverage.mjs
 */

import {
  checkTestReference,
  extractStatusDetail,
  PROTOCOL_FILES,
  parseAnnotations,
  scanTestFiles,
} from './multiplayer-coverage-parser.mjs';

// =============================================================================
// Report Generator
// =============================================================================

/**
 * Generate the coverage report.
 */
function generateReport() {
  console.log('MULTIPLAYER COVERAGE REPORT');
  console.log('===========================\n');

  // Parse all annotations
  const allAnnotations = [];
  for (const file of PROTOCOL_FILES) {
    const annotations = parseAnnotations(file);
    allAnnotations.push(...annotations);
  }

  // Scan test files
  const testMap = scanTestFiles();

  // Categorize by status
  const implemented = [];
  const partial = [];
  const stub = [];
  const dead = [];

  for (const ann of allAnnotations) {
    const testCheck = checkTestReference(ann.tested, testMap);

    // Categorize by status (status may have notes after " - ")
    const statusBase = ann.status.split(' - ')[0].trim();
    switch (statusBase) {
      case 'implemented':
        implemented.push({ ...ann, testFound: testCheck.found });
        break;
      case 'partial':
        partial.push({ ...ann, testFound: testCheck.found });
        break;
      case 'stub':
        stub.push({ ...ann, testFound: testCheck.found });
        break;
      case 'dead':
        dead.push({ ...ann, testFound: testCheck.found });
        break;
      default:
        // Unknown status
        implemented.push({ ...ann, testFound: testCheck.found });
    }
  }

  // Summary
  const total = allAnnotations.length;
  const testedCount = allAnnotations.filter((a) => {
    const check = checkTestReference(a.tested, testMap);
    return check.found;
  }).length;
  const untestedImpl = implemented.filter(
    (a) => a.tested === 'none' || !a.testFound,
  );

  console.log(`Operations: ${total} total`);
  console.log(`  - ${implemented.length} implemented (${testedCount} tested)`);
  if (untestedImpl.length > 0) {
    console.log(`  - ${untestedImpl.length} implemented but untested`);
  }
  if (partial.length > 0) {
    console.log(`  - ${partial.length} partial`);
  }
  if (stub.length > 0) {
    console.log(`  - ${stub.length} stub`);
  }
  if (dead.length > 0) {
    console.log(`  - ${dead.length} dead code`);
  }

  // Coverage by actor
  printActorBreakdown(allAnnotations);

  // Detailed sections
  printUntestedImplementations(untestedImpl);
  printPartialImplementations(partial);
  printStubs(stub);
  printDeadCode(dead);

  // Test reference validation
  printTestValidation(allAnnotations, testMap);

  // Full operation list
  printAllOperations(allAnnotations, testMap);

  // Action coverage matrix
  printActionMatrix(allAnnotations);
}

/**
 * Print actor breakdown.
 */
function printActorBreakdown(allAnnotations) {
  console.log('\n## By Actor');
  const hostOnly = allAnnotations.filter(
    (a) => a.actor === 'host' && !a.actor.includes('guest'),
  );
  const guestOnly = allAnnotations.filter(
    (a) => a.actor === 'guest' && !a.actor.includes('host'),
  );
  const both = allAnnotations.filter((a) => a.actor.includes('|'));
  console.log(`  - Host-only: ${hostOnly.length}`);
  console.log(`  - Guest-only: ${guestOnly.length}`);
  console.log(`  - Both: ${both.length}`);
}

/**
 * Print untested implementations.
 */
function printUntestedImplementations(untestedImpl) {
  if (untestedImpl.length === 0) return;

  console.log('\n## Implemented but Untested');
  for (const ann of untestedImpl) {
    console.log(`  - ${ann.operation} (${ann.name})`);
    console.log(`    Permission: ${ann.permission}`);
    console.log(`    Actor: ${ann.actor}`);
  }
}

/**
 * Print partial implementations.
 */
function printPartialImplementations(partial) {
  if (partial.length === 0) return;

  console.log('\n## Partial Implementations');
  for (const ann of partial) {
    console.log(`  - ${ann.operation} (${ann.name})`);
    console.log(`    Status note: ${ann.status}`);
  }
}

/**
 * Print stubs.
 */
function printStubs(stub) {
  if (stub.length === 0) return;

  console.log('\n## Stubs (Not Implemented)');
  for (const ann of stub) {
    console.log(`  - ${ann.operation} (${ann.name})`);
    const statusNote = ann.file.includes('messages')
      ? extractStatusDetail(ann)
      : '';
    if (statusNote) console.log(`    Note: ${statusNote}`);
  }
}

/**
 * Print dead code.
 */
function printDeadCode(dead) {
  if (dead.length === 0) return;

  console.log('\n## Dead Code');
  for (const ann of dead) {
    console.log(`  - ${ann.operation} (${ann.name})`);
  }
}

/**
 * Print test reference validation.
 */
function printTestValidation(allAnnotations, testMap) {
  console.log('\n## Test Reference Validation');
  let invalidRefs = 0;
  for (const ann of allAnnotations) {
    if (ann.tested && ann.tested !== 'none') {
      const check = checkTestReference(ann.tested, testMap);
      if (!check.found) {
        invalidRefs++;
        console.log(`  - ${ann.operation}: "${ann.tested}" NOT FOUND`);
      }
    }
  }
  if (invalidRefs === 0) {
    console.log('  All test references valid');
  }
}

/**
 * Print all operations table.
 */
function printAllOperations(allAnnotations, testMap) {
  console.log('\n## All Operations');
  console.log('| Operation | Actor | Permission | Status | Tested |');
  console.log('|-----------|-------|------------|--------|--------|');
  for (const ann of allAnnotations) {
    const testCheck = checkTestReference(ann.tested, testMap);
    const testedStr = testCheck.found
      ? 'Yes'
      : ann.tested === 'none'
        ? 'No'
        : 'Invalid';
    console.log(
      `| ${ann.operation} | ${ann.actor} | ${ann.permission || 'none'} | ${ann.status} | ${testedStr} |`,
    );
  }
}

/**
 * Print action test matrix.
 */
function printActionMatrix(allAnnotations) {
  console.log('\n## Action Test Matrix');
  console.log('(For actions that support both host and guest)');
  console.log('');
  console.log('| Action | Host | Guest+Perm | Guest-NoPerm |');
  console.log('|--------|------|------------|--------------|');

  const actions = allAnnotations.filter(
    (a) =>
      a.actor.includes('|') &&
      a.file.includes('types.ts') &&
      a.name.endsWith('Action'),
  );

  for (const action of actions) {
    const op = action.operation;
    const tests = action.tested;

    // Check for different test scenarios
    const hasHost = tests.toLowerCase().includes('host');
    const hasGuestPerm =
      tests.toLowerCase().includes('guestwith') ||
      tests.toLowerCase().includes('guest_with');
    const hasGuestNoPerm =
      tests.toLowerCase().includes('without') ||
      tests.toLowerCase().includes('noperm') ||
      tests.toLowerCase().includes('disabled');

    const hostStr = hasHost || tests !== 'none' ? '?' : '-';
    const guestPermStr = hasGuestPerm || tests !== 'none' ? '?' : '-';
    const guestNoPermStr = hasGuestNoPerm ? 'Yes' : '-';

    console.log(`| ${op} | ${hostStr} | ${guestPermStr} | ${guestNoPermStr} |`);
  }

  console.log('\n(? = tests exist but scenario coverage unclear, - = no test)');
}

// =============================================================================
// Main
// =============================================================================

generateReport();
