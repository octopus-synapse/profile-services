/**
 * Translation Module
 * Provides text translation services using Opus-MT
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';
import {
  TranslationCoreService,
  TranslationBatchService,
  ResumeTranslationService,
} from './services';

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
