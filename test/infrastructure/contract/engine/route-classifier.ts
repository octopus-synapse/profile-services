import { readFileSync } from 'node:fs';
import type { Persona } from './session-pool';

export type AuthKind = 'public' | 'jwt' | 'unknown';

export interface OperationMetadata {
  readonly auth: AuthKind;
  readonly permission: string | null;
  readonly guards: readonly string[];
}

export interface SwaggerInfo {
  readonly operationMetadata: ReadonlyMap<string, OperationMetadata>;
  readonly adminPermissions: ReadonlySet<string>;
}

export function loadSwaggerInfo(swaggerPath: string): SwaggerInfo {
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
      `Failed to load swagger metadata from ${swaggerPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  return { operationMetadata, adminPermissions };
}

export function toSwaggerPathTemplate(routePath: string): string {
  const withApi = routePath.startsWith('/api') ? routePath : `/api${routePath}`;
  return withApi.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}');
}

/**
 * Permissions that are "admin-only" by the swagger generator's classifier
 * (not in `ROLES.USER.groups`) but in reality belong to the dynamic
 * `recruiter` role granted via migration 20260514145936 + the dredd
 * fixtures seed. Routes gated by these permissions also do inline
 * ownership checks at the use-case layer, so the right persona is
 * `user` (the fixture user owns the resource AND has the recruiter
 * role) — using `admin` here hits the ownership rejection
 * (CANNOT_MODIFY_OTHERS_JOB) on the way back.
 *
 * Keep in sync with PERMISSION_GROUPS.RECRUITER in
 * `src/shared-kernel/authorization/permission-groups.config.ts`.
 */
const RECRUITER_PERMISSIONS: ReadonlySet<string> = new Set(['job:create']);

export function pickPersona(
  method: string,
  routePath: string,
  info: SwaggerInfo,
): { readonly persona: Persona; readonly meta: OperationMetadata | null } {
  const key = `${method.toUpperCase()} ${toSwaggerPathTemplate(routePath)}`;
  const meta = info.operationMetadata.get(key) ?? null;
  if (!meta) return { persona: 'admin', meta: null };
  if (meta.auth === 'public') return { persona: 'anonymous', meta };
  // Ownership-guard routes always probe as `user` — the fixture user
  // owns every ownership-checked fixture (job, resume, post).
  if (meta.guards?.includes('ownership')) {
    return { persona: 'user', meta };
  }
  // Recruiter-domain routes (job:create) also probe as `user` — the
  // dredd fixture user has the recruiter role from the seed AND owns
  // the fixture job, so it passes both the permission stage and the
  // inline ownership check inside the use case. The swagger
  // generator's `computeAdminOnlyPermissions` mislabels these as
  // admin-only because the static USER role definition doesn't
  // include recruiter groups (those are added dynamically per-user
  // via UserRoleAssignment).
  if (meta.permission && RECRUITER_PERMISSIONS.has(meta.permission)) {
    return { persona: 'user', meta };
  }
  if (meta.permission && info.adminPermissions.has(meta.permission)) {
    return { persona: 'admin', meta };
  }
  return { persona: 'user', meta };
}

export function bcOf(routePath: string): string {
  const match = /^\/v\d+\/([a-z0-9-]+)/i.exec(routePath);
  return match?.[1] ?? 'misc';
}
