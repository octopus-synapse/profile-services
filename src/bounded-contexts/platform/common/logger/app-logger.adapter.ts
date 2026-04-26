import { Injectable } from '@nestjs/common';
import { LoggerPort } from '@/shared-kernel/logger';
import { AppLoggerService } from './logger.service';

/**
 * Concrete adapter binding the framework-agnostic `LoggerPort` to the
 * Winston-backed `AppLoggerService`. Lives in infrastructure (`platform/`),
 * registered globally by `LoggerModule`.
 */
@Injectable()
export class AppLoggerAdapter extends LoggerPort {
  constructor(private readonly logger: AppLoggerService) {
    super();
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.log(message, context, meta);
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, context, meta);
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, context, meta);
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, trace, context, meta);
  }
}
