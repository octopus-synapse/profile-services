#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ZodSchema } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { analyzeDrift, type Drift } from '../test/static-analysis/shared/response-drift-analyzer';

const SRC_DIR = resolve(__dirname, '../src');
const REPORT_PATH = resolve(__dirname, '../docs/audits/response-drift-report.md');
const SWAGGER_PATH = resolve(__dirname, '../swagger.json');

const BASE_URL = process.env.DRIFT_BASE_URL ?? 'http://localhost:3010';
const ADMIN_EMAIL =
  process.env.DRIFT_ADMIN_EMAIL ?? process.env.DREDD_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD =
  process.env.DRIFT_ADMIN_PASSWORD ?? process.env.DREDD_ADMIN_PASSWORD ?? 'Admin123!@#';
const USER_EMAIL =
  process.env.DRIFT_USER_EMAIL ?? process.env.DREDD_USER_EMAIL ?? 'dredd-fixture@profile.local';
const USER_PASSWORD =
  process.env.DRIFT_USER_PASSWORD ??
  process.env.DREDD_USER_PASSWORD ??
  'Dredd_Fixture_Password_123!';

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

type AuthKind = 'public' | 'jwt' | 'unknown';

interface OperationMetadata {
  readonly auth: AuthKind;
  readonly permission: string | null;
  readonly guards: readonly string[];
}

interface SwaggerInfo {
  readonly operationMetadata: ReadonlyMap<string, OperationMetadata>;
  readonly adminPermissions: ReadonlySet<string>;
}

