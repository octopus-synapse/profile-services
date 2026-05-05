#!/usr/bin/env bun
/**
 * Q32 / Q75 lint rule (warning-then-error transition — flipped to
 * error-default after the four sweep call sites + domain cache
 * services were allowlisted).
 *
 * Forbids direct `cache.delete(...)` / `cache.deletePattern(...)` /
 * `cachePort.delete*(...)` calls outside of the canonical
 * `CacheInvalidationService` and the per-domain cache services that
 * are themselves the BC's invalidation surface.
 *
 * Mode controlled by `CACHE_LINT_MODE` env var:
 *   - "error" (default): exit 1 if any offender is found
 *   - "warn":  logs offenders, exit 0 (use during a future migration)
 *
 * Run:
 *   bun run scripts/lint-cache-direct-delete.ts
 *   CACHE_LINT_MODE=error bun run scripts/lint-cache-direct-delete.ts
 *
 * Wire into precommit:
 *   - name: cache-invalidation-lint
 *     cmd: bun run scripts/lint-cache-direct-delete.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const SKIP_DIRS = new Set(['node_modules', 'testing', '__mocks__', '__tests__']);

// Files allowed to use cache.delete*/deletePattern directly:
//   - the canonical invalidation service (its whole reason to exist)
//   - the cache adapters / cache ports themselves
//   - per-domain cache services that ARE the canonical invalidation
//     surface for their bounded context (chat-cache, mec-cache, etc.)
//   - the LRU eviction logic in authorization (cache.delete is the
//     primitive backing the cache, not application-level invalidation)
const ALLOWLIST = new Set([
  'src/bounded-contexts/platform/common/cache/services/cache-invalidation.service.ts',
  'src/bounded-contexts/platform/common/cache/services/cache-core.service.ts',
  'src/bounded-contexts/platform/common/cache/cache-lock.service.ts',
  'src/shared-kernel/cache/cache.port.ts',
  'src/shared-kernel/cache/cache-invalidation.port.ts',
  // Domain cache services / facades — these wrap domain-typed cache
  // ports (MecCachePort, ChatCachePort, AuthorizationCachePort) that
  // are themselves the BC's invalidation surface. The application code
  // depends on the domain port; only the adapter writes to CachePort.
  'src/bounded-contexts/integration/mec-sync/infrastructure/adapters/external-services/redis-mec-cache.adapter.ts',
  'src/bounded-contexts/integration/mec-sync/application/services/data-sync.service.ts',
  'src/bounded-contexts/collaboration/chat/services/chat-cache.service.ts',
  'src/bounded-contexts/identity/authorization/infrastructure/adapters/cache/authorization-cache.adapter.ts',
  'src/bounded-contexts/identity/authorization/application/services/authorization.service.ts',
  'src/bounded-contexts/skills-catalog/tech-skills/services/tech-skills-sync.service.ts',
  'src/bounded-contexts/job-match/infrastructure/workers/job-match-recompute.worker.ts',
]);

const PATTERN =
  /\b(?:cache|cachePort|this\.cache)\.(?:delete|deletePattern)\s*\(/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) yield full;
  }
}

const offenders: Array<{ file: string; line: number; text: string }> = [];

for (const file of walk(ROOT)) {
  if (ALLOWLIST.has(file)) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (PATTERN.test(lines[i])) {
      offenders.push({ file, line: i + 1, text: lines[i].trim() });
    }
  }
}

const mode = process.env.CACHE_LINT_MODE === 'warn' ? 'warn' : 'error';

if (offenders.length === 0) {
  // eslint-disable-next-line no-console
  console.log('cache-invalidation-lint: 0 violations.');
  process.exit(0);
}

// eslint-disable-next-line no-console
console.log(
  `cache-invalidation-lint (${mode}): ${offenders.length} direct cache.delete*/deletePattern call(s) outside CacheInvalidationService:\n`,
);
for (const o of offenders) {
  // eslint-disable-next-line no-console
  console.log(`  ${o.file}:${o.line}  ${o.text}`);
}

if (mode === 'error') {
  // eslint-disable-next-line no-console
  console.log(
    '\nMigrate the call sites to depend on CacheInvalidationPort, then re-run.',
  );
  process.exit(1);
}
process.exit(0);
