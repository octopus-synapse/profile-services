/**
 * Translation Module
 * Provides text translation services using Opus-MT
 */

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import {
  ResumeTranslationService,
  TranslationBatchService,
  TranslationCoreService,
  TranslationService,
} from './application/services';
import { TranslationController } from './infrastructure/controllers';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TranslationController],
  providers: [
    TranslationCoreService,
    TranslationBatchService,
    ResumeTranslationService,
    TranslationService,
  ],
  exports: [TranslationService],
})
export class TranslationModule {}
