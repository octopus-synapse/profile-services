/**
 * In-memory `PollRepositoryPort` for use-case specs.
 */

import { randomUUID } from 'node:crypto';
import type { PollResultBucket, PollVote, Post, PostType } from '../domain/entities';
import { PollRepositoryPort } from '../domain/ports/poll.repository.port';

function makePost(partial: Partial<Post> & { id: string }): Post {
  const now = new Date();
  return {
    id: partial.id,
    authorId: partial.authorId ?? 'someone',
    type: (partial.type ?? 'POLL') as PostType,
    subtype: partial.subtype ?? null,
    content: partial.content ?? null,
    hardSkills: [],
    softSkills: [],
    hashtags: [],
    data: null,
    imageUrl: null,
    linkUrl: null,
    linkPreview: null,
    originalPostId: null,
    coAuthors: [],
    scheduledAt: null,
    isPublished: true,
    threadId: null,
    pollDeadline: partial.pollDeadline ?? null,
    votesCount: partial.votesCount ?? 0,
    codeSnippet: null,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    bookmarksCount: 0,
    isDeleted: partial.isDeleted ?? false,
    deletedAt: null,
    isAnonymous: false,
    anonymousCategory: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class InMemoryPollRepository extends PollRepositoryPort {
  readonly posts = new Map<string, Post>();
  readonly votes: PollVote[] = [];

  seedPost(partial: Partial<Post> & { id: string }): Post {
    const p = makePost(partial);
    this.posts.set(p.id, p);
    return p;
  }

  seedVote(postId: string, userId: string, optionIndex: number): PollVote {
    const v: PollVote = { id: randomUUID(), postId, userId, optionIndex, createdAt: new Date() };
    this.votes.push(v);
    return v;
  }

  findRawPost(id: string): Post | null {
    return this.posts.get(id) ?? null;
  }

  async findPostById(id: string): Promise<Post | null> {
    return this.posts.get(id) ?? null;
  }

  async findVote(postId: string, userId: string): Promise<PollVote | null> {
    return this.votes.find((v) => v.postId === postId && v.userId === userId) ?? null;
  }

  async createVote(postId: string, userId: string, optionIndex: number): Promise<PollVote> {
    return this.seedVote(postId, userId, optionIndex);
  }

  async incrementVotesCount(postId: string, by: number): Promise<void> {
    const p = this.posts.get(postId);
    if (p) this.posts.set(postId, { ...p, votesCount: p.votesCount + by });
  }

  async groupVotesByOption(postId: string): Promise<PollResultBucket[]> {
    const counts = new Map<number, number>();
    for (const v of this.votes) {
      if (v.postId === postId) counts.set(v.optionIndex, (counts.get(v.optionIndex) ?? 0) + 1);
    }
    return [...counts.entries()].map(([optionIndex, count]) => ({ optionIndex, count }));
  }
}
