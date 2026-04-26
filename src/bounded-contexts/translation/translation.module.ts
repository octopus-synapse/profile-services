/**
 * Translation Module — Composition Root
 *
 * The translation services are framework-free POJOs. This module is the
 * single Nest-aware seam: it reads config, constructs each service, and
 * wires them together via `useFactory`.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerPort } from '@/shared-kernel';
import {
  ResumeTranslationService,
  TranslationBatchService,
  TranslationCoreService,
  TranslationService,
} from './application/services';
import { TranslationController } from './infrastructure/controllers';

@Module({
  imports: [ConfigModule],
  controllers: [TranslationController],
  providers: [
    {
      provide: TranslationCoreService,
      useFactory: async (config: ConfigService, logger: LoggerPort) => {
        const url = config.get<string>('LIBRETRANSLATE_URL') ?? 'http://libretranslate:5000';
        const service = new TranslationCoreService(url, logger);
        await service.checkServiceHealth();
        return service;
      },
      inject: [ConfigService, LoggerPort],
    },
    {
      provide: TranslationBatchService,
      useFactory: (core: TranslationCoreService) => new TranslationBatchService(core),
      inject: [TranslationCoreService],
    },
    {
      provide: ResumeTranslationService,
      useFactory: (core: TranslationCoreService) => new ResumeTranslationService(core),
      inject: [TranslationCoreService],
    },
    {
      provide: TranslationService,
      useFactory: (
        core: TranslationCoreService,
        batch: TranslationBatchService,
        resume: ResumeTranslationService,
      ) => new TranslationService(core, batch, resume),
      inject: [TranslationCoreService, TranslationBatchService, ResumeTranslationService],
    },
  ],
  exports: [TranslationService],
})
export class TranslationModule {}
