/**
 * Contract: every leaf in `route.params` / `route.query` / `route.body` /
 * `route.response` declares `.openapi({ example })` (or `.openapi({ examples })`)
 * — or matches an auto-derive rule (name-based) — or the schema is in the
 * exempt list (recursive bounded patterns).
 *
 * Failure mode: a single failing assertion that prints the full backlog of
 * offenders. The list is the migration roadmap for Workstream A of the
 * Caminho A plan (Dredd 1684 passing without gambiarra).
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { beforeAll, describe, expect, test } from 'bun:test';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z, type ZodSchema } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import {
  EXAMPLE_CONVERSATION_ID,
  EXAMPLE_GENERIC_ID,
  EXAMPLE_JOB_ID,
  EXAMPLE_NOTIFICATION_ID,
  EXAMPLE_POST_ID,
  EXAMPLE_RESUME_ID,
  EXAMPLE_SLUG,
  EXAMPLE_USER_ID,
} from '@/shared-kernel/schemas/params/example-ids.const';
import { findOffenders } from '../shared/zod-leaf-walker';

extendZodWithOpenApi(z);

const SRC_DIR = resolve(__dirname, '../../../src');

function* walkRoutesFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort()) {
    if (entry === 'node_modules' || entry === '__tests__' || entry === 'testing') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkRoutesFiles(full);
    else if (st.isFile() && entry.endsWith('.routes.ts') && !entry.endsWith('.spec.ts')) {
      yield full;
    }
  }
}

function isRouteArray(value: unknown): value is ReadonlyArray<Route> {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0] as Partial<Route> | undefined;
  return (
    typeof first === 'object' &&
    first !== null &&
    typeof (first as Route).method === 'string' &&
    typeof (first as Route).path === 'string' &&
    typeof (first as Route).handler === 'function'
  );
}

interface CollectedRoute {
  readonly file: string;
  readonly route: Route;
}

const collected: CollectedRoute[] = [];

beforeAll(async () => {
  for (const file of walkRoutesFiles(SRC_DIR)) {
    try {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      for (const value of Object.values(mod)) {
        if (isRouteArray(value)) {
          for (const route of value) collected.push({ file, route: route as Route });
        }
      }
    } catch {
      // Module load failure surfaces in tsc / route-descriptors contract.
    }
  }
});

const NAME_TO_EXAMPLE: ReadonlyMap<string, string> = new Map([
  ['userId', EXAMPLE_USER_ID],
  ['resumeId', EXAMPLE_RESUME_ID],
  ['jobId', EXAMPLE_JOB_ID],
  ['postId', EXAMPLE_POST_ID],
  ['conversationId', EXAMPLE_CONVERSATION_ID],
  ['notificationId', EXAMPLE_NOTIFICATION_ID],
  ['id', EXAMPLE_GENERIC_ID],
  ['slug', EXAMPLE_SLUG],
]);

// Recursive bounded patterns deliberately written without z.lazy — walking
// them would either descend forever or report each level separately.
// Populated lazily as the backlog reveals them.
const EXEMPT_SCHEMAS: ZodSchema<unknown>[] = [];

function formatOffender(
  route: Route,
  category: 'params' | 'query' | 'body' | 'response',
  path: readonly string[],
  zodType: string,
): string {
  return `${route.method} ${route.path} :: ${category}.${path.join('.')} (${zodType})`;
}

describe('Route examples contract', () => {
  test('every leaf in route.params/query/body/response declares .openapi({ example })', () => {
    const offenders: string[] = [];
    for (const { route } of collected) {
      const categories: Array<{
        key: 'params' | 'query' | 'body' | 'response';
        schema: ZodSchema<unknown> | undefined;
      }> = [
        { key: 'params', schema: route.params },
        { key: 'query', schema: route.query },
        { key: 'body', schema: route.body },
        { key: 'response', schema: route.response },
      ];
      for (const { key, schema } of categories) {
        if (!schema) continue;
        const found = findOffenders(schema, {
          schemaName: `${route.method} ${route.path}`,
          exemptSchemas: EXEMPT_SCHEMAS,
          nameToExample: NAME_TO_EXAMPLE,
        });
        for (const off of found) {
          offenders.push(formatOffender(route, key, off.path, off.zodType));
        }
      }
    }

    if (offenders.length > 0) {
      // Surface the count up front so devs see the backlog magnitude
      // before scrolling through entries.
      console.warn(`route-examples contract: ${offenders.length} offenders`);
    }
    expect(offenders).toEqual([]);
  });
});
