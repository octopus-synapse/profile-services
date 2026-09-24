import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';

describe('billing deprecated isolation', () => {
  it('is never imported by active source', async () => {
    const violations: string[] = [];
    const legacyImport = /(?:from\s+|import\s*\()['"][^'"]*billing-deprecated/u;
    for await (const file of new Glob('**/*.ts').scan({ cwd: 'src' })) {
      if (file.startsWith('bounded-contexts/billing-deprecated/')) continue;
      if (legacyImport.test(readFileSync(`src/${file}`, 'utf8'))) violations.push(file);
    }
    expect(violations).toEqual([]);
  });
});
