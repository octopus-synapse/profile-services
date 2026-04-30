/**
 * Bundle token for the success-stories BC. Doubles as the TypeScript
 * shape and the Nest DI token. Wiring lives in
 * `success-stories.composition.ts` — Nest-free.
 */

import type { CreateSuccessStoryUseCase } from '../use-cases/create-success-story/create-success-story.use-case';
import type { DeleteSuccessStoryUseCase } from '../use-cases/delete-success-story/delete-success-story.use-case';
import type { ListPublishedSuccessStoriesUseCase } from '../use-cases/list-published-success-stories/list-published-success-stories.use-case';
import type { UpdateSuccessStoryUseCase } from '../use-cases/update-success-story/update-success-story.use-case';

export abstract class SuccessStoriesUseCases {
  abstract readonly listPublished: ListPublishedSuccessStoriesUseCase;
  abstract readonly create: CreateSuccessStoryUseCase;
  abstract readonly update: UpdateSuccessStoryUseCase;
  abstract readonly delete: DeleteSuccessStoryUseCase;
}
