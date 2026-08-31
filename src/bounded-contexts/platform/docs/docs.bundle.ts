/**
 * API docs BC bundle.
 *
 * Serves an interactive API reference (Scalar UI) at `/api/docs` and
 * the OpenAPI document it renders at `/api/docs/openapi.json`. The
 * document is the build-time `swagger.json` the SDK generator already
 * consumes — read from disk **once at boot** (the Docker runtime image
 * ships it next to `dist/`; in dev it sits at the repo root). No
 * per-request work, mirroring the well-known BC.
 *
 * When the file is missing (e.g. a runtime image built before the
 * Dockerfile copied it) the routes stay up and serve an empty-but-valid
 * document so the UI renders instead of 500ing; a boot log line tells
 * the operator why the reference is empty.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCALAR_CUSTOM_CSS } from '@/bounded-contexts/platform/common/config/swagger';
import type { LoggerPort } from '@/shared-kernel/logger';

/**
 * Pinned Scalar standalone bundle. jsDelivr resolves the package's
 * default browser file (`dist/browser/standalone.min.js`); pinning the
 * version keeps the page immune to upstream breaking releases.
 */
export const SCALAR_CDN_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.67.0';

/**
 * Per-route Content-Security-Policy for the docs page. The global
 * default (`script-src 'self'`) would block the Scalar CDN bundle, so
 * the handler overrides it — `applySecurityHeaders` never clobbers a
 * header a handler explicitly set. Scope stays tight: scripts only
 * from self + jsDelivr, no inline script (Scalar's declarative
 * `data-url` embed needs none), fonts/styles cover Scalar's runtime
 * injection.
 */
export const DOCS_PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.scalar.com",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Candidate locations for the OpenAPI document, tried in order,
 * relative to `process.cwd()`:
 *  - `swagger.json` — repo root in dev, `/app` in the runtime image.
 *  - `dist/swagger.json` — fallback should a future build move it
 *    alongside the bundle.
 */
const SPEC_CANDIDATES: ReadonlyArray<string> = ['swagger.json', 'dist/swagger.json'];

/** Empty-but-valid OpenAPI 3.0 shell served when the file is absent. */
const FALLBACK_SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'Profile Services API',
    version: '0.0.0',
    description: 'swagger.json was not found at runtime — regenerate and redeploy.',
  },
  paths: {},
} as const;

export interface DocsBundle {
  /** UTF-8 bytes of the OpenAPI JSON document. */
  readonly spec: Uint8Array;
  /** UTF-8 bytes of the Scalar UI HTML page. */
  readonly html: Uint8Array;
  readonly logger: LoggerPort;
}

/**
 * Read `swagger.json` from the first candidate path that exists.
 * Falls back to {@link FALLBACK_SPEC} (with a warn log) so the docs
 * routes never take the boot down.
 */
export function loadOpenApiSpec(logger: LoggerPort): Uint8Array {
  for (const rel of SPEC_CANDIDATES) {
    try {
      return new Uint8Array(readFileSync(join(process.cwd(), rel)));
    } catch {
      // Try the next candidate.
    }
  }
  logger.warn(
    `swagger.json not found (tried: ${SPEC_CANDIDATES.join(', ')}) — /api/docs serves an empty document`,
    'DocsBootstrap',
  );
  return new TextEncoder().encode(JSON.stringify(FALLBACK_SPEC));
}

/**
 * Build the Scalar UI page. Declarative embed (`data-url`) — no inline
 * script, so the page works under {@link DOCS_PAGE_CSP} without
 * `'unsafe-inline'` in `script-src`. The custom theme rides along as an
 * inline `<style>` (covered by `'unsafe-inline'` in `style-src`, which
 * the global default CSP already grants).
 */
export function buildDocsHtml(specUrl: string): string {
  // Override the document's `servers` (the generator pins
  // `http://localhost:3010` for the Dredd contract probes) with a
  // relative URL so "Test Request" targets whatever origin is serving
  // the page — works in dev and prod alike.
  const configuration = JSON.stringify({ servers: [{ url: '/' }] });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Profile Services API</title>
  <style>${SCALAR_CUSTOM_CSS}</style>
</head>
<body>
  <script id="api-reference" data-url="${specUrl}" data-configuration='${configuration}'></script>
  <script src="${SCALAR_CDN_URL}"></script>
</body>
</html>
`;
}
