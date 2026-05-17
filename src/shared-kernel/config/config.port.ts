import type { EnvConfig } from './config.schema';

/**
 * Framework-free environment / config reader. Wraps Nest's
 * ConfigService today; future Bun-only adapter reads `process.env`
 * directly. Adapters that need a string config value depend on this
 * port — never on `@nestjs/config`.
 *
 * `get` / `getOrDefault` return the RAW process.env string (or
 * `defaultValue`) without running it through the canonical
 * `EnvConfigSchema` — they predate the schema and the generic typing
 * (`<T>`) is a lie when `T` is anything other than `string`.
 *
 * `env` is the validated, typed surface — same data, but coerced /
 * defaulted / range-checked by `EnvConfigSchema` at boot. New
 * consumers should depend on `env` and NEVER on `get<number>` /
 * `get<boolean>` (which silently misread strings as the requested
 * type; P1 #41 was caused by exactly that pattern).
 */
export abstract class ConfigPort {
  /** Validated, typed configuration. Populated by `parseEnvConfig` at boot. */
  abstract readonly env: EnvConfig;
  /** Returns the raw `process.env` value if present; `undefined` otherwise. */
  abstract get<T = string>(key: string): T | undefined;
  /** Same as `get`, but returns `defaultValue` when the key is missing. */
  abstract getOrDefault<T = string>(key: string, defaultValue: T): T;
}
