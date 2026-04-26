/**
 * i18n Enum Parity Architecture Test
 *
 * Ensures every Prisma enum declared in `prisma/schema/*.prisma` has a
 * matching translation in `ENUM_DICTIONARY`, and every dictionary entry
 * points at a real enum value.
 *
 * Discovery is a regex parse of the .prisma files — no prisma runtime
 * required, so the test stays fast and dependency-free.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ENUM_DICTIONARY, LOCALES } from '@packages/i18n';

const SCHEMA_DIR = 'prisma/schema';
const ENUM_RE = /^enum\s+(\w+)\s*\{ ([^ }]+)\}/gm;

function discoverEnums(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const entry of fs.readdirSync(SCHEMA_DIR)) {
    if (!entry.endsWith('.prisma')) continue;
    const src = fs.readFileSync(path.join(SCHEMA_DIR, entry), 'utf8');
    ENUM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = ENUM_RE.exec(src);
      if (!match) break;
      const [, name, body] = match;
      const values = new Set(
        body
          .split('\n')
          .map((l) => l.replace(/\/\/.*$/, '').trim())
          .filter((l) => l.length > 0 && /^[A-Z][A-Z0-9_]*$/.test(l)),
      );
      out[name] = values;
    }
  }
  return out;
}

describe('i18n enum parity (@packages/i18n ENUM_DICTIONARY)', () => {
  const discovered = discoverEnums();

  it('every Prisma enum appears in ENUM_DICTIONARY', () => {
    const missing = Object.keys(discovered)
      .filter((name) => !Object.hasOwn(ENUM_DICTIONARY, name))
      .sort();
    expect(
      missing,
      `ENUM_DICTIONARY missing ${missing.length} enum(s):\n${missing.join('\n')}\n` +
        `Add entries to packages/i18n/src/enums.ts.`,
    ).toEqual([]);
  });

  it('every ENUM_DICTIONARY key is a real Prisma enum', () => {
    const orphans = Object.keys(ENUM_DICTIONARY)
      .filter((name) => !Object.hasOwn(discovered, name))
      .sort();
    expect(orphans, `Orphan enums in dictionary:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('every enum value has a dictionary entry', () => {
    const missing: string[] = [];
    for (const [name, values] of Object.entries(discovered)) {
      const dict = (ENUM_DICTIONARY as Record<string, Record<string, unknown>>)[name];
      if (!dict) continue;
      for (const v of values) {
        if (!Object.hasOwn(dict, v)) missing.push(`${name}.${v}`);
      }
    }
    expect(missing.sort(), `Missing enum translations:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every dictionary value maps to a real enum value', () => {
    const orphans: string[] = [];
    for (const [name, entry] of Object.entries(ENUM_DICTIONARY)) {
      const real = discovered[name];
      if (!real) continue;
      for (const v of Object.keys(entry)) {
        if (!real.has(v)) orphans.push(`${name}.${v}`);
      }
    }
    expect(orphans.sort(), `Orphan enum values:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('every entry is a non-empty string in every locale', () => {
    const gaps: string[] = [];
    for (const [name, entry] of Object.entries(ENUM_DICTIONARY)) {
      for (const [value, msgs] of Object.entries(entry)) {
        for (const locale of LOCALES) {
          const msg = (msgs as Record<string, string>)[locale];
          if (!msg || msg.trim().length === 0) gaps.push(`${name}.${value} (${locale})`);
        }
      }
    }
    expect(gaps, `Empty enum translations:\n${gaps.join('\n')}`).toEqual([]);
  });
});
