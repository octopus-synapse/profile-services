import { describe, expect, it } from 'bun:test';
import { LOCALES, QUALITY_ISSUE_DICTIONARY } from '@packages/i18n';
import { ALL_ISSUE_CODES } from '@/bounded-contexts/resume-quality/domain/types';

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

describe('i18n quality-issue parity (@packages/i18n QUALITY_ISSUE_DICTIONARY)', () => {
  const dictionaryKeys = new Set(Object.keys(QUALITY_ISSUE_DICTIONARY));
  const issueCodes = new Set<string>(ALL_ISSUE_CODES);

  it('every IssueCode has an entry in QUALITY_ISSUE_DICTIONARY', () => {
    const missing = [...issueCodes].filter((c) => !dictionaryKeys.has(c)).sort();
    expect(
      missing,
      `QUALITY_ISSUE_DICTIONARY missing ${missing.length} codes:\n${missing.join('\n')}\n` +
        `Add entries to packages/i18n/src/quality-issues.ts.`,
    ).toEqual([]);
  });

  it('QUALITY_ISSUE_DICTIONARY has no orphan keys (codes no rule emits)', () => {
    const orphans = [...dictionaryKeys].filter((c) => !issueCodes.has(c)).sort();
    expect(
      orphans,
      `QUALITY_ISSUE_DICTIONARY has ${orphans.length} orphan keys:\n${orphans.join('\n')}`,
    ).toEqual([]);
  });

  it('every entry has a non-empty message for every supported locale', () => {
    const gaps: string[] = [];
    for (const [code, tpl] of Object.entries(QUALITY_ISSUE_DICTIONARY)) {
      for (const locale of LOCALES) {
        const msg = tpl.message[locale];
        if (!msg || msg.trim().length === 0) gaps.push(`${code} (${locale})`);
      }
    }
    expect(gaps, `Empty issue messages:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('message placeholders exactly match the declared params array', () => {
    const mismatches: string[] = [];
    for (const [code, tpl] of Object.entries(QUALITY_ISSUE_DICTIONARY)) {
      const declared = new Set<string>(tpl.params as readonly string[]);
      for (const locale of LOCALES) {
        const used = extractPlaceholders(tpl.message[locale]);
        for (const p of used) {
          if (!declared.has(p)) mismatches.push(`${code} (${locale}): uses undeclared param "${p}"`);
        }
        for (const p of declared) {
          if (!used.has(p)) mismatches.push(`${code} (${locale}): declared param "${p}" never used`);
        }
      }
    }
    expect(mismatches.sort(), `Quality-issue placeholder drift:\n${mismatches.join('\n')}`).toEqual(
      [],
    );
  });

  it('every message is actually translated (no en === pt-BR copies)', () => {
    const suspects: string[] = [];
    for (const [code, tpl] of Object.entries(QUALITY_ISSUE_DICTIONARY)) {
      if ((tpl.message.en as string) === (tpl.message['pt-BR'] as string)) {
        suspects.push(`${code} = "${tpl.message.en}"`);
      }
    }
    expect(suspects, `Untranslated issue messages (en === pt-BR):\n${suspects.join('\n')}`).toEqual(
      [],
    );
  });

  it('no rogue locale keys outside LOCALES', () => {
    const rogues: string[] = [];
    for (const [code, tpl] of Object.entries(QUALITY_ISSUE_DICTIONARY)) {
      for (const locale of Object.keys(tpl.message)) {
        if (!(LOCALES as readonly string[]).includes(locale)) {
          rogues.push(`${code}: rogue locale "${locale}"`);
        }
      }
    }
    expect(rogues, `Rogue locales in QUALITY_ISSUE_DICTIONARY:\n${rogues.join('\n')}`).toEqual([]);
  });
});
