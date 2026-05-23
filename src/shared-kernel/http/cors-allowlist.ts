/**
 * CORS allowlist builder (P1 #11).
 *
 * The previous behaviour in `elysia-bootstrap.ts` was:
 *   `corsOriginConfig = allowedOrigins.length > 0 ? allowedOrigins : !isProduction`
 * which collapses to `origin: true` in development. `@elysiajs/cors`
 * mirrors any `Origin` header back when `origin: true`, and the CORS
 * config also sets `credentials: true` — so a malicious site that the
 * dev was already authenticated against could read responses from the
 * local backend cross-site.
 *
 * `buildCorsAllowlist` always returns an EXPLICIT array — never
 * reflects the caller's origin. Dev gets a safe default list
 * (localhost on the typical FE ports) which can be overridden by env;
 * staging/production REQUIRE the env to be set or this function
 * throws (boot fail-fast).
 *
 * Env keys consumed (read via `ConfigPort.env`):
 *   - `CORS_ORIGIN` — comma-separated allowlist (existing key).
 *   - `CORS_ALLOWED_ORIGINS` — alias; overrides defaults in dev when
 *     the operator wants to extend the list.
 *   - `APP_URL` / `PUBLIC_APP_URL` — always added when present (so
 *     adding a new env doesn't break a deploy that already configured
 *     the canonical FE URL).
 */

import type { ConfigPort } from '../config';

/** Built-in development origins. Match the FE local ports we use today
 *  (Next.js dev server on 3000, Vite/Storybook on 5173). */
export const DEFAULT_DEV_CORS_ALLOWLIST: readonly string[] = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * V2 D43: default Expo origins added to the CORS allowlist when
 * `NODE_ENV !== production`. They're kept dev-only so we don't ship a
 * permissive CORS surface to production; operators that need a custom
 * Expo preview origin in prod must list it explicitly in `CORS_ORIGIN`.
 *
 * Origins included:
 *  - `http://localhost:8081` — Expo Metro web bundler
 *  - `http://localhost:19000` — Expo dev tools
 *  - `http://localhost:19006` — Expo web
 *  - `https://*.expo.dev` — Expo preview / EAS submit URLs (wildcard
 *    compiled to RegExp at CORS-plugin install time)
 *
 * Native deep-link schemes (`patchcareers://`, `exp://`) are NOT in
 * this list because native fetch on iOS/Android does NOT send an
 * Origin header — they go straight through CORS as same-origin and
 * are only constrained by the OAuth redirect-uri allowlist.
 */
export const EXPO_DEV_ORIGINS: readonly string[] = [
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  'https://*.expo.dev',
];

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function uniq(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

export class CorsAllowlistMissingError extends Error {
  constructor() {
    super(
      'CORS allowlist is empty in a non-dev environment. Set CORS_ORIGIN ' +
        '(or CORS_ALLOWED_ORIGINS / APP_URL / PUBLIC_APP_URL) before booting.',
    );
    this.name = 'CorsAllowlistMissingError';
  }
}

export function buildCorsAllowlist(config: ConfigPort): string[] {
  const env = config.env;
  const explicit = [...splitCsv(env.CORS_ORIGIN), ...splitCsv(env.CORS_ALLOWED_ORIGINS)];
  // APP_URL / PUBLIC_APP_URL are first-class FE origins — always
  // include them so a deploy that already configured one of them
  // doesn't need a separate CORS_ORIGIN entry.
  for (const candidate of [env.APP_URL, env.PUBLIC_APP_URL]) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      explicit.push(candidate);
    }
  }

  const isNonProd = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  // V2 D43: outside production, auto-include the Expo dev defaults so
  // the RN/Expo app can hit the API without operator-side env tweaks.
  // Production stays operator-controlled (CORS_ORIGIN only).
  const expoDefaults = isNonProd ? EXPO_DEV_ORIGINS : [];

  const merged = uniq([...explicit, ...expoDefaults]);
  if (merged.length > 0) return merged;

  // No explicit list — only safe to fall back to dev defaults.
  if (!isNonProd) {
    throw new CorsAllowlistMissingError();
  }
  return [...DEFAULT_DEV_CORS_ALLOWLIST];
}
