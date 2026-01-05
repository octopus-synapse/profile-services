#!/usr/bin/env ts-node
/**
 * Fix Smoke Tests API Versioning
 *
 * Updates all smoke test files to use versioned API routes (/api/v1/*)
 * instead of unversioned routes (/api/*).
 *
 * This is necessary after implementing API versioning (issue #26).
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SMOKE_TEST_DIR = join(__dirname, '..', 'test', 'smoke');

const SMOKE_TEST_FILES = [
  'auth.smoke.spec.ts',
  'dsl-flow.smoke.spec.ts',
  'resume.smoke.spec.ts',
  'sub-resources.smoke.spec.ts',
  'setup.ts',
];

/**
 * Replace /api/ with /api/v1/ in API routes, preserving health check routes
 * Also fixes routes that are missing the /api/ prefix entirely
 */
function fixApiVersioning(content: string): string {
  let fixed = content;

  // Fix /api/ -> /api/v1/ (preserving health check routes)
  fixed = fixed.replace(
    /(['"`])\/api\/(?!health|v1)([^'"`]+)\1/g,
    '$1/api/v1/$2$1',
  );

  // Fix routes missing /api/ prefix (like /auth/login -> /api/v1/auth/login)
  // Match routes starting with / but not /api/ or /health
  fixed = fixed.replace(
    /(['"`])\/(?!api\/|health)([a-z][a-z-]*\/[^'"`]+)\1/g,
    '$1/api/v1/$2$1',
  );

  return fixed;
}

let totalReplacements = 0;

for (const filename of SMOKE_TEST_FILES) {
  const filePath = join(SMOKE_TEST_DIR, filename);
  const originalContent = readFileSync(filePath, 'utf-8');
  const fixedContent = fixApiVersioning(originalContent);

  if (originalContent !== fixedContent) {
    writeFileSync(filePath, fixedContent, 'utf-8');

    // Count replacements
    const matches = (originalContent.match(/\/api\/(?!health)/g) || []).length;
    totalReplacements += matches;

    console.log(`✓ ${filename}: ${matches} routes updated`);
  } else {
    console.log(`  ${filename}: already up-to-date`);
  }
}

console.log(`\n${totalReplacements} API routes updated to /v1/ prefix`);
console.log('\nHealth check routes preserved:');
console.log('  - /api/health');
console.log('  - /api/health/db');
