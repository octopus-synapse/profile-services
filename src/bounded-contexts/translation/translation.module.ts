/**
 * Translation Module
 * Provides text translation services using Opus-MT
 */

import { Module } from '@nestjs/common';
import {
  ResumeTranslationService,
  TranslationBatchService,
  TranslationCoreService,
  TranslationService,
} from './application/services';
import { TranslationController } from './infrastructure/controllers';

@Module({
  imports: [],
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
