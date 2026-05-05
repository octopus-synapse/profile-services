/**
 * `ConfigPort` impl that reads from `process.env`, but validated up
 * front against `EnvConfigSchema` (P0-001). Boot fail-fast: any
 * required var that is missing or fails its Zod constraint causes the
 * constructor to throw `ConfigValidationError` listing every issue.
 *
 * The runtime API stays compatible with the old adapter: callers still
 * use `get` / `getOrDefault` against string keys. The schema layer
 * exists for boot-time validation; per-call typing on the existing
 * port is left untouched to keep the migration scope sane (a future
 * refactor can flip callers to consume `EnvConfig` directly).
 */

import { ConfigPort } from '@/shared-kernel/config/config.port';
import { type EnvConfig, parseEnvConfig } from '@/shared-kernel/config/config.schema';

export class ProcessEnvConfigAdapter extends ConfigPort {
  /** Validated, typed configuration (post-schema). Available for callers
   *  that want the typed surface instead of string-keyed `get`. */
  readonly env: EnvConfig;

  constructor(raw: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
    super();
    this.env = parseEnvConfig(raw);
  }

  get<T = string>(key: string): T | undefined {
    const v = process.env[key];
    return v as T | undefined;
  }

  getOrDefault<T = string>(key: string, defaultValue: T): T {
    const v = process.env[key];
    return (v as T | undefined) ?? defaultValue;
  }
}
