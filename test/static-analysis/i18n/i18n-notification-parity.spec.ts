/**
 * i18n Notification Parity Architecture Test
 *
 * Ensures every `NotificationType` Prisma enum value has a matching
 * template in `NOTIFICATION_DICTIONARY`, and vice-versa.
 *
 * Templates use `{ param }` placeholders; each entry's `params` array must
 * list the exact placeholder names used in both locales. Drift between
 * the title / body placeholders and the declared params is a bug.
 */

import { describe, expect, it } from 'bun:test';
import { LOCALES, NOTIFICATION_DICTIONARY } from '@packages/i18n';
import { discoverNotificationTypes } from '../shared/dictionary-discovery';

const SCHEMA_DIR = 'prisma/schema';
const PLACEHOLDER_RE = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g;

function extractPlaceholders(template: string): Set<string> {
  const out = new Set<string>();
  PLACEHOLDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (true) {
    m = PLACEHOLDER_RE.exec(template);
    if (!m) break;
    out.add(m[1]);
  }
  return out;
}

describe('i18n notification parity (@packages/i18n NOTIFICATION_DICTIONARY)', () => {
  const discovered = discoverNotificationTypes(SCHEMA_DIR);

  it('every NotificationType has a template', () => {
    const missing = [...discovered]
      .filter((v) => !Object.hasOwn(NOTIFICATION_DICTIONARY, v))
      .sort();
    expect(missing, `Missing templates:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every template key is a real NotificationType', () => {
    const orphans = Object.keys(NOTIFICATION_DICTIONARY)
      .filter((k) => !discovered.has(k))
      .sort();
    expect(orphans, `Orphan templates:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('every template has a non-empty title and body in every locale', () => {
    const gaps: string[] = [];
    for (const [code, tpl] of Object.entries(NOTIFICATION_DICTIONARY)) {
      for (const locale of LOCALES) {
        if (!tpl.title[locale] || tpl.title[locale].trim().length === 0) {
          gaps.push(`${code}.title (${locale})`);
        }
        if (!tpl.body[locale] || tpl.body[locale].trim().length === 0) {
          gaps.push(`${code}.body (${locale})`);
        }
      }
    }
    expect(gaps, `Empty notification strings:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('title/body placeholders exactly match the declared params array', () => {
    const mismatches: string[] = [];
    for (const [code, tpl] of Object.entries(NOTIFICATION_DICTIONARY)) {
      const declared: Set<string> = new Set(tpl.params);
      for (const locale of LOCALES) {
        const used = new Set<string>([
          ...extractPlaceholders(tpl.title[locale]),
          ...extractPlaceholders(tpl.body[locale]),
        ]);
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
    expect(mismatches.sort(), `Notification placeholder drift:\n${mismatches.join('\n')}`).toEqual(
      [],
    );
  });

  it('placeholders are identical between en and pt-BR (no locale drift)', () => {
    const drifts: string[] = [];
    for (const [code, tpl] of Object.entries(NOTIFICATION_DICTIONARY)) {
      const titleEn = [...extractPlaceholders(tpl.title.en)].sort().join(',');
      const titlePt = [...extractPlaceholders(tpl.title['pt-BR'])].sort().join(',');
      if (titleEn !== titlePt) drifts.push(`${code}.title: en={${titleEn}} pt={${titlePt}}`);
      const bodyEn = [...extractPlaceholders(tpl.body.en)].sort().join(',');
      const bodyPt = [...extractPlaceholders(tpl.body['pt-BR'])].sort().join(',');
      if (bodyEn !== bodyPt) drifts.push(`${code}.body: en={${bodyEn}} pt={${bodyPt}}`);
    }
    expect(drifts, `Locale placeholder drift:\n${drifts.join('\n')}`).toEqual([]);
  });
});
