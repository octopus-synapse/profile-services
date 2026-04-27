import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import {
  PostAlreadyRepostedException,
  PostNotFoundException,
} from '../../../domain/exceptions/feed.exceptions';
import { InMemoryEngagementNotifier, InMemoryEngagementRepository } from '../../../testing';
import { HashtagParserService } from '../../services/hashtag-parser.service';
import { RepostPostUseCase } from './repost-post.use-case';

function make() {
  const repo = new InMemoryEngagementRepository();
  const notifier = new InMemoryEngagementNotifier();
  return {
    repo,
    notifier,
    useCase: new RepostPostUseCase(repo, notifier, new HashtagParserService(), stubLogger),
  };
}

describe('RepostPostUseCase', () => {
  it('creates a repost with commentary and notifies', async () => {
    const { repo, notifier, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'author' });
    const out = (await useCase.execute('p1', 'me', 'wow #cool')) as { id: string };
    expect(out.id).toBeTruthy();
    expect(repo.findRawPost('p1')?.repostsCount).toBe(1);
    expect(notifier.events[0]?.type).toBe('POST_REPOSTED');
  });

  it('handles bare repost without commentary', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'author' });
    const out = (await useCase.execute('p1', 'me')) as { reposted: boolean };
    expect(out.reposted).toBe(true);
    expect(repo.findRawPost('p1')?.repostsCount).toBe(1);
  });

  it('throws when post not found', async () => {
    const { useCase } = make();
    await expect(useCase.execute('missing', 'me')).rejects.toThrow(PostNotFoundException);
  });

  it('throws when already reposted', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    repo.seedRepost('p1', 'me');
    await expect(useCase.execute('p1', 'me')).rejects.toThrow(PostAlreadyRepostedException);
  });
});
