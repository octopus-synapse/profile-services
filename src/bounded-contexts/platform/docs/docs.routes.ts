/**
 * API docs route descriptors.
 *
 * Two endpoints under the standard `/api` prefix — both public, both
 * serving boot-time static bytes. Pipeline opt-outs mirror the
 * well-known BC:
 *
 *  - `responseWrapper` (raw HTML / raw OpenAPI JSON — no envelope)
 *  - `authExtractor` / `rateLimit` (public reference material; the
 *    payloads are static buffers, nothing to protect or throttle)
 *
 * The HTML route overrides the global Content-Security-Policy so the
 * pinned Scalar CDN bundle can load — see `DOCS_PAGE_CSP`.
 */

import { withHeaders } from '@/shared-kernel/http/route';
import type { Route } from '@/shared-kernel/http/route.types';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { DOCS_PAGE_CSP, type DocsBundle } from './docs.bundle';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': DOCS_PAGE_CSP,
} as const;

const JSON_CT = { 'Content-Type': 'application/json' } as const;

export const docsRoutes: ReadonlyArray<Route<DocsBundle>> = [
  {
    method: 'GET',
    path: '/docs',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit'],
    openapi: {
      summary: 'Interactive API reference (Scalar UI)',
      tags: ['docs'],
      description:
        'Human-facing HTML page rendering the OpenAPI document with the Scalar API reference. Not an API endpoint — exists for developers, not clients.',
    },
    // Meta endpoints — not part of the public SDK surface.
    sdk: { exported: false },
    // Static HTML with a fixed Content-Type — `binary` is the
    // route-coverage validator's opt-out for non-envelope payloads.
    binary: { mediaType: 'text/html' },
    handler: async (_ctx, bc) => withHeaders(HTML_HEADERS, new StreamableFile(bc.html)),
  },
  {
    method: 'GET',
    path: '/docs/openapi.json',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit'],
    openapi: {
      summary: 'OpenAPI 3.0 document (raw JSON)',
      tags: ['docs'],
      description:
        'The build-time swagger.json the SDK generator consumes, served verbatim for the Scalar UI and any external tooling.',
    },
    sdk: { exported: false },
    binary: { mediaType: 'application/json' },
    handler: async (_ctx, bc) => withHeaders(JSON_CT, new StreamableFile(bc.spec)),
  },
];
