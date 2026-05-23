/**
 * Well-known route descriptors (V2 D75).
 *
 * Two endpoints — both root-level (mounted **without** the usual `/api`
 * prefix), both public, both serving static JSON with the right
 * `Content-Type` header. Pipeline opt-outs:
 *
 *  - `responseWrapper` (we don't want `{ success, data }` envelope —
 *    the platform spec mandates the raw doc shape)
 *  - `authExtractor` / `rateLimit` (these are CDN-cached identity
 *    documents; rate-limiting them would be silly)
 *
 * Apple is finicky about AASA — the file must be served from
 * `/.well-known/apple-app-site-association` **without** a `.json`
 * extension and with `Content-Type: application/json`. Google is more
 * forgiving but the same shape works.
 */

import type { Route } from '@/shared-kernel/http/route';
import { withHeaders } from '@/shared-kernel/http/route';
import type { WellKnownBundle } from './well-known.bundle';

const JSON_CT = { 'Content-Type': 'application/json' } as const;

export const wellKnownRoutes: ReadonlyArray<Route<WellKnownBundle>> = [
  {
    method: 'GET',
    path: '/.well-known/apple-app-site-association',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit'],
    openapi: {
      summary: 'Apple App Site Association (Universal Links)',
      tags: ['well-known'],
      description:
        'Static JSON document Apple fetches to associate this domain with the patchcareers iOS app. Served without a .json extension per Apple spec.',
    },
    // Not part of the public SDK surface — these endpoints exist for
    // Apple/Google crawlers, not API clients.
    sdk: { exported: false },
    handler: async (_ctx, bc) => withHeaders(JSON_CT, bc.aasa),
  },
  {
    method: 'GET',
    path: '/.well-known/assetlinks.json',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit'],
    openapi: {
      summary: 'Android Digital Asset Links (App Links)',
      tags: ['well-known'],
      description:
        'Static JSON statement list Google fetches to verify the patchcareers Android app owns this domain for App Links.',
    },
    sdk: { exported: false },
    handler: async (_ctx, bc) => withHeaders(JSON_CT, bc.assetLinks),
  },
];
