/**
 * In-memory `ReportRepositoryPort` for use-case specs.
 */

import { randomUUID } from 'node:crypto';
import type { Post, PostReport, PostType } from '../domain/entities';
import { ReportRepositoryPort } from '../domain/ports/report.repository.port';

function makePost(id: string, isDeleted = false): Post {
  const now = new Date();
  return {
    id,
    authorId: 'someone',
    type: 'TEXT' as PostType,
    subtype: null,
    content: null,
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
    pollDeadline: null,
    votesCount: 0,
    codeSnippet: null,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    bookmarksCount: 0,
    isDeleted,
    deletedAt: null,
    isAnonymous: false,
    anonymousCategory: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class InMemoryReportRepository extends ReportRepositoryPort {
  readonly posts = new Map<string, Post>();
  readonly reports: PostReport[] = [];

  seedPost(id: string, isDeleted = false): void {
    this.posts.set(id, makePost(id, isDeleted));
  }

  async findPostById(id: string): Promise<Post | null> {
    return this.posts.get(id) ?? null;
  }

  async findReport(postId: string, userId: string): Promise<PostReport | null> {
    return this.reports.find((r) => r.postId === postId && r.userId === userId) ?? null;
  }

  async createReport(postId: string, userId: string, reason: string): Promise<PostReport> {
    const r: PostReport = {
      id: randomUUID(),
      postId,
      userId,
      reason,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.reports.push(r);
    return r;
  }

  async listReportsByPost(postId: string): Promise<PostReport[]> {
    return this.reports
      .filter((r) => r.postId === postId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
