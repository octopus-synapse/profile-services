import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { LOCALES, SUCCESS_MESSAGE_DICTIONARY } from '@packages/i18n';
import { discoverSuccessMessageCodes } from '../shared/dictionary-discovery';

const SOURCE_ROOT = path.resolve(__dirname, '../../../src');
const PLACEHOLDER_RE = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g;

function extractPlaceholders(s: string): Set<string> {
  const out = new Set<string>();
  PLACEHOLDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (true) {
    m = PLACEHOLDER_RE.exec(s);
    if (!m) break;
    out.add(m[1]);
  }
  return out;
}

describe('i18n success-message parity (@packages/i18n SUCCESS_MESSAGE_DICTIONARY)', () => {
  const discovered = discoverSuccessMessageCodes(SOURCE_ROOT);
  const dictionaryKeys = new Set(Object.keys(SUCCESS_MESSAGE_DICTIONARY));

  it('every emitted success code has an entry in SUCCESS_MESSAGE_DICTIONARY', () => {
    const missing = [...discovered].filter((c) => !dictionaryKeys.has(c)).sort();
    expect(
      missing,
      `SUCCESS_MESSAGE_DICTIONARY missing ${missing.length} codes:\n${missing.join('\n')}\n` +
        `Add entries to packages/i18n/src/success-messages.ts.`,
    ).toEqual([]);
  });

  it('SUCCESS_MESSAGE_DICTIONARY has no orphan keys (codes no route emits)', () => {
    const orphans = [...dictionaryKeys].filter((c) => !discovered.has(c)).sort();
    expect(
      orphans,
      `SUCCESS_MESSAGE_DICTIONARY has ${orphans.length} orphan keys:\n${orphans.join('\n')}`,
    ).toEqual([]);
  });

  it('every entry has a non-empty message for every supported locale', () => {
    const gaps: string[] = [];
    for (const [code, tpl] of Object.entries(SUCCESS_MESSAGE_DICTIONARY)) {
      for (const locale of LOCALES) {
        const msg = tpl.message[locale];
        if (!msg || msg.trim().length === 0) gaps.push(`${code} (${locale})`);
      }
    }
    expect(gaps, `Empty success messages:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('message placeholders exactly match the declared params array', () => {
    const mismatches: string[] = [];
    for (const [code, tpl] of Object.entries(SUCCESS_MESSAGE_DICTIONARY)) {
      const declared = new Set<string>(tpl.params as readonly string[]);
      for (const locale of LOCALES) {
        const used = extractPlaceholders(tpl.message[locale]);
        for (const p of used) {
          if (!declared.has(p))
            mismatches.push(`${code} (${locale}): uses undeclared param "${p}"`);
        }
        for (const p of declared) {
          if (!used.has(p))
            mismatches.push(`${code} (${locale}): declared param "${p}" never used`);
        }
      }
    }
    expect(
      mismatches.sort(),
      `Success-message placeholder drift:\n${mismatches.join('\n')}`,
    ).toEqual([]);
  });

  it('every message is actually translated (no en === pt-BR copies)', () => {
    // No legitimate identical success messages today.
    const IDENTICAL_ALLOWED = new Set<string>([]);
    const suspects: string[] = [];
    for (const [code, tpl] of Object.entries(SUCCESS_MESSAGE_DICTIONARY)) {
      if (
        (tpl.message.en as string) === (tpl.message['pt-BR'] as string) &&
        !IDENTICAL_ALLOWED.has(code)
      ) {
        suspects.push(`${code} = "${tpl.message.en}"`);
      }
    }
    expect(
      suspects,
      `Untranslated success messages (en === pt-BR):\n${suspects.join('\n')}`,
    ).toEqual([]);
  });

  it('no rogue locale keys outside LOCALES', () => {
    const rogues: string[] = [];
    for (const [code, tpl] of Object.entries(SUCCESS_MESSAGE_DICTIONARY)) {
      for (const locale of Object.keys(tpl.message)) {
        if (!(LOCALES as readonly string[]).includes(locale)) {
          rogues.push(`${code}: rogue locale "${locale}"`);
        }
      }
    }
    expect(rogues, `Rogue locales in SUCCESS_MESSAGE_DICTIONARY:\n${rogues.join('\n')}`).toEqual(
      [],
    );
  });
});
