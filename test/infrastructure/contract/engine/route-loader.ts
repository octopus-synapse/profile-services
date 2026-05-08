import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Route } from '@/shared-kernel/http/route';

export interface CollectedRoute {
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

export async function loadRoutes(srcDir: string): Promise<CollectedRoute[]> {
  const out: CollectedRoute[] = [];
  for (const file of walkRoutesFiles(srcDir)) {
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

export function isHappyPathProbable(route: Route): boolean {
  if (route.method !== 'GET') return false;
  if (route.kind === 'sse' || route.kind === 'stream') return false;
  if (!route.response) return false;
  return true;
}

export function isMutationProbable(route: Route): boolean {
  if (route.method !== 'POST' && route.method !== 'PUT' && route.method !== 'PATCH') return false;
  if (route.kind === 'multipart') return false;
  if (!route.body) return false;
  return true;
}

export function isAuthProbable(route: Route): boolean {
  return route.auth.kind === 'jwt';
}

export function isForbiddenProbable(route: Route): boolean {
  return route.auth.kind === 'jwt' && route.permission !== undefined;
}
