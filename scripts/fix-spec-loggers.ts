#!/usr/bin/env bun
/**
 * Patches specs that instantiate the freshly-migrated classes so the
 * extra LoggerPort constructor argument is supplied. Targets each
 * `new <ClassName>(...)` call and appends a stub logger when the class
 * is on the migrated list.
 */

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..');

interface Patch {
  file: string;
  className: string;
  expectedArity: number;
}

const PATCHES: Patch[] = [
  {
    file: 'src/bounded-contexts/analytics/application/handlers/__tests__/sync-projection-on-resume-created.handler.spec.ts',
    className: 'SyncProjectionOnResumeCreatedHandler',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/analytics/application/handlers/__tests__/sync-projection-on-resume-deleted.handler.spec.ts',
    className: 'SyncProjectionOnResumeDeletedHandler',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/analytics/application/handlers/__tests__/sync-projection-on-section-added.handler.spec.ts',
    className: 'SyncProjectionOnSectionAddedHandler',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/analytics/application/handlers/__tests__/sync-projection-on-section-removed.handler.spec.ts',
    className: 'SyncProjectionOnSectionRemovedHandler',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/analytics/application/handlers/__tests__/sync-projection-on-section-updated.handler.spec.ts',
    className: 'SyncProjectionOnSectionUpdatedHandler',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/collaboration/chat/gateways/ws-auth.guard.spec.ts',
    className: 'WsAuthGuard',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/dsl/dsl-compiler.service.spec.ts',
    className: 'DslCompilerService',
    expectedArity: 1,
  },
  {
    file: 'src/bounded-contexts/dsl/dsl.repository.spec.ts',
    className: 'DslRepository',
    expectedArity: 4,
  },
  {
    file: 'src/bounded-contexts/export/infrastructure/adapters/external-services/typst-compiler.service.spec.ts',
    className: 'TypstCompilerService',
    expectedArity: 1,
  },
  {
    file: 'src/bounded-contexts/platform/jobs/processors/export.processor.spec.ts',
    className: 'ExportProcessor',
    expectedArity: 5,
  },
  {
    file: 'src/bounded-contexts/platform/metrics/handlers/__tests__/score-metrics.handler.spec.ts',
    className: 'ScoreMetricsHandler',
    expectedArity: 2,
  },
  {
    file: 'src/bounded-contexts/social/services/skill-decay.service.spec.ts',
    className: 'SkillDecayService',
    expectedArity: 2,
  },
  {
    file: 'src/shared-kernel/filters/domain-exception.filter.spec.ts',
    className: 'DomainExceptionFilter',
    expectedArity: 2,
  },
];

const STUB_LOGGER_DECL = `const stubLogger = { log: () => {}, debug: () => {}, warn: () => {}, error: () => {} };`;

function findMatchingParen(src: string, openIdx: number): number {
  let depth = 0,
    inStr: string | null = null,
    inBack = false,
    tpl = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i],
      prev = src[i - 1];
    if (inBack) {
      if (ch === '`' && prev !== '\\' && tpl === 0) inBack = false;
      else if (ch === '$' && src[i + 1] === '{') {
        tpl++;
        i++;
      } else if (ch === '}' && tpl > 0) tpl--;
      continue;
    }
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === '`') {
      inBack = true;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  let inStr: string | null = null;
  let inBack = false;
  let tpl = 0;
  for (let i = 0; i < args.length; i++) {
    const ch = args[i],
      prev = args[i - 1];
    if (inBack) {
      buf += ch;
      if (ch === '`' && prev !== '\\' && tpl === 0) inBack = false;
      else if (ch === '$' && args[i + 1] === '{') {
        tpl++;
        buf += args[++i];
      } else if (ch === '}' && tpl > 0) tpl--;
      continue;
    }
    if (inStr) {
      buf += ch;
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === '`') {
      inBack = true;
      buf += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

for (const patch of PATCHES) {
  const path = join(REPO, patch.file);
  try {
    statSync(path);
  } catch {
    console.warn(`skip — not found: ${patch.file}`);
    continue;
  }
  let src = readFileSync(path, 'utf8');
  if (!src.includes(`new ${patch.className}(`)) {
    console.warn(`skip — no instantiation of ${patch.className} in ${patch.file}`);
    continue;
  }

  // Inject stubLogger declaration once, right after the last import.
  if (!src.includes('stubLogger')) {
    const importStmtRe = /import[\s\S]*?from\s*['"][^'"]+['"];?/g;
    let lastEnd = -1;
    let im: RegExpExecArray | null;
    while ((im = importStmtRe.exec(src))) lastEnd = im.index + im[0].length;
    if (lastEnd >= 0) {
      src = `${src.slice(0, lastEnd)}\n\n${STUB_LOGGER_DECL}${src.slice(lastEnd)}`;
    } else {
      src = `${STUB_LOGGER_DECL}\n${src}`;
    }
  }

  // Walk every `new ClassName(` and append the stub.
  let out = '';
  let i = 0;
  const needle = `new ${patch.className}(`;
  while (i < src.length) {
    const idx = src.indexOf(needle, i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    const open = idx + needle.length - 1;
    const close = findMatchingParen(src, open);
    if (close === -1) {
      out += src.slice(idx);
      break;
    }
    const argsRaw = src.slice(open + 1, close);
    const parts = splitTopLevel(argsRaw);
    if (parts.length === patch.expectedArity) {
      out += src.slice(idx, close + 1);
    } else if (parts.length === patch.expectedArity - 1) {
      const joined = parts.length === 0 ? 'stubLogger' : `${parts.join(', ')}, stubLogger`;
      out += `${needle}${joined})`;
    } else {
      out += src.slice(idx, close + 1);
    }
    i = close + 1;
  }
  src = out;
  writeFileSync(path, src);
  console.log(`✓ ${patch.file}`);
}
