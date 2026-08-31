/**
 * Spec: docs bundle builders — the HTML page embeds Scalar
 * declaratively (no inline script, so the CSP needs no
 * `'unsafe-inline'` in script-src) and the spec loader falls back to
 * an empty-but-valid document instead of throwing at boot.
 */

import { describe, expect, it } from 'bun:test';
import type { LoggerPort } from '@/shared-kernel/logger';
import { buildDocsHtml, loadOpenApiSpec, SCALAR_CDN_URL } from './docs.bundle';

function makeLogger(): { warned: string[]; logger: LoggerPort } {
  const warned: string[] = [];
  const logger = {
    log: () => undefined,
    warn: (msg: string) => {
      warned.push(msg);
    },
    error: () => undefined,
  } as unknown as LoggerPort;
  return { warned, logger };
}

describe('buildDocsHtml', () => {
  const html = buildDocsHtml('/api/docs/openapi.json');

  it('embeds Scalar via the declarative data-url tag (no inline script)', () => {
    expect(html).toContain('id="api-reference" data-url="/api/docs/openapi.json"');
    expect(html).toContain(`src="${SCALAR_CDN_URL}"`);
    // The only <script> with content would be inline JS — there is none.
    expect(html).not.toMatch(/<script[^>]*>[^<\s]/);
  });

  it('inlines the custom theme', () => {
    expect(html).toContain('<style>');
    expect(html).toContain('--scalar-background-1');
  });
});

describe('loadOpenApiSpec', () => {
  it('loads the repo-root swagger.json in dev (no warn)', () => {
    const { warned, logger } = makeLogger();
    const bytes = loadOpenApiSpec(logger);
    const doc = JSON.parse(new TextDecoder().decode(bytes));
    expect(doc.openapi).toBe('3.0.0');
    expect(Object.keys(doc.paths).length).toBeGreaterThan(0);
    expect(warned).toHaveLength(0);
  });
});
