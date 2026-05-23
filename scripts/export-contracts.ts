#!/usr/bin/env bun
/**
 * Export contract artefacts consumed by the frontend SDK pipeline.
 *
 * Reads:
 *   - packages/i18n/src/errors.ts          → ERROR_DICTIONARY
 *   - packages/i18n/src/enums.ts           → ENUM_DICTIONARY
 *   - packages/i18n/src/notifications.ts   → NOTIFICATION_DICTIONARY
 *   - src/shared-kernel/constants/success-messages.const.ts → SUCCESS_MESSAGES
 *   - prisma/schema/*.prisma               → enum definitions
 *
 * Writes (at repo root, committed):
 *   - dictionaries.json    { errors, enums, notifications, success }
 *   - enums.json           { EnumName: [values...] }   (from Prisma schema)
 *   - error-codes.json     [ErrorCode strings sorted]
 *
 * Idempotent: writes atomically (tmp + rename) so concurrent invocations
 * never see a half-written file. Chained after `swagger:generate` so the
 * artefacts always stay in lockstep with `client-swagger.json`.
 *
 * Decision trace: D45 (multi-file output), D46 (sync trigger), D48
 * (Spectral diff comparison surface).
 */

import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ENUM_DICTIONARY,
  ERROR_DICTIONARY,
  NOTIFICATION_DICTIONARY,
} from '../packages/i18n/src';
import { SUCCESS_MESSAGES } from '../src/shared-kernel/constants/success-messages.const';

const REPO_ROOT = resolve(__dirname, '..');
const SCHEMA_DIR = resolve(REPO_ROOT, 'prisma/schema');

const DICT_PATH = resolve(REPO_ROOT, 'dictionaries.json');
const ENUMS_PATH = resolve(REPO_ROOT, 'enums.json');
const ERROR_CODES_PATH = resolve(REPO_ROOT, 'error-codes.json');

const ENUM_RE = /^enum\s+(\w+)\s*\{([^}]+)\}/gm;

function extractPrismaEnums(): Record<string, readonly string[]> {
  const enums: Record<string, string[]> = {};
  for (const entry of readdirSync(SCHEMA_DIR)) {
    if (!entry.endsWith('.prisma')) continue;
    const src = readFileSync(resolve(SCHEMA_DIR, entry), 'utf8');
    ENUM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = ENUM_RE.exec(src);
      if (!match) break;
      const [, name, body] = match;
      const values = body
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, '').trim())
        .filter((l) => l.length > 0 && /^[A-Z][A-Z0-9_]*$/.test(l));
      enums[name] = values.sort();
    }
  }
  return Object.fromEntries(
    Object.entries(enums).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  ) as T;
}

function writeJsonAtomic(path: string, value: unknown): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

function buildSuccessDictionary(): Record<string, { en: string; 'pt-BR': string }> {
  // SUCCESS_MESSAGES is currently a flat en-only const in shared-kernel.
  // Wrap it in the dictionary shape so the frontend can treat all four
  // dictionaries uniformly. pt-BR mirrors en until SUCCESS_MESSAGE_DICTIONARY
  // is promoted to @packages/i18n (CLAUDE.md Q8 references the future name).
  const out: Record<string, { en: string; 'pt-BR': string }> = {};
  for (const [code, label] of Object.entries(SUCCESS_MESSAGES)) {
    out[code] = { en: label, 'pt-BR': label };
  }
  return sortObjectKeys(out);
}

function main(): void {
  const errors = sortObjectKeys(ERROR_DICTIONARY as unknown as Record<string, unknown>);
  const enumsI18n = sortObjectKeys(
    ENUM_DICTIONARY as unknown as Record<string, unknown>,
  );
  const notifications = sortObjectKeys(
    NOTIFICATION_DICTIONARY as unknown as Record<string, unknown>,
  );
  const success = buildSuccessDictionary();

  const dictionaries = {
    errors,
    enums: enumsI18n,
    notifications,
    success,
  };

  const enumsFromPrisma = extractPrismaEnums();
  const errorCodes = Object.keys(ERROR_DICTIONARY).sort();

  writeJsonAtomic(DICT_PATH, dictionaries);
  writeJsonAtomic(ENUMS_PATH, enumsFromPrisma);
  writeJsonAtomic(ERROR_CODES_PATH, errorCodes);

  console.log(
    `[contracts:export] wrote ${Object.keys(errors).length} error codes, ` +
      `${Object.keys(enumsI18n).length} enum labels, ` +
      `${Object.keys(notifications).length} notification templates, ` +
      `${Object.keys(success).length} success messages, ` +
      `${Object.keys(enumsFromPrisma).length} prisma enums`,
  );
}

main();
