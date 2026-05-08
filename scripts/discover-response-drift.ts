#!/usr/bin/env bun

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ZodSchema } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import type {
  OperationMetadata,
  Persona,
  RouteDriftReport,
} from '../test/infrastructure/contract/engine';
import {
  analyzeDrift,
  fillPathParams,
  formatReport,
  isHappyPathProbable,
  loadRoutes,
  loadSwaggerInfo,
  pickPersona,
  SessionPool,
} from '../test/infrastructure/contract/engine';

const SRC_DIR = resolve(__dirname, '../src');
const REPORT_PATH = resolve(__dirname, '../docs/audits/response-drift-report.md');
const SWAGGER_PATH = resolve(__dirname, '../swagger.json');
const SKIP_GUARDS = new Set(['internal-auth']);

interface ProbeTarget {
  readonly route: Route;
  readonly url: string;
  readonly persona: Persona;
  readonly meta: OperationMetadata | null;
}

async function probeRoute(target: ProbeTarget, pool: SessionPool): Promise<RouteDriftReport> {
  const token = pool.tokenFor(target.persona);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Cookie = `access_token=${token}`;
  let status = 0;
  let body: unknown;
  try {
    const res = await fetch(target.url, { method: 'GET', headers });
    status = res.status;
    const text = await res.text();
    if (!text) {
      return { route: `GET ${target.route.path}`, status, persona: target.persona, drifts: [] };
    }
    try {
      body = JSON.parse(text);
    } catch {
      return {
        route: `GET ${target.route.path}`,
        status,
        persona: target.persona,
        drifts: [],
        error: `non-JSON body (${text.slice(0, 80)})`,
      };
    }
  } catch (err) {
    return {
      route: `GET ${target.route.path}`,
      status,
      persona: target.persona,
      drifts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (status === 401 || status === 403) {
    return {
      route: `GET ${target.route.path}`,
      status,
      persona: target.persona,
      drifts: [{ kind: 'auth-mismatch', path: [], persona: target.persona, status }],
    };
  }

  if (status < 200 || status >= 300) {
    return { route: `GET ${target.route.path}`, status, persona: target.persona, drifts: [] };
  }

  const responseSchema = target.route.response as ZodSchema<unknown>;
  const drifts = analyzeDrift(responseSchema, body);
  return { route: `GET ${target.route.path}`, status, persona: target.persona, drifts };
}

async function main(): Promise<number> {
  const routes = await loadRoutes(SRC_DIR);
  const probable = routes.filter((r) => isHappyPathProbable(r.route));
  const swaggerInfo = loadSwaggerInfo(SWAGGER_PATH);
  const pool = SessionPool.fromEnv();

  const targets: ProbeTarget[] = probable.flatMap(({ route }) => {
    const { persona, meta } = pickPersona(route.method, route.path, swaggerInfo);
    if (meta?.guards?.some((g) => SKIP_GUARDS.has(g))) return [];
    return [{ route, url: `${pool.baseUrl}/api${fillPathParams(route.path)}`, persona, meta }];
  });

  console.log(`Probing ${targets.length} GET endpoints against ${pool.baseUrl}...`);
  await pool.boot();

  const reports: RouteDriftReport[] = [];
  for (const target of targets) {
    reports.push(await probeRoute(target, pool));
  }

  const md = formatReport(reports);
  writeFileSync(REPORT_PATH, md);
  console.log(`Report written to ${REPORT_PATH}`);

  const total = reports.reduce((sum, r) => sum + r.drifts.length, 0);
  const authMismatches = reports.reduce(
    (sum, r) => sum + r.drifts.filter((d) => d.kind === 'auth-mismatch').length,
    0,
  );
  console.log(`Total drifts: ${total} (of which auth-mismatch: ${authMismatches})`);
  return total;
}

if (import.meta.main) {
  main()
    .then((total) => {
      const failOn = Number(process.env.DRIFT_FAIL_ON ?? 1);
      process.exit(failOn && total > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('discover-response-drift failed', err);
      process.exit(1);
    });
}
