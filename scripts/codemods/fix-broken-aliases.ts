#!/usr/bin/env bun
/**
 * Patch para imports com alias @/ que ts-morph não atualizou
 * após standardize-suffixes. Faz find/replace string-based em todos
 * os .ts e .ts.spec do projeto (incluindo test/, scripts/).
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..', '..');

// pares: [old-suffix-less-import-path, new-suffix-less-import-path]
const replacements: Array<[string, string]> = [
  ['@/shared-kernel/http/route.types', '@/shared-kernel/http/route.types'],
  ['@/shared-kernel/http/error.mapper', '@/shared-kernel/http/error.mapper'],
  [
    '@/shared-kernel/authorization/permission-resolver.service',
    '@/shared-kernel/authorization/permission-resolver.service',
  ],
  [
    '@/shared-kernel/authorization/permission-groups.config',
    '@/shared-kernel/authorization/permission-groups.config',
  ],
  ['@/shared-kernel/utils/locale-resolver.util', '@/shared-kernel/utils/locale-resolver.util'],
  [
    '@/bounded-contexts/identity/authorization/seeds/seed.runner',
    '@/bounded-contexts/identity/authorization/seeds/seed.runner',
  ],
  [
    '@/bounded-contexts/platform/i18n/application/zod-issue-to-code.mapper',
    '@/bounded-contexts/platform/i18n/application/zod-issue-to-code.mapper',
  ],
  [
    '@/bounded-contexts/platform/feature-flags/domain/feature-flag-graph.service',
    '@/bounded-contexts/platform/feature-flags/domain/feature-flag-graph.service',
  ],
  [
    '@/bounded-contexts/onboarding/domain/config/onboarding-validation.rules',
    '@/bounded-contexts/onboarding/domain/config/onboarding-validation.rules',
  ],
  [
    '@/bounded-contexts/import/domain/services/json-resume.parser',
    '@/bounded-contexts/import/domain/services/json-resume.parser',
  ],
  [
    '@/bounded-contexts/dsl/application/compilers/theme.compiler',
    '@/bounded-contexts/dsl/application/compilers/theme.compiler',
  ],
  [
    '@/bounded-contexts/dsl/application/parsers/expression.parser',
    '@/bounded-contexts/dsl/application/parsers/expression.parser',
  ],
  [
    '@/bounded-contexts/dsl/application/parsers/expression.lexer',
    '@/bounded-contexts/dsl/application/parsers/expression.lexer',
  ],
  [
    '@/bounded-contexts/dsl/application/compilers/token.evaluator',
    '@/bounded-contexts/dsl/application/compilers/token.evaluator',
  ],
  [
    '@/bounded-contexts/dsl/application/compilers/color.functions',
    '@/bounded-contexts/dsl/application/compilers/color.functions',
  ],
  [
    '@/bounded-contexts/platform/ui-metadata/application/services/enum-catalog.service',
    '@/bounded-contexts/platform/ui-metadata/application/services/enum-catalog.service',
  ],
  [
    '@/bounded-contexts/platform/ui-metadata/application/services/menu.builder',
    '@/bounded-contexts/platform/ui-metadata/application/services/menu.builder',
  ],
  [
    '@/bounded-contexts/jobs/domain/entities/job.entity',
    '@/bounded-contexts/jobs/domain/entities/job.entity',
  ],
  [
    '@/bounded-contexts/notifications/domain/entities/notification.entity',
    '@/bounded-contexts/notifications/domain/entities/notification.entity',
  ],
  [
    '@/bounded-contexts/feed/domain/entities/post.entity',
    '@/bounded-contexts/feed/domain/entities/post.entity',
  ],
  [
    '@/bounded-contexts/analytics/resume-analytics/domain/value-objects/industry-keywords.vo',
    '@/bounded-contexts/analytics/resume-analytics/domain/value-objects/industry-keywords.vo',
  ],
  [
    '@/bounded-contexts/resumes/domain/value-objects/locale-content.vo',
    '@/bounded-contexts/resumes/domain/value-objects/locale-content.vo',
  ],
  [
    '@/bounded-contexts/resumes/domain/value-objects/resume-dsl.vo',
    '@/bounded-contexts/resumes/domain/value-objects/resume-dsl.vo',
  ],
  [
    '@/bounded-contexts/resumes/variants/domain/variant-overlay.types',
    '@/bounded-contexts/resumes/variants/domain/variant-overlay.types',
  ],
  [
    '@/bounded-contexts/import/application/use-cases/import-github/parse-github-profile.helper',
    '@/bounded-contexts/import/application/use-cases/import-github/parse-github-profile.helper',
  ],
  [
    '@/bounded-contexts/resumes/time-capsule/time-capsule-email.builder',
    '@/bounded-contexts/resumes/time-capsule/time-capsule-email.builder',
  ],
  [
    '@/bounded-contexts/collaboration/chat/gateways/chat.handler',
    '@/bounded-contexts/collaboration/chat/gateways/chat.handler',
  ],
  [
    '@/infrastructure/elysia-adapter/cookie-bridge.adapter',
    '@/infrastructure/elysia-adapter/cookie-bridge.adapter',
  ],
  [
    '@/bounded-contexts/integration/mec-sync/testing/in-memory-mec.repository',
    '@/bounded-contexts/integration/mec-sync/testing/in-memory-mec.repository',
  ],
  [
    '@/bounded-contexts/identity/shared-kernel/testing/stubs/stub-authorization.service',
    '@/bounded-contexts/identity/shared-kernel/testing/stubs/stub-authorization.service',
  ],
  [
    '@/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-authorization.service',
    '@/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-authorization.service',
  ],
  [
    '@/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-audit-logger.adapter',
    '@/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-audit-logger.adapter',
  ],
];

const SCAN_DIRS = ['src', 'test', 'scripts'];
const EXCLUDE = new Set(['node_modules', 'dist', '.git']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
let totalFiles = 0;
let totalReplacements = 0;

for (const f of files) {
  const original = readFileSync(f, 'utf8');
  let updated = original;
  let replaced = 0;
  for (const [from, to] of replacements) {
    // match em strings: 'X' ou "X"
    const re = new RegExp(`(['"\`])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"\`])`, 'g');
    updated = updated.replace(re, (_m, q1, q2) => {
      replaced++;
      return `${q1}${to}${q2}`;
    });
  }
  if (replaced > 0) {
    writeFileSync(f, updated);
    totalFiles++;
    totalReplacements += replaced;
  }
}

console.log(`${totalReplacements} imports atualizados em ${totalFiles} arquivos.`);
