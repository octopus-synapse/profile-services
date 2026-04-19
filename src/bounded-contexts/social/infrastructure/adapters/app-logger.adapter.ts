import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { SocialLoggerPort } from '../../application/ports/social-logger.port';

@Injectable()
export class AppLoggerSocialAdapter extends SocialLoggerPort {
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
