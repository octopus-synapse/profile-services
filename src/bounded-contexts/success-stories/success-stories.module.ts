/**
 * Success Stories Module
 *
 * ADR-001: 4 POJO use cases (list-published, create, update, delete)
 * sit on top of `SuccessStoriesRepositoryPort`. The Prisma adapter
 * owns the carousel ordering rule + the `take <= 50` cap so the public
 * endpoint stays cheap; the use cases stay framework-free.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { CreateSuccessStoryUseCase } from './application/use-cases/create-success-story/create-success-story.use-case';
import { DeleteSuccessStoryUseCase } from './application/use-cases/delete-success-story/delete-success-story.use-case';
import { ListPublishedSuccessStoriesUseCase } from './application/use-cases/list-published-success-stories/list-published-success-stories.use-case';
import { UpdateSuccessStoryUseCase } from './application/use-cases/update-success-story/update-success-story.use-case';
import { SuccessStoriesRepositoryPort } from './domain/ports/success-stories.repository.port';
import { PrismaSuccessStoriesRepository } from './infrastructure/adapters/persistence/prisma-success-stories.repository';
import { SuccessStoryController } from './infrastructure/controllers/success-story.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SuccessStoryController],
  providers: [
    {
      provide: SuccessStoriesRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaSuccessStoriesRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: ListPublishedSuccessStoriesUseCase,
      useFactory: (repo: SuccessStoriesRepositoryPort) =>
        new ListPublishedSuccessStoriesUseCase(repo),
      inject: [SuccessStoriesRepositoryPort],
    },
    {
      provide: CreateSuccessStoryUseCase,
      useFactory: (repo: SuccessStoriesRepositoryPort, logger: LoggerPort) =>
        new CreateSuccessStoryUseCase(repo, logger),
      inject: [SuccessStoriesRepositoryPort, LoggerPort],
    },
    {
      provide: UpdateSuccessStoryUseCase,
      useFactory: (repo: SuccessStoriesRepositoryPort) => new UpdateSuccessStoryUseCase(repo),
      inject: [SuccessStoriesRepositoryPort],
    },
    {
      provide: DeleteSuccessStoryUseCase,
      useFactory: (repo: SuccessStoriesRepositoryPort) => new DeleteSuccessStoryUseCase(repo),
      inject: [SuccessStoriesRepositoryPort],
    },
  ],
  exports: [
    ListPublishedSuccessStoriesUseCase,
    CreateSuccessStoryUseCase,
    UpdateSuccessStoryUseCase,
    DeleteSuccessStoryUseCase,
  ],
})
export class SuccessStoriesModule {}
