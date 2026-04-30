/**
 * Logger Port
 *
 * Framework-agnostic logging abstraction consumed by use cases and services
 * across all bounded contexts. The composition root binds it to the concrete
 * adapter (e.g. Winston via `AppLoggerService`).
 */

export abstract class LoggerPort {
  abstract log(message: string, context?: string, meta?: Record<string, unknown>): void;
  abstract debug(message: string, context?: string, meta?: Record<string, unknown>): void;
  abstract warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  abstract error(
    message: string,
    trace?: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
}
