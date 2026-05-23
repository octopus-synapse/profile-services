/**
 * Compute the WS-upgrade `Origin` allowlist as the union of three env
 * sources, normalized to canonical form (`scheme://host[:port]` — no
 * trailing slash, lowercase scheme/host).
 *
 *   1. `CORS_ORIGIN`        — comma-separated list (HTTP CORS allowlist)
 *   2. `APP_URL`            — single canonical app URL (preferred)
 *      `PUBLIC_APP_URL`     — fallback name used elsewhere in bootstrap
 *   3. `ALLOWED_WS_ORIGINS` — comma-separated explicit overrides for
 *                             scenarios HTTP CORS doesn't cover (mobile
 *                             scheme `capacitor://app`, dev tools,
 *                             desktop electron `app://...`)
 *
 * **Fail-closed**: when none of the three resolve to any origin the
 * returned set is empty and every WS upgrade is rejected — the bootstrap
 * surface logs a loud warning so misconfiguration is caught at boot.
 */

import type { ConfigPort } from '@/shared-kernel/config';

const SPLIT = /[,\s]+/;

function normalize(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed === '*') return '*';
  try {
    const u = new URL(trimmed);
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${u.hostname.toLowerCase()}${port}`;
  } catch {
    // Not a parseable URL — accept as-is for non-HTTP schemes (e.g.
    // `capacitor://app`, `chrome-extension://abc`). Lowercase the
    // scheme portion only.
    const idx = trimmed.indexOf('://');
    if (idx === -1) return trimmed;
    return `${trimmed.slice(0, idx).toLowerCase()}://${trimmed.slice(idx + 3)}`;
  }
}

function readList(config: ConfigPort, key: string): string[] {
  const raw = config.get<string>(key);
  if (!raw) return [];
  return raw
    .split(SPLIT)
    .map(normalize)
    .filter((v): v is string => v !== null && v !== '*');
}

export function buildAllowedWsOrigins(config: ConfigPort): ReadonlySet<string> {
  const origins = new Set<string>();
  for (const o of readList(config, 'CORS_ORIGIN')) origins.add(o);
  for (const key of ['APP_URL', 'PUBLIC_APP_URL']) {
    const single = config.get<string>(key);
    const norm = single ? normalize(single) : null;
    if (norm && norm !== '*') origins.add(norm);
  }
  for (const o of readList(config, 'ALLOWED_WS_ORIGINS')) origins.add(o);
  return origins;
}
