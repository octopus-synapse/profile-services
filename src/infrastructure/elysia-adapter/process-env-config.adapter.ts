/**
 * `ConfigPort` impl that reads from `process.env` directly. Drop-in
 * replacement for the Nest `ConfigService`-backed adapter when running
 * the Elysia/Bun bootstrap.
 */

import { ConfigPort } from '@/shared-kernel/config/config.port';

export class ProcessEnvConfigAdapter extends ConfigPort {
  get<T = string>(key: string): T | undefined {
    const v = process.env[key];
    return v as T | undefined;
  }

  getOrDefault<T = string>(key: string, defaultValue: T): T {
    const v = process.env[key];
    return (v as T | undefined) ?? defaultValue;
  }
}
