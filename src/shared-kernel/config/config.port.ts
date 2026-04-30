/**
 * Framework-free environment / config reader. Wraps Nest's
 * ConfigService today; future Bun-only adapter reads `process.env`
 * directly. Adapters that need a string config value depend on this
 * port — never on `@nestjs/config`.
 */
export abstract class ConfigPort {
  /** Returns the value typed as `T` if present; `undefined` otherwise. */
  abstract get<T = string>(key: string): T | undefined;
  /** Same as `get`, but returns `defaultValue` when the key is missing. */
  abstract getOrDefault<T = string>(key: string, defaultValue: T): T;
}
