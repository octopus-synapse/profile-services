/**
 * Hexagonal Architecture Test Constants
 *
 * Auto-detection based on filesystem structure:
 *   - Has domain/ + application/ + infrastructure/ → MIGRATED (errors)
 *   - Missing any of those → PENDING (warnings only)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export const SOURCE_ROOT = path.join(process.cwd(), 'src', 'bounded-contexts');

// Skip these - infrastructure/cross-cutting, not domain modules
const SKIP_BOUNDED_CONTEXTS = ['platform'];
const SKIP_DIRECTORIES = ['shared-kernel', 'domain', 'application', 'infrastructure'];

// ============================================================================
// AUTO-DISCOVER ALL MODULES
// ============================================================================
function discoverModules(): string[] {
  const modules: string[] = [];

  if (!fs.existsSync(SOURCE_ROOT)) return modules;

  const boundedContexts = fs
    .readdirSync(SOURCE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SKIP_BOUNDED_CONTEXTS.includes(d.name))
    .map((d) => d.name);

  for (const bc of boundedContexts) {
    const bcPath = path.join(SOURCE_ROOT, bc);
    const entries = fs.readdirSync(bcPath, { withFileTypes: true });

    // Get subdirectories (potential modules)
    const subdirs = entries.filter((e) => e.isDirectory() && !SKIP_DIRECTORIES.includes(e.name));

    // If BC has subdirectories with .module.ts, those are the modules
    let hasSubmodules = false;
    for (const entry of subdirs) {
      const subPath = path.join(bcPath, entry.name);
      const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
      const subHasModule = subEntries.some((e) => e.isFile() && e.name.endsWith('.module.ts'));

      if (subHasModule) {
        hasSubmodules = true;
        modules.push(`${bc}/${entry.name}`);
      } else {
        // Check one level deeper (e.g., integration/integrations/github)
        const deepDirs = subEntries.filter((e) => e.isDirectory());
        for (const deepEntry of deepDirs) {
          const deepPath = path.join(subPath, deepEntry.name);
          const deepEntries = fs.readdirSync(deepPath, { withFileTypes: true });
          const deepHasModule = deepEntries.some(
            (e) => e.isFile() && e.name.endsWith('.module.ts'),
          );
          if (deepHasModule) {
            hasSubmodules = true;
            modules.push(`${bc}/${entry.name}/${deepEntry.name}`);
          }
        }
      }
    }

    // If no submodules found, check if BC itself is a module
    if (!hasSubmodules) {
      const hasModuleFile = entries.some((e) => e.isFile() && e.name.endsWith('.module.ts'));
      if (hasModuleFile) {
        modules.push(bc);
      }
    }
  }

  return modules.sort();
}

// ============================================================================
// AUTO-DETECT MIGRATION STATUS
// ============================================================================
function hasHexagonalStructure(modulePath: string): boolean {
  const fullPath = path.join(SOURCE_ROOT, modulePath);
  const hasDomain = fs.existsSync(path.join(fullPath, 'domain'));
  const hasApplication = fs.existsSync(path.join(fullPath, 'application'));
  const hasInfrastructure = fs.existsSync(path.join(fullPath, 'infrastructure'));
  return hasDomain && hasApplication && hasInfrastructure;
}

// All discovered modules
export const HEXAGONAL_MODULES = discoverModules();

// Separate by migration status (auto-detected)
export const MIGRATED_MODULES = HEXAGONAL_MODULES.filter(hasHexagonalStructure);
export const PENDING_MODULES = HEXAGONAL_MODULES.filter((m) => !hasHexagonalStructure(m));

// ============================================================================
// BOUNDED CONTEXTS
// ============================================================================
export const BOUNDED_CONTEXTS = [
  'resumes',
  'identity',
  'skills-catalog',
  'presentation',
  'integration',
  'onboarding',
  'export',
  'import',
  'collaboration',
  'social',
  'analytics',
  'platform',
  'dsl',
  'ats-validation',
  'translation',
];

// ============================================================================
// EXEMPT MODULES (special cases that don't need Hexagonal structure)
// ============================================================================
export const EXEMPT_MODULES = [
  'identity/shared-kernel', // Shared kernel has different structure by design
];
