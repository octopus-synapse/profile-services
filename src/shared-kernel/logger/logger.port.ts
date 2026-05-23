/**
 * Logger Port
 *
 * Framework-agnostic logging abstraction consumed by use cases and services
 * across all bounded contexts. The composition root binds it to the concrete
 * adapter (e.g. Winston via `AppLoggerService`).
 *
 * `error()` uses the object form per Q21 in the duplication audit:
 *   logger.error('msg', { context: 'Ctx', stack, ...meta });
 */

export interface LogErrorOptions {
  /** Stack trace string. */
  readonly stack?: string;
  /** Logical context tag (typically the class name). */
  readonly context?: string;
  /** Free-form structured metadata. */
  readonly [key: string]: unknown;
}

export abstract class LoggerPort {
  abstract log(message: string, context?: string, meta?: Record<string, unknown>): void;
  abstract debug(message: string, context?: string, meta?: Record<string, unknown>): void;
  abstract warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  abstract error(message: string, options?: LogErrorOptions): void;
}
