/**
 * Social Logger Port
 *
 * Narrow logging abstraction consumed by social services.
 */

export const SOCIAL_LOGGER_PORT = Symbol('SOCIAL_LOGGER_PORT');

export abstract class SocialLoggerPort {
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
