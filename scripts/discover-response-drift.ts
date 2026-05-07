#!/usr/bin/env bun

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ZodSchema } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { analyzeDrift, type Drift } from '../test/static-analysis/shared/response-drift-analyzer';

const SRC_DIR = resolve(__dirname, '../src');
const REPORT_PATH = resolve(__dirname, '../docs/audits/response-drift-report.md');

const BASE_URL = process.env.DRIFT_BASE_URL ?? 'http://localhost:3010';
const ADMIN_EMAIL = process.env.DRIFT_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.DRIFT_ADMIN_PASSWORD ?? 'Admin123!@#';

interface CollectedRoute {
  readonly file: string;
  readonly route: Route;
}

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

async function loadRoutes(): Promise<CollectedRoute[]> {
  const out: CollectedRoute[] = [];
  for (const file of walkRoutesFiles(SRC_DIR)) {
    try {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      for (const value of Object.values(mod)) {
        if (isRouteArray(value)) {
          for (const route of value) out.push({ file, route: route as Route });
        }
      }
    } catch (err) {
      console.warn(`Skipped ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return out;
}

interface ProbeTarget {
  readonly route: Route;
  readonly url: string;
}

const FIXTURE_USER_ID = '01900000-0000-7000-a000-000000000020';
const FIXTURE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
const FIXTURE_JOB_ID = '01900000-0000-7000-a000-000000000030';
const FIXTURE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';
const FIXTURE_SLUG = 'fixture-slug';

function fillPathParams(path: string): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    if (name === 'userId') return FIXTURE_USER_ID;
    if (name === 'resumeId') return FIXTURE_RESUME_ID;
    if (name === 'jobId') return FIXTURE_JOB_ID;
    if (name.endsWith('Id') || name === 'id') return FIXTURE_GENERIC_ID;
    return FIXTURE_SLUG;
  });
}

function isProbable(route: Route): boolean {
  if (route.method !== 'GET') return false;
  if (route.kind === 'sse' || route.kind === 'stream' || route.kind === 'redirect') return false;
  if (route.binary) return false;
  if (!route.response) return false;
  return true;
}

interface RouteDriftReport {
  readonly route: string;
  readonly status: number;
  readonly drifts: readonly Drift[];
  readonly error?: string;
}

async function login(): Promise<string | undefined> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (!res.ok) {
      console.warn(`Login failed: ${res.status}`);
      return undefined;
    }
    const setCookie = res.headers.get('set-cookie') ?? '';
    const match = /access_token=([^;]+)/.exec(setCookie);
    return match?.[1];
  } catch (err) {
    console.warn(`Login error: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

async function probeRoute(
  target: ProbeTarget,
  token: string | undefined,
): Promise<RouteDriftReport> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Cookie = `access_token=${token}`;
  let status = 0;
  let body: unknown;
  try {
    const res = await fetch(target.url, { method: 'GET', headers });
    status = res.status;
    const text = await res.text();
    if (!text) {
      return { route: `GET ${target.route.path}`, status, drifts: [] };
    }
    try {
      body = JSON.parse(text);
    } catch {
      return {
        route: `GET ${target.route.path}`,
        status,
        drifts: [],
        error: `non-JSON body (${text.slice(0, 80)})`,
      };
    }
  } catch (err) {
    return {
      route: `GET ${target.route.path}`,
      status,
      drifts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (status < 200 || status >= 300) {
    return { route: `GET ${target.route.path}`, status, drifts: [] };
  }
  const responseSchema = target.route.response as ZodSchema<unknown>;
  const drifts = analyzeDrift(responseSchema, body);
  return { route: `GET ${target.route.path}`, status, drifts };
}

function bcOf(routePath: string): string {
  const match = /^\/v\d+\/([a-z0-9-]+)/i.exec(routePath);
  return match?.[1] ?? 'misc';
}

function formatReport(reports: readonly RouteDriftReport[]): string {
  const totalDrifts = reports.reduce((sum, r) => sum + r.drifts.length, 0);
  const byBC = new Map<string, RouteDriftReport[]>();
  for (const r of reports) {
    const path = r.route.replace('GET ', '');
    const bc = bcOf(path);
    const arr = byBC.get(bc) ?? [];
    arr.push(r);
    byBC.set(bc, arr);
  }

  const lines: string[] = [];
  lines.push('# Response Drift Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Probed: ${reports.length} GET endpoints`);
  lines.push(`Total drifts: ${totalDrifts}`);
  lines.push('');

  for (const [bc, items] of [...byBC.entries()].sort()) {
    const bcDrifts = items.reduce((sum, r) => sum + r.drifts.length, 0);
    if (bcDrifts === 0) continue;
    lines.push(`## ${bc} (${bcDrifts} drifts)`);
    lines.push('');
    for (const r of items) {
      if (r.drifts.length === 0 && !r.error) continue;
      lines.push(`### ${r.route} → ${r.status}`);
      if (r.error) {
        lines.push(`- error: ${r.error}`);
      }
      for (const d of r.drifts) {
        const path = d.path.length > 0 ? d.path.join('.') : '<root>';
        switch (d.kind) {
          case 'extra-field':
            lines.push(
              `- extra field: \`${path}\` (runtime returned a key not declared in schema)`,
            );
            break;
          case 'missing-field':
            lines.push(
              `- missing field: \`${path}\` (schema requires ${d.expected}, runtime omitted)`,
            );
            break;
          case 'should-be-nullable':
            lines.push(
              `- should be nullable: \`${path}\` (runtime returned null, schema requires non-null)`,
            );
            break;
          case 'should-be-optional':
            lines.push(`- should be optional: \`${path}\``);
            break;
          case 'type-mismatch':
            lines.push(`- type mismatch: \`${path}\` (schema=${d.expected}, runtime=${d.actual})`);
            break;
        }
      }
      lines.push('');
    }
  }

  if (totalDrifts === 0) {
    lines.push('All probed endpoints match their declared response schemas.');
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const routes = await loadRoutes();
  const probable = routes.filter((r) => isProbable(r.route));
  const targets: ProbeTarget[] = probable.map(({ route }) => ({
    route,
    url: `${BASE_URL}/api${fillPathParams(route.path)}`,
  }));

  console.log(`Probing ${targets.length} GET endpoints against ${BASE_URL}...`);
  const token = await login();
  if (!token) {
    console.warn('Continuing without auth — JWT-protected routes will report 401.');
  }

  const reports: RouteDriftReport[] = [];
  for (const target of targets) {
    const report = await probeRoute(target, token);
    reports.push(report);
  }

  const md = formatReport(reports);
  writeFileSync(REPORT_PATH, md);
  console.log(`Report written to ${REPORT_PATH}`);
  const total = reports.reduce((sum, r) => sum + r.drifts.length, 0);
  console.log(`Total drifts: ${total}`);
}

main().catch((err) => {
  console.error('discover-response-drift failed', err);
  process.exit(1);
});
