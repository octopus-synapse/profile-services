/**
 * Success Stories Module
 *
 * Thin Nest shell over `buildSuccessStoriesUseCases`. All wiring lives
 * in `success-stories.composition.ts`.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { SuccessStoriesUseCases } from './application/ports/success-stories.port';
import { SuccessStoryController } from './infrastructure/controllers/success-story.controller';
import { buildSuccessStoriesUseCases } from './success-stories.composition';

@Module({
  imports: [PrismaModule],
  controllers: [SuccessStoryController],
  providers: [
    {
      provide: SuccessStoriesUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildSuccessStoriesUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [SuccessStoriesUseCases],
})
export class SuccessStoriesModule {}
