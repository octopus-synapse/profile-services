/**
 * `LoggerPort` impl backed by pino. Replaces the POC console logger.
 * Pretty-prints in dev (NODE_ENV != 'production'), structured JSON in
 * prod — matching the Nest `AppLoggerService` shape (context, stack,
 * meta) so log consumers don't notice the swap.
 */

import pino, { type Logger as PinoLogger } from 'pino';
import { LoggerPort } from '@/shared-kernel/logger/logger.port';

export class PinoLoggerAdapter extends LoggerPort {
  private readonly logger: PinoLogger;

  constructor() {
    super();
    const isProduction = process.env.NODE_ENV === 'production';
    const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');
    this.logger = pino({
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
      base: undefined,
    });
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.info({ context, ...meta }, message);
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.debug({ context, ...meta }, message);
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.warn({ context, ...meta }, message);
  }

  error(message: string, options: Record<string, unknown> = {}): void {
    const { context, ...rest } = options;
    this.logger.error({ context, ...rest }, message);
  }
}