export function loadSwaggerInfo(swaggerPath: string = SWAGGER_PATH): SwaggerInfo {
  const operationMetadata = new Map<string, OperationMetadata>();
  const adminPermissions = new Set<string>();
  try {
    const swagger = JSON.parse(readFileSync(swaggerPath, 'utf8')) as {
      info?: { 'x-admin-permissions'?: readonly string[] };
      paths?: Record<string, Record<string, unknown>>;
    };
    for (const p of swagger.info?.['x-admin-permissions'] ?? []) adminPermissions.add(p);
    for (const [pathTemplate, ops] of Object.entries(swagger.paths ?? {})) {
      for (const [method, op] of Object.entries(ops ?? {})) {
        if (typeof op !== 'object' || op === null) continue;
        const opObj = op as {
          'x-auth'?: string;
          'x-permission'?: string;
          'x-guards'?: readonly string[];
        };
        const auth: AuthKind = opObj['x-auth'] === 'public' ? 'public' : 'jwt';
        operationMetadata.set(`${method.toUpperCase()} ${pathTemplate}`, {
          auth,
          permission: opObj['x-permission'] ?? null,
          guards: opObj['x-guards'] ?? [],
        });
      }
    }
  } catch (err) {
    console.warn(
      `Failed to load swagger metadata from ${swaggerPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return { operationMetadata, adminPermissions };
}

export function toSwaggerPathTemplate(routePath: string): string {
  // Routes use `:foo`; swagger uses `/api/{foo}`. Both prefixes are normalised here.
  const withApi = routePath.startsWith('/api') ? routePath : `/api${routePath}`;
  return withApi.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}');
}

export type Persona = 'admin' | 'user' | 'anonymous';

export function pickPersona(
  method: string,
  routePath: string,
  info: SwaggerInfo,
): { readonly persona: Persona; readonly meta: OperationMetadata | null } {
  const key = `${method.toUpperCase()} ${toSwaggerPathTemplate(routePath)}`;
  const meta = info.operationMetadata.get(key) ?? null;
  if (!meta) {
    // Unknown to swagger — default to admin so we maximise coverage; the
    // 401/403 surfacing path still flags genuine mismatches.
    return { persona: 'admin', meta: null };
  }
  if (meta.auth === 'public') return { persona: 'anonymous', meta };
  if (meta.permission && info.adminPermissions.has(meta.permission)) {
    return { persona: 'admin', meta };
  }
  return { persona: 'user', meta };
}

interface ProbeTarget {
  readonly route: Route;
  readonly url: string;
  readonly persona: Persona;
  readonly meta: OperationMetadata | null;
}

// Mirrors `test/infrastructure/contract/dredd-hooks.js` so both probes
// resolve to the same materialised rows in `prisma/seeds/dredd-fixtures.seed.ts`.
const FIXTURE_USER_ID = '01900000-0000-7000-a000-000000000020';
const FIXTURE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
const FIXTURE_JOB_ID = '01900000-0000-7000-a000-000000000030';
const FIXTURE_POST_ID = '01900000-0000-7000-a000-000000000040';
const FIXTURE_CONVERSATION_ID = '01900000-0000-7000-a000-000000000050';
const FIXTURE_NOTIFICATION_ID = '01900000-0000-7000-a000-000000000060';
const FIXTURE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';
const FIXTURE_SLUG = 'fixture-slug';

export function fillPathParams(path: string): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    if (name === 'userId') return FIXTURE_USER_ID;
    if (name === 'resumeId') return FIXTURE_RESUME_ID;
    if (name === 'jobId') return FIXTURE_JOB_ID;
    if (name === 'postId') return FIXTURE_POST_ID;
    if (name === 'conversationId') return FIXTURE_CONVERSATION_ID;
    if (name === 'notificationId') return FIXTURE_NOTIFICATION_ID;
    if (name.endsWith('Id') || name === 'id') return FIXTURE_GENERIC_ID;
    return FIXTURE_SLUG;
  });
}

export function isProbable(route: Route): boolean {
  if (route.method !== 'GET') return false;
  if (route.kind === 'sse' || route.kind === 'stream' || route.kind === 'redirect') return false;
  if (route.binary) return false;
  if (!route.response) return false;
  return true;
}

export type AuthMismatchDrift = {
  readonly kind: 'auth-mismatch';
  readonly path: readonly string[];
  readonly persona: Persona;
  readonly status: number;
};

export type ReportDrift = Drift | AuthMismatchDrift;

interface RouteDriftReport {
  readonly route: string;
  readonly status: number;
  readonly persona: Persona;
  readonly drifts: readonly ReportDrift[];
  readonly error?: string;
}

async function login(email: string, password: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      console.warn(`Login failed for ${email}: ${res.status}`);
      return undefined;
    }
    const setCookie = res.headers.get('set-cookie') ?? '';
    const match = /access_token=([^;]+)/.exec(setCookie);
    return match?.[1];
  } catch (err) {
    console.warn(`Login error for ${email}: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

interface PersonaTokens {
  readonly admin?: string;
  readonly user?: string;
}

function tokenFor(persona: Persona, tokens: PersonaTokens): string | undefined {
  if (persona === 'anonymous') return undefined;
  if (persona === 'admin') return tokens.admin;
  return tokens.user;
}

async function probeRoute(target: ProbeTarget, tokens: PersonaTokens): Promise<RouteDriftReport> {
  const token = tokenFor(target.persona, tokens);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Cookie = `access_token=${token}`;
  let status = 0;
  let body: unknown;
  try {
    const res = await fetch(target.url, { method: 'GET', headers });
    status = res.status;
    const text = await res.text();
    if (!text) {
      return {
        route: `GET ${target.route.path}`,
        status,
        persona: target.persona,
        drifts: [],
      };
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

  // Auth mismatch: the persona we picked from swagger metadata still got a
  // 401/403. That means the spec's `x-permission` / `x-auth` no longer
  // matches what the route actually enforces — surface it as a drift
  // instead of skipping silently.
  if (status === 401 || status === 403) {
    return {
      route: `GET ${target.route.path}`,
      status,
      persona: target.persona,
      drifts: [{ kind: 'auth-mismatch', path: [], persona: target.persona, status }],
    };
  }

  if (status < 200 || status >= 300) {
    return {
      route: `GET ${target.route.path}`,
      status,
      persona: target.persona,
      drifts: [],
    };
  }
  const responseSchema = target.route.response as ZodSchema<unknown>;
  const drifts = analyzeDrift(responseSchema, body);
  return { route: `GET ${target.route.path}`, status, persona: target.persona, drifts };
}

export function bcOf(routePath: string): string {
  const match = /^\/v\d+\/([a-z0-9-]+)/i.exec(routePath);
  return match?.[1] ?? 'misc';
}

export type { RouteDriftReport };

export function formatReport(reports: readonly RouteDriftReport[]): string {
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
    const bcErrors = items.reduce((sum, r) => sum + (r.error ? 1 : 0), 0);
    if (bcDrifts === 0 && bcErrors === 0) continue;
    lines.push(`## ${bc} (${bcDrifts} drifts)`);
    lines.push('');
    for (const r of items) {
      if (r.drifts.length === 0 && !r.error) continue;
      lines.push(`### ${r.route} → ${r.status} (persona=${r.persona})`);
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
          case 'auth-mismatch':
            lines.push(
              `- auth mismatch: persona=\`${d.persona}\` got HTTP ${d.status} (swagger x-auth/x-permission disagrees with runtime guards)`,
            );
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

async function main(): Promise<number> {
  const routes = await loadRoutes();
  const probable = routes.filter((r) => isProbable(r.route));
  const swaggerInfo = loadSwaggerInfo();
  // Routes guarded by service-to-service tokens (e.g. `internal-auth`)
  // are not reachable by either the admin or regular fixture cookie;
  // probing them just spams 401 noise. Skipping is the right move —
  // the contract for those routes is exercised by the operator at
  // deploy time, not the test suite.
  const SKIP_GUARDS = new Set(['internal-auth']);
  const targets: ProbeTarget[] = probable.flatMap(({ route }) => {
    const { persona, meta } = pickPersona(route.method, route.path, swaggerInfo);
    if (meta?.guards?.some((g) => SKIP_GUARDS.has(g))) {
      return [];
    }
    return [
      {
        route,
        url: `${BASE_URL}/api${fillPathParams(route.path)}`,
        persona,
        meta,
      },
    ];
  });

  console.log(`Probing ${targets.length} GET endpoints against ${BASE_URL}...`);
  const [adminToken, userToken] = await Promise.all([
    login(ADMIN_EMAIL, ADMIN_PASSWORD),
    login(USER_EMAIL, USER_PASSWORD),
  ]);
  if (!adminToken) {
    console.warn('Admin login failed — admin-gated routes will report auth-mismatch drifts.');
  }
  if (!userToken) {
    console.warn('Regular user login failed — JWT routes will report auth-mismatch drifts.');
  }
  const tokens: PersonaTokens = { admin: adminToken, user: userToken };

  const reports: RouteDriftReport[] = [];
  for (const target of targets) {
    const report = await probeRoute(target, tokens);
    reports.push(report);
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
  // CI consumes the exit code as a gate. Set DRIFT_FAIL_ON=0 to opt out
  // (e.g. local "show me the drifts" runs that shouldn't fail the shell).
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
