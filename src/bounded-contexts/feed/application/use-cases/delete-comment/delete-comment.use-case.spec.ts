import { describe, expect, it } from 'bun:test';
import { runInParallel } from '@test/infrastructure/shared/race-condition.helper';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotDeleteOthersCommentException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryCommentRepository } from '../../../testing';
import { CreateCommentUseCase } from '../create-comment/create-comment.use-case';
import { DeleteCommentUseCase } from './delete-comment.use-case';

const PARALLEL_DELETE_ATTEMPTS = 10;

describe('DeleteCommentUseCase', () => {
  it('soft deletes when caller is author', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    const c = await new CreateCommentUseCase(repo).execute('p1', 'me', 'hi');
    await new DeleteCommentUseCase(repo).execute(c.id, 'me');
    expect(repo.findRaw(c.id)?.isDeleted).toBe(true);
    expect(repo.commentsCountFor('p1')).toBe(0);
  });

  it('throws Forbidden for non-authors', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    const c = await new CreateCommentUseCase(repo).execute('p1', 'me', 'hi');
    await expect(new DeleteCommentUseCase(repo).execute(c.id, 'other')).rejects.toThrow(
      CannotDeleteOthersCommentException,
    );
  });

  it('throws NotFound for missing comment', async () => {
    const repo = new InMemoryCommentRepository();
    await expect(new DeleteCommentUseCase(repo).execute('missing', 'me')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('is idempotent under concurrent delete: commentsCount decrements at most once', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    const c = await new CreateCommentUseCase(repo).execute('p1', 'me', 'hi');
    const useCase = new DeleteCommentUseCase(repo);

    const { successes, failures } = await runInParallel(PARALLEL_DELETE_ATTEMPTS, () =>
      useCase.execute(c.id, 'me'),
    );

    expect(successes).toHaveLength(PARALLEL_DELETE_ATTEMPTS);
    expect(failures).toHaveLength(0);
    expect(repo.findRaw(c.id)?.isDeleted).toBe(true);
    expect(repo.commentsCountFor('p1')).toBe(0);
  });

  it('returns silently when called again on an already-deleted comment', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    const c = await new CreateCommentUseCase(repo).execute('p1', 'me', 'hi');
    const useCase = new DeleteCommentUseCase(repo);

    await useCase.execute(c.id, 'me');
    await useCase.execute(c.id, 'me');

    expect(repo.commentsCountFor('p1')).toBe(0);
  });
});
