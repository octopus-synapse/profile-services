/**
 * Translation Module
 * Provides text translation services using Opus-MT
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
