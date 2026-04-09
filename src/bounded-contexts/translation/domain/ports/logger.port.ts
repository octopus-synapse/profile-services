/**
 * Logger Port
 *
 * Domain-level abstraction for logging.
 * Keeps the domain layer free from framework dependencies.
 */

export interface LoggerPort {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const LOGGER_PORT = Symbol('LoggerPort');
