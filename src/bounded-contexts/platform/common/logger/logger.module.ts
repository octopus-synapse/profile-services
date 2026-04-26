import { Global, Module } from '@nestjs/common';
import { LoggerPort } from '@/shared-kernel/logger';
import { AppLoggerAdapter } from './app-logger.adapter';
import { AppLoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    AppLoggerService,
    AppLoggerAdapter,
    { provide: LoggerPort, useExisting: AppLoggerAdapter },
  ],
  exports: [AppLoggerService, LoggerPort],
})
export class LoggerModule {}
