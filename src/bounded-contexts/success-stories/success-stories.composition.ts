/**
 * Pure-TS wiring for the success-stories BC. Zero `@nestjs/*` imports.
 * The Nest module exposes the bundle as a single provider.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { SuccessStoriesUseCases } from './application/ports/success-stories.port';
import { CreateSuccessStoryUseCase } from './application/use-cases/create-success-story/create-success-story.use-case';
import { DeleteSuccessStoryUseCase } from './application/use-cases/delete-success-story/delete-success-story.use-case';
import { ListPublishedSuccessStoriesUseCase } from './application/use-cases/list-published-success-stories/list-published-success-stories.use-case';
import { UpdateSuccessStoryUseCase } from './application/use-cases/update-success-story/update-success-story.use-case';
import { PrismaSuccessStoriesRepository } from './infrastructure/adapters/persistence/prisma-success-stories.repository';

export { SuccessStoriesUseCases };

export function buildSuccessStoriesUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): SuccessStoriesUseCases {
  const repository = new PrismaSuccessStoriesRepository(prisma, logger);

  return {
    listPublished: new ListPublishedSuccessStoriesUseCase(repository),
    create: new CreateSuccessStoryUseCase(repository, logger),
    update: new UpdateSuccessStoryUseCase(repository),
    delete: new DeleteSuccessStoryUseCase(repository),
  };
}
