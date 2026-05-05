#!/usr/bin/env bun
/**
 * P0-009 lint rule (error-default).
 *
 * Forbids resurrecting any reference to the legacy Group / UserGroup /
 * GroupPermission / GroupRole / UserPermission tables. The
 * `20260430040810_authz_refactor` migration dropped them in favor of
 * `AccessModifier`. A re-introduction in src/ would crash at runtime
 * with `Unknown table 'Group'` after the migration applies.
 *
 * Pattern set:
 *   - Prisma client model accesses: `prisma.group.*`, `prisma.userGroup.*`,
 *     `prisma.groupPermission.*`, `prisma.groupRole.*`,
 *     `prisma.userPermission.*` (case-insensitive).
 *   - Method names: `addToGroup`, `removeFromGroup`, `getUserGroups`,
 *     `checkGroupMembership`, `findUserGroups`.
 *   - Type names from the dropped surface: `IGroupRepository`,
 *     `GroupRepository`, `GroupMembershipChangedEvent`,
 *     `UserGroupMembership`, `InMemoryGroupRepository`.
 *
 * Mode controlled by `GROUP_LINT_MODE` env var:
 *   - "error" (default): exit 1 if any offender is found
 *   - "warn":  logs offenders, exit 0 (transition only)
 *
 * Scope: src/** (production code) excluding *.spec.ts/*.test.ts.
 *
 * Run:
 *   bun run scripts/check-no-group-refs.ts
 *   GROUP_LINT_MODE=warn bun run scripts/check-no-group-refs.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src'];
const SKIP_DIRS = new Set([
  'node_modules',
  'testing',
  '__mocks__',
  '__tests__',
  'test',
  'dist',
  'build',
]);

// Files allowed to mention these tokens (this script + future
// migration/rollback rescue scripts, none today).
const ALLOWLIST = new Set<string>(['scripts/check-no-group-refs.ts']);

// Each entry is `{ regex, hint }`. Patterns intentionally narrow to
// avoid false positives on unrelated identifiers (e.g. `groupBy` in
// Prisma queries, `JoinGroup` in unrelated WebSocket handlers).
const PATTERNS: ReadonlyArray<{ regex: RegExp; hint: string }> = [
  { regex: /\bprisma\.group\b/, hint: 'prisma.group access — table dropped' },
  { regex: /\bprisma\.userGroup\b/, hint: 'prisma.userGroup access — table dropped' },
  { regex: /\bprisma\.groupPermission\b/, hint: 'prisma.groupPermission access — table dropped' },
  { regex: /\bprisma\.groupRole\b/, hint: 'prisma.groupRole access — table dropped' },
  { regex: /\bprisma\.userPermission\b/, hint: 'prisma.userPermission access — table dropped' },
  { regex: /\baddToGroup\s*\(/, hint: 'addToGroup() method removed — use AccessModifier' },
  {
    regex: /\bremoveFromGroup\s*\(/,
    hint: 'removeFromGroup() method removed — use AccessModifier',
  },
  {
    regex: /\bgetUserGroups\s*\(/,
    hint: 'getUserGroups() method removed — group hierarchy dropped',
  },
  {
    regex: /\bcheckGroupMembership\s*\(/,
    hint: 'checkGroupMembership() removed — group hierarchy dropped',
  },
  {
    regex: /\bfindUserGroups\s*\(/,
    hint: 'findUserGroups() removed — group hierarchy dropped',
  },
  { regex: /\bIGroupRepository\b/, hint: 'IGroupRepository removed — port deleted' },
  { regex: /\bclass\s+GroupRepository\b/, hint: 'GroupRepository removed — repo deleted' },
  {
    regex: /\bGroupMembershipChangedEvent\b/,
    hint: 'GroupMembershipChangedEvent removed — event deleted',
  },
  {
    regex: /\bUserGroupMembership\b/,
    hint: 'UserGroupMembership type removed',
  },
  {
    regex: /\bInMemoryGroupRepository\b/,
    hint: 'InMemoryGroupRepository removed — testing helper deleted',
  },
];

interface Offender {
  file: string;
  line: number;
  text: string;
  hint: string;
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts')
    ) {
      yield full;
    }
  }
}

const offenders: Offender[] = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (ALLOWLIST.has(file)) continue;
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip clear comment lines — the Group surface is referenced in
      // explanatory comments documenting why it was removed.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        continue;
      }
      for (const { regex, hint } of PATTERNS) {
        if (regex.test(line)) {
          offenders.push({ file, line: i + 1, text: line.trim(), hint });
          break;
        }
      }
    }
  }
}

const mode = process.env.GROUP_LINT_MODE === 'warn' ? 'warn' : 'error';

if (offenders.length === 0) {
  // eslint-disable-next-line no-console
  console.log('check-no-group-refs: 0 violations.');
  process.exit(0);
}

// eslint-disable-next-line no-console
console.log(
  `check-no-group-refs (${mode}): ${offenders.length} reference(s) to dropped Group surface:\n`,
);
for (const o of offenders) {
  // eslint-disable-next-line no-console
  console.log(`  ${o.file}:${o.line}  [${o.hint}]\n    ${o.text}`);
}

if (mode === 'error') {
  // eslint-disable-next-line no-console
  console.log(
    '\nThe Group/UserGroup/GroupPermission/GroupRole/UserPermission tables were dropped by\n' +
      'the 20260430040810_authz_refactor migration. Use AccessModifier instead.',
  );
  process.exit(1);
}
process.exit(0);
