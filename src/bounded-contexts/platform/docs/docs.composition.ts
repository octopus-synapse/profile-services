/**
 * Docs BC composition root.
 *
 * Loads the OpenAPI document and renders the Scalar page once at boot,
 * then hands both byte buffers to the route handlers — the payloads
 * are static after boot, no per-request work.
 */

import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { LoggerPort } from '@/shared-kernel/logger';
import { buildDocsHtml, type DocsBundle, loadOpenApiSpec } from './docs.bundle';
import { docsRoutes } from './docs.routes';

export type { DocsBundle };

/** Where the UI fetches the document — must match the mounted route. */
const SPEC_URL = '/api/docs/openapi.json';

export function buildDocsComposition(logger: LoggerPort): BoundedContextComposition<DocsBundle> {
  const spec = loadOpenApiSpec(logger);
  const html = new TextEncoder().encode(buildDocsHtml(SPEC_URL));
  const bundle: DocsBundle = { spec, html, logger };
  return { useCases: bundle, routes: docsRoutes };
}
