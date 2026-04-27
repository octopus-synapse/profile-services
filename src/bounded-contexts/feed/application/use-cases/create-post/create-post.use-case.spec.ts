import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import type { PostType } from '@prisma/client';
import { InMemoryFeedRepository, InMemoryLinkPreviewFetcher } from '../../../testing';
import { HashtagParserService } from '../../services/hashtag-parser.service';
import { CreatePostUseCase } from './create-post.use-case';

const TEXT = 'TEXT' as PostType;
const REPOST = 'REPOST' as PostType;

function make() {
  const repo = new InMemoryFeedRepository();
  const link = new InMemoryLinkPreviewFetcher();
  const useCase = new CreatePostUseCase(repo, link, new HashtagParserService(), stubLogger);
  return { repo, link, useCase };
}

describe('CreatePostUseCase', () => {
  it('creates a post with parsed hashtags', async () => {
    const { repo, useCase } = make();
    const post = await useCase.execute('user-1', {
      type: TEXT,
      content: 'Hello #World #Tech',
    });
    expect(post.authorId).toBe('user-1');
    expect(post.content).toBe('Hello #World #Tech');
    const stored = repo.posts.get(post.id);
    expect(stored?.hashtags).toEqual(['#world', '#tech']);
  });

  it('fetches link preview when linkUrl is set', async () => {
    const { link, useCase } = make();
    link.set('https://example.com', {
      title: 'Example',
      description: null,
      image: null,
      domain: 'example.com',
    });
    const post = await useCase.execute('u1', {
      type: TEXT,
      content: 'check this',
      linkUrl: 'https://example.com',
    });
    expect((post as { linkPreview: unknown }).linkPreview).toMatchObject({ domain: 'example.com' });
  });

  it('increments repost count on REPOST', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'orig', authorId: 'a', isPublished: true, repostsCount: 0 });
    await useCase.execute('u1', {
      type: REPOST,
      content: 'cool',
      originalPostId: 'orig',
    });
    expect(repo.posts.get('orig')?.repostsCount).toBe(1);
  });

  it('marks scheduled posts as not published', async () => {
    const { useCase } = make();
    const future = new Date(Date.now() + 86400_000).toISOString();
    const post = await useCase.execute('u1', {
      type: TEXT,
      content: 'later',
      scheduledAt: future,
    });
    expect((post as { isPublished: boolean }).isPublished).toBe(false);
  });
});
